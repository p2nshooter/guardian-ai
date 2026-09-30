/* AXTO — Compliance Center v4: the control library, cross-framework mapping,
 * scores, vendor scoring, risk levels, policy templates, exports and the AI
 * briefing. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FRAMEWORKS } from "../lib/compliance/frameworks";
import { LIBRARY, TOTAL_CONTROLS, controlKey, findControl, mappedControls } from "../lib/compliance/controls";
import { POLICY_TEMPLATES, VENDOR_QUESTIONS } from "../lib/compliance/library";
import { newWorkspace, upgradeWorkspace, score, vendorScore, riskLevel, applyToMapped, policyControls, controlsCsv, risksCsv, soaMarkdown, reportMarkdown, aiContext, sampleWorkspace } from "../lib/compliance/workspace";

test("library: every framework is present with the right control counts and unique ids", () => {
  for (const f of FRAMEWORKS) assert.ok(LIBRARY[f.id], f.id);
  assert.equal(LIBRARY.iso27001.controls.length, 93, "ISO 27001:2022 Annex A has 93 controls");
  assert.deepEqual(LIBRARY.iso27001.domains.map((d) => LIBRARY.iso27001.controls.filter((c) => c.domain === d.id).length), [37, 8, 14, 34]);
  assert.equal(LIBRARY.nist.controls.length, 22, "CSF 2.0 has 22 categories");
  assert.equal(LIBRARY.nist.domains.length, 6);
  assert.equal(LIBRARY.soc2.controls.filter((c) => c.id.startsWith("CC")).length, 33, "33 common criteria");
  assert.equal(LIBRARY.pci.domains.length, 12);
  for (const [fw, lib] of Object.entries(LIBRARY)) {
    const ids = lib.controls.map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length, `${fw}: unique ids`);
    for (const c of lib.controls) {
      assert.ok(lib.domains.some((d) => d.id === c.domain), `${fw} ${c.id}: known domain`);
      assert.ok(c.themes.length >= 1, `${fw} ${c.id}: has a theme`);
    }
  }
  assert.equal(TOTAL_CONTROLS, 342, `total ${TOTAL_CONTROLS}`);
});

test("mapping: equivalent controls across frameworks", () => {
  const m = mappedControls("iso27001", "A.8.13").map((x) => controlKey(x.fw, x.control.id));
  assert.ok(m.includes("soc2:A1.2"), "ISO backup ↔ SOC 2 A1.2");
  assert.ok(m.includes("hipaa:164.308(a)(7)(ii)(A)"), "ISO backup ↔ HIPAA data backup plan");
  const breach = mappedControls("gdpr", "Art. 33").map((x) => controlKey(x.fw, x.control.id));
  assert.ok(breach.includes("uupdp:Pasal 46"), "GDPR 72h ↔ UU PDP 3×24h");
  assert.ok(!mappedControls("iso27001", "A.8.13").some((x) => x.fw === "iso27001"), "never maps to its own framework");
});

test("policy templates reference real controls; at least 26 templates", () => {
  assert.ok(POLICY_TEMPLATES.length >= 26);
  for (const p of POLICY_TEMPLATES) {
    assert.ok(p.sections.length >= 7, p.id);
    for (const [fw, ids] of Object.entries(p.controls)) for (const id of ids!) assert.ok(findControl(fw as any, id), `${p.id}: ${fw} ${id} exists`);
  }
  assert.equal(new Set(POLICY_TEMPLATES.map((p) => p.id)).size, POLICY_TEMPLATES.length);
});

test("score: implemented = 1, in progress = ½, N/A excluded; overdue counted", () => {
  const w = newWorkspace("t");
  w.controls[controlKey("nist", "GV.OC")] = { status: "implemented" };
  w.controls[controlKey("nist", "GV.RM")] = { status: "in_progress", due: "2000-01-01" };
  w.controls[controlKey("nist", "GV.RR")] = { status: "not_applicable", justification: "x" };
  const s = score(w, "nist", undefined, "2026-09-30");
  assert.equal(s.applicable, 21);
  assert.equal(s.pct, Math.round((1.5 / 21) * 100));
  assert.equal(s.overdue, 1);
  assert.equal(score(w, "nist", "GV", "2026-09-30").pct, Math.round((1.5 / 5) * 100));
});

test("vendors and risks", () => {
  const good = vendorScore({ id: "v", name: "A", service: "", criticality: "critical", data: "sensitive", answers: Object.fromEntries(VENDOR_QUESTIONS.map((q) => [q.id, "yes"])) });
  assert.equal(good.pct, 100); assert.equal(good.inherent, "critical"); assert.equal(good.residual, "medium");
  const bad = vendorScore({ id: "v", name: "B", service: "", criticality: "medium", data: "personal", answers: { cert: "no", dpa: "no", mfa: "no" } });
  assert.equal(bad.pct, 0); assert.equal(bad.residual, "critical");
  assert.equal(vendorScore({ id: "v", name: "C", service: "", criticality: "low", data: "none", answers: {} }).answered, 0);
  assert.equal(riskLevel(5, 5), "critical"); assert.equal(riskLevel(2, 5), "high"); assert.equal(riskLevel(1, 5), "medium"); assert.equal(riskLevel(1, 2), "low");
});

test("apply to mapped controls only touches frameworks in scope and not-started controls", () => {
  const w = newWorkspace("t");
  w.frameworks = ["iso27001", "soc2"];
  w.controls[controlKey("iso27001", "A.8.13")] = { status: "implemented", evidence: [{ id: "e1", name: "backup-test.pdf", size: 1, type: "application/pdf", addedAt: "" }] };
  w.controls[controlKey("soc2", "A1.3")] = { status: "implemented" };
  const r = applyToMapped(w, "iso27001", "A.8.13");
  assert.ok(r.changed.includes("soc2:A1.2"));
  assert.ok(!r.changed.some((k) => k.startsWith("hipaa:")), "HIPAA is not in scope");
  assert.ok(!r.changed.includes("soc2:A1.3"), "already implemented stays");
  assert.equal(r.workspace.controls["soc2:A1.2"].status, "in_progress", "mapped work needs review, never auto-implemented");
  assert.equal(r.workspace.controls["soc2:A1.2"].evidence![0].name, "backup-test.pdf");
  assert.ok(policyControls(w, "backup").some((x) => x.fw === "soc2" && x.id === "A1.2"));
});

test("exports, SoA, report and briefing", () => {
  const w = sampleWorkspace();
  const csv = controlsCsv(w);
  assert.equal(csv.trim().split("\n").length, 1 + LIBRARY.iso27001.controls.length + LIBRARY.soc2.controls.length + LIBRARY.gdpr.controls.length + LIBRARY.uupdp.controls.length);
  assert.match(risksCsv(w), /Ransomware/);
  const soa = soaMarkdown(w);
  assert.match(soa, /\| A\.7\.1 \| Physical security perimeters \| No \|/);
  assert.equal((soa.match(/^\| A\./gm) || []).length, 93);
  const rep = reportMarkdown(w, "2026-09-30");
  for (const s of ["## Summary", "## Top risks", "## Vendors", "Statement", "ISO/IEC 27001:2022"].slice(0, 3)) assert.ok(rep.includes(s), s);
  const b = aiContext(w, { fw: "iso27001", id: "A.8.16" });
  assert.match(b, /FOCUS CONTROL: .*A\.8\.16/);
  assert.match(b, /readiness \d+%/);
  assert.ok(b.length <= 14_100);
  // formula-injection guard in CSV
  const w2 = newWorkspace("t"); w2.risks = [{ id: "r", title: "=cmd|' /C calc'!A0", description: "", category: "security", owner: "", likelihood: 1, impact: 1, treatment: "accept", rLikelihood: 1, rImpact: 1, controls: [], status: "open" }];
  assert.match(risksCsv(w2), /"'=cmd/);
});

test("upgrade: v3 reports open as a programme; bad data is dropped", () => {
  const v3 = upgradeWorkspace({ framework: "hipaa", mode: "policy", org: "Clinic, 20 staff", region: "US", messages: [{ role: "user", content: "q" }, { role: "assistant", content: "a" }] }, "Old report");
  assert.deepEqual(v3.frameworks, ["hipaa"]);
  assert.equal(v3.messages.length, 2);
  assert.equal(v3.org.description, "Clinic, 20 staff");
  const v4 = upgradeWorkspace({ v: 4, name: "x", frameworks: ["soc2", "nope"], controls: { "soc2:CC6.1": { status: "implemented" }, "soc2:ZZ": { status: "implemented" }, "iso27001:A.5.1": { status: "weird" } }, risks: [{ title: "r", likelihood: 9 }] });
  assert.deepEqual(v4.frameworks, ["soc2"]);
  assert.deepEqual(Object.keys(v4.controls), ["soc2:CC6.1"]);
  assert.equal(v4.risks[0].likelihood, 3, "out-of-range likelihood falls back");
});

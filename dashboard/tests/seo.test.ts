/* AXTO — search titles and snippets (lib/seo.ts): at most 60 characters of title and 160 of
 * description, keyword first, " | AXTO" when there is room. Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_DESCRIPTION, MAX_TITLE, pageMeta, searchTitle, snippet } from "../lib/seo";

test("search title: as it is with the brand when it fits, else the longest clause that fits", () => {
  assert.equal(searchTitle("Pricing"), "Pricing | AXTO");
  assert.equal(searchTitle("Licence auction — every AXTO package every two weeks, from 25 % of the price"), "Licence auction | AXTO");
  assert.equal(searchTitle("AXTO — AI workspace for legal, security & business teams"), "AXTO — AI workspace for legal, security & business teams", "names AXTO already, fits");
  assert.equal(searchTitle("Apps — Legal AI, Prompt Library, AI Studio, Clipper and more"), "Apps — Legal AI, Prompt Library, AI Studio, Clipper and more", "fits without the brand");
  assert.equal(searchTitle("Developer API & realtime — SSE, WebSocket, WebRTC, gRPC-compatible, MCP | AXTO Connect"), "Developer API & realtime | AXTO");
  assert.equal(searchTitle("Acquire AXTO — an enterprise-grade AI platform for sale (US$10M) and more"), "Acquire AXTO", "never \"AXTO | AXTO\"");
  assert.equal(searchTitle("Is my contract enforceable? Ten clauses every founder should read twice"), "Is my contract enforceable? | AXTO", "a question keeps its mark");
  const long = searchTitle("Why Self-Hosted AI Security Beats the Cloud for Sensitive Workloads");
  assert.ok(long.length <= MAX_TITLE && long.endsWith("…") && long.startsWith("Why Self-Hosted AI Security"), long);
  for (const t of ["A", "Short", "x ".repeat(80)]) assert.ok(searchTitle(t).length <= MAX_TITLE + 7, t);
});

test("snippet: up to 160 characters, cut at the end of a sentence", () => {
  assert.equal(snippet("One line."), "One line.");
  const two = "The first sentence is long enough to stand on its own as a description of the page and its purpose. The second sentence would push it well past the limit Google shows.";
  assert.equal(snippet(two), "The first sentence is long enough to stand on its own as a description of the page and its purpose.");
  const one = "word ".repeat(60).trim();
  const cut = snippet(one);
  assert.ok(cut.length <= MAX_DESCRIPTION && cut.endsWith("…") && !cut.includes("  "), cut);
});

test("pageMeta: absolute <title> and short description; Open Graph keeps the full text", () => {
  const full = "Licence auction — every AXTO package every two weeks, from 25 % of the price";
  const desc = "Every AXTO package is auctioned every two weeks and every auction ends on Friday at 07:00 WIB. Bids open at 25 % of the normal price and rise by 10 % of the opening bid each time.";
  const m = pageMeta({ title: full, description: desc, path: "/auction" });
  assert.deepEqual(m.title, { absolute: "Licence auction | AXTO" });
  assert.ok(String(m.description).length <= MAX_DESCRIPTION);
  assert.equal((m.openGraph as { title?: string }).title, full);
  assert.equal((m.openGraph as { description?: string }).description, desc);
});

/* AXTO — AI Studio v4: conversation model (versions, files, images, tokens,
 * artifacts, export) and the server pipeline pieces it relies on. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  composeUser, toApi, withVersion, pickVersion, shown, estimateTokens, extractArtifacts, artifactDoc, toMarkdown, toJson, titleOf, upgrade, newMsgId,
  type Msg,
} from "../lib/studio/model";
import { sanitizeMessages, getTask, MAX_IMAGES } from "../lib/ai/tasks";
import { acceptsTemperature } from "../lib/ai/providers";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test("files are sent as delimited text before the request; images travel alongside", () => {
  const u: Msg = { id: "1", role: "user", content: "Summarise", files: [{ name: "a.txt", text: "hello", size: 5 }], images: [{ mime: "image/png", data: PNG, name: "p.png" }] };
  assert.equal(composeUser(u), "«file: a.txt»\nhello\n«/file»\n\nSummarise");
  const api = toApi([u]);
  assert.equal(api[0].images?.length, 1);
  assert.equal((api[0].images![0] as any).name, undefined, "file names never go to the provider");
});

test("regenerate keeps every answer as a version; the chosen one is what the model sees next", () => {
  let a = withVersion(null, { content: "first", model: "m1", at: "t1" });
  a = withVersion(a, { content: "second", model: "m2", at: "t2" });
  assert.equal(a.versions!.length, 2);
  assert.equal(shown(a), "second");
  const back = pickVersion(a, 0);
  assert.equal(shown(back), "first");
  assert.equal(back.model, "m1");
  assert.equal(pickVersion(a, -1).vi, 1, "wraps around");
  const api = toApi([{ id: "u", role: "user", content: "q" }, back]);
  assert.equal(api[1].content, "first");
});

test("token estimate: Latin ~4 chars/token, CJK ~1 char/token, images add a fixed cost", () => {
  assert.equal(estimateTokens("abcdabcd"), 2);
  assert.equal(estimateTokens("你好世界"), 4);
  assert.equal(estimateTokens("", 2), 2600);
});

test("artifacts: html / svg / mermaid blocks become sandboxed documents", () => {
  const md = "Here:\n```html\n<h1>Hi</h1>\n```\nand\n```svg\n<svg viewBox='0 0 1 1'></svg>\n```\n```mermaid\ngraph TD; A-->B\n```\n```js\nconsole.log(1)\n```";
  const arts = extractArtifacts(md);
  assert.deepEqual(arts.map((a) => a.kind), ["html", "svg", "mermaid"]);
  assert.match(artifactDoc(arts[0]), /<body><h1>Hi<\/h1>/);
  const mm = artifactDoc(arts[2], "https://axto.io");
  assert.match(mm, /https:\/\/axto\.io\/vendor\/mermaid\/mermaid\.min\.js/);
  assert.match(mm, /securityLevel:"strict"/);
  assert.match(mm, /A--&gt;B/, "diagram source is escaped");
});

test("export: Markdown and JSON (image bytes summarised, never embedded)", () => {
  const msgs: Msg[] = [
    { id: "1", role: "user", content: "Hi", images: [{ mime: "image/png", data: PNG, name: "x.png" }] },
    withVersion(null, { content: "Hello!", model: "gpt-5", at: "t" }),
  ];
  const md = toMarkdown("Chat", msgs, { instructions: "Be brief", temperature: null, maxTokens: null });
  assert.match(md, /^# Chat/);
  assert.match(md, /Instructions:\*\* Be brief/);
  assert.match(md, /🖼 x\.png/);
  assert.match(md, /AI · gpt-5/);
  const js = JSON.parse(toJson("Chat", { v: 2, messages: msgs, settings: { instructions: "", temperature: null, maxTokens: null } }));
  assert.equal(js.messages[0].images[0].data, undefined);
  assert.ok(js.messages[0].images[0].bytes > 0);
  assert.equal(titleOf(msgs), "Hi");
});

test("legacy conversations upgrade to v2 (role → instructions)", () => {
  const c = upgrade({ role: "You are a lawyer", messages: [{ role: "user", content: "q" }, { role: "assistant", content: "a" }] });
  assert.equal(c.v, 2);
  assert.equal(c.settings.instructions, "You are a lawyer");
  assert.equal(c.messages.length, 2);
  assert.ok(newMsgId() !== newMsgId());
});

test("server: images are kept on user turns only, capped, and must be real base64 images", () => {
  const img = { mime: "image/png", data: PNG };
  const out = sanitizeMessages([
    { role: "user", content: "old", images: Array(5).fill(img) },
    { role: "assistant", content: "ok", images: [img] },
    { role: "user", content: "", images: [img, { mime: "text/html", data: PNG }, { mime: "image/png", data: "<script>" }, img, img] },
  ]);
  assert.equal(out[1].images, undefined, "assistant turns carry no images");
  assert.equal(out[2].content, "(image)", "an image-only turn gets a placeholder text");
  assert.equal(out[2].images!.length, 3, "bad types / non-base64 dropped");
  const total = out.reduce((n, m) => n + (m.images?.length || 0), 0);
  assert.equal(total, MAX_IMAGES, "newest images win the budget");
});

test("server: temperature only where the model accepts it; Studio options are bounded", () => {
  assert.equal(acceptsTemperature({ provider: "anthropic", model: "claude-opus-5-5" }), false);
  assert.equal(acceptsTemperature({ provider: "anthropic", model: "claude-fable-5-1" }), false);
  assert.equal(acceptsTemperature({ provider: "anthropic", model: "claude-sonnet-4-6" }), true);
  assert.equal(acceptsTemperature({ provider: "openai", model: "gpt-5" }), true);
  const h = getTask("studio")!;
  const b = h.build({ messages: [{ role: "user", content: "hi" }], options: { role: "Be a pirate", temperature: "3.5", maxTokens: "999999" } }, "starter");
  assert.ok("system" in b);
  assert.match(b.system, /Be a pirate/);
  assert.equal(b.temperature, 2);
  assert.equal(b.maxOutputTokens, 64000);
  const none = h.build({ messages: [{ role: "user", content: "hi" }], options: {} }, "starter");
  assert.ok("system" in none && none.temperature === undefined && none.maxOutputTokens === undefined);
});

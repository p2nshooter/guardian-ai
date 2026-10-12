/* AXTO — editorial blog depth and metadata. Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { BLOG_POSTS, postWords, readingMinutes } from "../lib/blog-posts";
import { BLOG_EXPANSIONS } from "../lib/blog-expansions";

test("blog: every article is a complete guide of at least 1500 words", () => {
  for (const p of BLOG_POSTS) assert.ok(postWords(p.body) >= 1500, `${p.slug}: ${postWords(p.body)} words`);
});

test("blog: reading time is computed from the real word count", () => {
  for (const p of BLOG_POSTS) assert.equal(p.minutes, readingMinutes(p.body), p.slug);
});

test("blog: slugs are unique and every expansion belongs to an existing post", () => {
  const slugs = BLOG_POSTS.map((p) => p.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const slug of Object.keys(BLOG_EXPANSIONS)) assert.ok(slugs.includes(slug), `orphan expansion ${slug}`);
});

test("blog: headings are well-formed and no body block is empty", () => {
  for (const p of BLOG_POSTS) {
    assert.ok(!p.body[0].startsWith("## "), `${p.slug} opens with prose`);
    for (const b of p.body) {
      assert.ok(b.trim().length > 0, `${p.slug} empty block`);
      if (b.startsWith("## ")) assert.ok(b.length > 4 && !b.includes("\n"), `${p.slug} heading ${b}`);
    }
    const heads = p.body.filter((b) => b.startsWith("## ")).map((b) => b.toLowerCase());
    assert.equal(new Set(heads).size, heads.length, `${p.slug} duplicate heading`);
  }
});

test("blog: descriptions stay within search-snippet length", () => {
  for (const p of BLOG_POSTS) assert.ok(p.description.length >= 70 && p.description.length <= 200, `${p.slug}: ${p.description.length}`);
});

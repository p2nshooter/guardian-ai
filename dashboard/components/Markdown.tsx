/* Safe Markdown renderer (React elements only — never raw HTML). Live-research
 * status lines render as small chips; links open in a new tab. */
"use client";
import { Fragment, memo, type ReactNode } from "react";
import { parseMarkdown, type Block, type Inline } from "@/lib/markdown";

function inl(c: Inline[], k = ""): ReactNode[] {
  return c.map((x, i) => {
    const key = `${k}${i}`;
    switch (x.t) {
      case "text": return <Fragment key={key}>{x.v}</Fragment>;
      case "b": return <strong key={key}>{inl(x.c, key)}</strong>;
      case "i": return <em key={key}>{inl(x.c, key)}</em>;
      case "code": return <code key={key}>{x.v}</code>;
      case "a": return <a key={key} href={x.href} target="_blank" rel="noopener noreferrer nofollow">{inl(x.c, key)}</a>;
    }
  });
}

const CHIP: Record<string, string> = { search: "🔎", fetch: "📄", note: "ℹ️" };

function blocks(list: Block[], k = ""): ReactNode[] {
  return list.map((b, i) => {
    const key = `${k}${i}`;
    switch (b.type) {
      case "h": {
        const H = (`h${Math.min(4, b.level)}`) as "h1" | "h2" | "h3" | "h4";
        return <H key={key}>{inl(b.c)}</H>;
      }
      case "p": return <p key={key}>{inl(b.c)}</p>;
      case "hr": return <hr key={key} />;
      case "code": return <pre key={key}><code>{b.v}</code></pre>;
      case "quote": return <blockquote key={key}>{blocks(b.blocks, key)}</blockquote>;
      case "status": return (
        <div key={key} className="not-prose my-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
          <span aria-hidden="true">{CHIP[b.kind] || "•"}</span><span className="truncate">{b.v}</span>
        </div>
      );
      case "ul": return <ul key={key}>{b.items.map((it, j) => <li key={j}>{inl(it.c)}{blocks(it.children, `${key}-${j}-`)}</li>)}</ul>;
      case "ol": return <ol key={key} start={b.start}>{b.items.map((it, j) => <li key={j}>{inl(it.c)}{blocks(it.children, `${key}-${j}-`)}</li>)}</ol>;
      case "table": return (
        <div key={key} className="my-4 overflow-x-auto">
          <table>
            <thead><tr>{b.head.map((h, j) => <th key={j} style={{ textAlign: b.align[j] || "left" }}>{inl(h)}</th>)}</tr></thead>
            <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, m) => <td key={m} style={{ textAlign: b.align[m] || "left" }}>{inl(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    }
  });
}

function MarkdownImpl({ text, className = "" }: { text: string; className?: string }) {
  return <div className={`prose-axto ${className}`}>{blocks(parseMarkdown(text))}</div>;
}

export default memo(MarkdownImpl);

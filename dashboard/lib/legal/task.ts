/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Registers Legal AI in the task registry: validates the workspace against the
 * member's plan, builds the layered system prompt and places the uploaded
 * documents in the FIRST user turn (so follow-up questions keep them).
 * ============================================================================ */
import { registerTask } from "../ai/tasks";
import { limitsFor } from "../plans";
import { buildLegalSystemPrompt, documentsBlock, parseLegalOptions, sanitizeDocs } from "./prompt";
import { CORE_WORKSPACES } from "./workspaces";
import { describeJurisdiction } from "./jurisdictions";

registerTask({
  app: "legal",
  build(input, tier) {
    const parsed = parseLegalOptions({ ...(input.options || {}), ws: input.task || input.options?.ws || "" }, !!input.research);
    if ("error" in parsed) return { error: parsed.error };
    const { ws, opts } = parsed;
    if (limitsFor(tier).legalWorkspaces !== "all" && !CORE_WORKSPACES.includes(ws.id)) {
      return { error: `“${ws.name}” is included from the Pro plan. Upgrade to unlock all 36 workspaces.`, status: 402 };
    }
    const docs = sanitizeDocs(input.documents);
    if (ws.docs === "required" && !docs.length) return { error: "This workspace needs at least one document. Upload a file or paste the text." };
    const messages = input.messages.map((m) => ({ ...m }));
    const firstUser = messages.findIndex((m) => m.role === "user");
    if (docs.length && firstUser >= 0) messages[firstUser].content = documentsBlock(docs) + messages[firstUser].content;
    const system = buildLegalSystemPrompt(ws, opts);
    const first = input.messages.find((m) => m.role === "user")?.content || ws.name;
    return {
      system, messages, research: opts.research,
      title: `${ws.name} · ${describeJurisdiction(opts.jurisdiction)} — ${first.replace(/\s+/g, " ").slice(0, 60)}`,
    };
  },
});

/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * PROMPT LIBRARY v4 — registers the app in the AI task registry (server side).
 * The builder lives in ./task-core so Local Mode can run it in the browser;
 * here it reads templates straight from the catalogue, so the plan's level gate
 * is enforced on the server too.
 * ============================================================================ */
import { registerTask } from "../ai/tasks";
import { getPrompt } from "./catalog";
import { buildPromptTask } from "./task-core";

export { PROMPT_MODES, fillTemplate, type PromptMode } from "./task-core";

registerTask({
  app: "prompts",
  build: (input, tier) => buildPromptTask(input, tier, (id) => {
    const p = getPrompt(id);
    return p ? { id: p.id, level: p.level, title: p.title, template: p.template } : undefined;
  }),
});

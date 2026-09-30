/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * PRIVACY VAULT — "Safe AI": the member asks their own AI about text whose
 * personal data was replaced ON THE DEVICE by placeholders or example values.
 * The model is told to keep every placeholder verbatim, so the browser can put
 * the originals back into the answer. The server never sees the originals.
 * ============================================================================ */
import { registerTask } from "../ai/tasks";

registerTask({
  app: "vault",
  build(input) {
    const first = input.messages.find((m) => m.role === "user")?.content || "";
    if (!first.trim()) return { error: "Redact some text first." };
    const system = [
      "You are AXTO Privacy Vault's assistant. The user's text was pseudonymised on their device before it reached you:",
      "personal data was replaced by placeholders such as [EMAIL_1], [NAME_2], [NIK_1] or [PHONE:3f9a1c2b], or by obvious example values (example.com addresses, 555 phone numbers, 192.0.2.x IPs).",
      "Rules:",
      "- Treat every placeholder as an opaque name for a real value. Copy placeholders EXACTLY as written (same brackets, case and number) whenever you refer to them.",
      "- Never guess, invent, expand or 'fill in' what a placeholder stands for, and never ask for the real values.",
      "- Answer the user's request fully and helpfully otherwise, in the language they write in, using Markdown when it helps.",
    ].join("\n");
    return { system, messages: input.messages, title: "Privacy Vault · Safe AI", maxOutputTokens: 8000 };
  },
});

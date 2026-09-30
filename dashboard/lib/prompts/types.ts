/* PROMPT LIBRARY — shared types (kept apart so the catalogue parts can import them). */
import type { PromptLevel } from "../plans";

export interface Field { id: string; name: string; icon: string; blurb: string; keywords: string[] }
export interface Variable { key: string; label: string; placeholder?: string }
export interface Prompt {
  id: string; field: string; level: PromptLevel; title: string; summary: string;
  variables: Variable[]; template: string; example?: string; models?: string[]; tags?: string[];
}

/** Compact constructor for catalogue parts: vars as [key, label, placeholder?]. */
export const Q = (id: string, field: string, level: PromptLevel, title: string, summary: string, vars: [string, string, string?][], template: string): Prompt =>
  ({ id, field, level, title, summary, variables: vars.map(([key, label, placeholder]) => (placeholder ? { key, label, placeholder } : { key, label })), template });

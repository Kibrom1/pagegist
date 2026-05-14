// System prompts and quick-action templates. Single source so we can tune
// them in one place when we A/B test phrasing later.

import type { Message } from "./providers/types";

export type PageContext = {
  title: string;
  url: string;
  byline?: string;
  content: string;
};

export function buildSystemPrompt(page: PageContext): string {
  const byline = page.byline ? `\nByline: ${page.byline}` : "";
  return [
    "You are PageGist, a concise reading companion that lives in a browser sidebar.",
    "You answer the user's questions about the current web page.",
    "Ground every claim in the page content below. If something isn't on the page, say so.",
    "Be concise. Match the format the user asks for; default to prose.",
    "Quote sparingly; never reproduce long passages of copyrighted text.",
    "",
    `=== PAGE: ${page.title} ===`,
    `URL: ${page.url}${byline}`,
    "",
    page.content,
    "=== END PAGE ===",
  ].join("\n");
}

export type QuickActionId = "summarize" | "explain" | "counter";

export type QuickAction = {
  id: QuickActionId;
  label: string;
  description: string;
  /** Builds the user message for this action. Selection is optional. */
  buildUserMessage(args: { selection?: string }): string;
};

const SUMMARIZE_PROMPT = [
  "Use only information from the page — do not add outside knowledge.",
  "",
  "**TL;DR:** Summarise this page in proportion to its length and complexity — one sentence for a brief page, up to a short paragraph for a long or dense one.",
  "",
  "**Key takeaways:** The most important points as bullets. Scale the count to match the content — 2–3 for a short page, up to 7 for a long or complex one. Each bullet should be a concrete, distinct fact, finding, or argument. Not a restatement of the TL;DR. Not vague generalisations.",
  "",
  "Only include this section if the page exceeds a few paragraphs:",
  '**Key quote:** The single most representative sentence (under 20 words). Format as: > "quote"',
].join("\n");

export const QUICK_ACTIONS: readonly QuickAction[] = [
  {
    id: "summarize",
    label: "Summarize",
    description: "TL;DR + key takeaways, scaled to the page.",
    buildUserMessage: () => SUMMARIZE_PROMPT,
  },
  {
    id: "explain",
    label: "Explain",
    description: "Plain-language explanation of the highlighted text.",
    buildUserMessage: ({ selection }) =>
      selection
        ? `Explain this selection in plain language. Be brief — use as many sentences as needed, but no more.\n\nSelection:\n"""${selection}"""`
        : "Explain the single most important idea on this page in plain language. Be brief.",
  },
  {
    id: "counter",
    label: "Counterarguments",
    description: "Strongest counterarguments to the page's main claims.",
    buildUserMessage: ({ selection }) =>
      selection
        ? `Give the 2–3 strongest counterarguments to this selection. Make them specific to the argument here, not generic objections.\n\nSelection:\n"""${selection}"""`
        : "What is the main argument this page is making? Then give the 2–3 strongest counterarguments, specific to what's actually claimed here.",
  },
];

export function withPageContext(page: PageContext, userMessage: string): Message[] {
  return [
    { role: "system", content: buildSystemPrompt(page) },
    { role: "user", content: userMessage },
  ];
}

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

export const QUICK_ACTIONS: readonly QuickAction[] = [
  {
    id: "summarize",
    label: "Summarize",
    description: "TL;DR + 3–5 key points from the page.",
    buildUserMessage: () =>
      "TL;DR: one sentence summary of this page.\n\nKey takeaways: 3–5 bullets. Be specific to this page — no generic filler.",
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

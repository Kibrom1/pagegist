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
  /** SVG path data (24×24 viewBox) rendered as a small icon beside the label. */
  icon: string;
  description: string;
  /** Builds the user message for this action. Selection is optional. */
  buildUserMessage(args: { selection?: string }): string;
};

const SUMMARIZE_PROMPT = [
  "Use only information from the page — do not add outside knowledge.",
  "",
  "Start with a summary in proportion to the page's length and complexity — one sentence for a brief page, up to a short paragraph for a long or dense one. No label or heading, just the summary itself.",
  "",
  "**Key takeaways:** The most important points as bullets. Scale the count to match the content — 2–3 for a short page, up to 7 for a long or complex one. Each bullet should be a concrete, distinct fact, finding, or argument. Not a restatement of the opening summary. Not vague generalisations.",
  "",
  "Only include this section if the page exceeds a few paragraphs:",
  '**Key quote:** The single most representative sentence (under 20 words). Format as: > "quote"',
].join("\n");

// Heroicons outline paths (24×24 viewBox).
const ICON_SUMMARIZE =
  "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z";

const ICON_EXPLAIN =
  "M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18";

const ICON_COUNTER =
  "M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z";

export const QUICK_ACTIONS: readonly QuickAction[] = [
  {
    id: "summarize",
    label: "Summarize",
    icon: ICON_SUMMARIZE,
    description: "TL;DR + key takeaways, scaled to the page.",
    buildUserMessage: () => SUMMARIZE_PROMPT,
  },
  {
    id: "explain",
    label: "Explain",
    icon: ICON_EXPLAIN,
    description: "Plain-language explanation of the highlighted text.",
    buildUserMessage: ({ selection }) =>
      selection
        ? `Explain this selection in plain language. Be brief — use as many sentences as needed, but no more.\n\nSelection:\n"""${selection}"""`
        : "Explain the single most important idea on this page in plain language. Be brief.",
  },
  {
    id: "counter",
    label: "Counterarguments",
    icon: ICON_COUNTER,
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

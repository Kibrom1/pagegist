// Readability wrapper — canonical import point for page-extraction types.
//
// WHY THIS FILE EXISTS
// Mozilla Readability must run in the page (content script) context because
// it needs access to `document`. Calling it from the side panel or background
// worker is not possible. As a result, the actual `new Readability(doc).parse()`
// call lives in `src/content/content-script.ts`, not here.
//
// This module serves two purposes:
//   1. Re-export ExtractedPage as the single source of truth for importers
//      that only need the type (side panel hooks, tests, etc.) without
//      depending on a content-script file directly.
//   2. Provide the `truncatePageContent()` helper, which IS safe to call
//      outside the content script once the page text has been extracted.

export type { ExtractedPage } from "../content/content-script";

import { truncateToTokens } from "./tokens";

/**
 * Trim extracted page text to `maxTokens` before including it in an
 * AI request. Call this on the side-panel side, NOT in the content script.
 *
 * @param content  Raw text returned by ExtractedPage.content.
 * @param maxTokens  Per-provider ceiling (see ChatBackend.maxContextTokens).
 */
export function truncatePageContent(content: string, maxTokens: number): string {
  return truncateToTokens(content, maxTokens);
}

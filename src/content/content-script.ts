// Page extraction + selection capture. The side panel asks for both via
// chrome.runtime messages; we reply with Readability output or selected text.

import { Readability } from "@mozilla/readability";

type ExtractRequest = { type: "EXTRACT_PAGE" };
type SelectionRequest = { type: "GET_SELECTION" };
type Incoming = ExtractRequest | SelectionRequest;

export type ExtractedPage = {
  title: string;
  byline?: string;
  content: string;
  url: string;
  hadArticle: boolean;
  wordCount: number;
};

function extractPage(): ExtractedPage {
  // Clone the doc so Readability can mutate freely.
  const docClone = document.cloneNode(true) as Document;
  let parsed: ReturnType<Readability["parse"]> = null;
  try {
    parsed = new Readability(docClone).parse();
  } catch (err) {
    console.warn("[PageGist] Readability failed", err);
  }

  const fallbackText = document.body?.innerText ?? "";
  const content = (parsed?.textContent ?? fallbackText).trim();
  const wordCount = content ? content.split(/\s+/).length : 0;

  return {
    title: parsed?.title || document.title || location.href,
    byline: parsed?.byline ?? undefined,
    content,
    url: location.href,
    hadArticle: Boolean(parsed?.content && content && content.length > 200),
    wordCount,
  };
}

function getSelectionText(): string {
  return window.getSelection()?.toString().trim() ?? "";
}

chrome.runtime.onMessage.addListener((msg: Incoming, _sender, sendResponse) => {
  if (msg.type === "EXTRACT_PAGE") {
    try {
      sendResponse(extractPage());
    } catch (err) {
      sendResponse({ error: err instanceof Error ? err.message : "Extraction failed" });
    }
    return true;
  }
  if (msg.type === "GET_SELECTION") {
    sendResponse({ text: getSelectionText() });
    return true;
  }
  return undefined;
});

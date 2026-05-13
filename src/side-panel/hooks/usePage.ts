// Watches the active tab, requests fresh page content from the content script.

import { useEffect, useState } from "react";
import type { ExtractedPage } from "../../content/content-script";

export type PageState =
  | { status: "loading" }
  | { status: "ready"; page: ExtractedPage }
  | { status: "error"; message: string };

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function fetchPage(tabId: number): Promise<ExtractedPage> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: "EXTRACT_PAGE" }, (response) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message ?? "Content script not reachable"));
        return;
      }
      if (!response) {
        reject(new Error("Empty response from content script"));
        return;
      }
      if ("error" in response) {
        reject(new Error(response.error as string));
        return;
      }
      resolve(response as ExtractedPage);
    });
  });
}

export async function getSelection(tabId: number): Promise<string> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: "GET_SELECTION" }, (response) => {
      if (chrome.runtime.lastError) {
        resolve("");
        return;
      }
      resolve(((response as { text?: string })?.text ?? "").trim());
    });
  });
}

export function usePage(): {
  state: PageState;
  refresh: () => Promise<void>;
  tabId: number | undefined;
} {
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [tabId, setTabId] = useState<number | undefined>();

  const load = async () => {
    setState({ status: "loading" });
    try {
      const tab = await getActiveTab();
      if (!tab?.id || !tab.url || !tab.url.startsWith("http")) {
        setState({
          status: "error",
          message: "Open a regular web page (http or https) to use PageGist.",
        });
        return;
      }
      setTabId(tab.id);
      const page = await fetchPage(tab.id);
      setState({ status: "ready", page });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to read the page.",
      });
    }
  };

  // `load` reads no state and only writes through stable setState, so capturing
  // a fresh closure each render is safe and intentional.
  // biome-ignore lint/correctness/useExhaustiveDependencies: load is intentionally not memoized
  useEffect(() => {
    void load();
    const onMsg = (msg: { type?: string }) => {
      if (msg?.type === "pagegist:tab-updated" || msg?.type === "pagegist:tab-activated") {
        void load();
      }
    };
    chrome.runtime.onMessage.addListener(onMsg);
    return () => chrome.runtime.onMessage.removeListener(onMsg);
  }, []);

  return { state, refresh: load, tabId };
}

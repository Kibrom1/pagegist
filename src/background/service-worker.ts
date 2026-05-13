// MV3 background. Three responsibilities:
//   1. Open the side panel when the toolbar icon is clicked.
//   2. Open the onboarding tab on first install.
//   3. Forward navigation events to the side panel so it can refresh context.

import { isOnboarded, markOnboarded, migrateIfNeeded } from "../lib/storage";

// Run storage migrations before anything else. Safe to await at top-level
// in a module-type service worker.
void migrateIfNeeded();

// Toolbar icon click → open the side panel for that tab.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error("[PageGist] setPanelBehavior failed", err));

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    const onboarded = await isOnboarded();
    if (!onboarded) {
      const url = chrome.runtime.getURL("src/onboarding/index.html");
      await chrome.tabs.create({ url });
      await markOnboarded();
    }
  }
});

// Notify the side panel when the user navigates / switches tabs.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active && tab.url) {
    chrome.runtime.sendMessage({ type: "pagegist:tab-updated", tabId, url: tab.url }).catch(() => {
      // No receiver → side panel isn't open. Fine.
    });
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.runtime.sendMessage({ type: "pagegist:tab-activated", tabId }).catch(() => {});
});

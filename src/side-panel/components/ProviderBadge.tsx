import { useEffect, useState } from "react";
import { getActiveProvider } from "../../lib/providers";

export function ProviderBadge() {
  const [label, setLabel] = useState("…");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const provider = await getActiveProvider();
      if (cancelled) return;
      setLabel(provider.displayName);
    }
    void load();
    const onChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if ("pagegist:active-provider" in changes) void load();
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => {
      cancelled = true;
      chrome.storage.onChanged.removeListener(onChange);
    };
  }, []);

  return <span className="provider-badge">{label}</span>;
}

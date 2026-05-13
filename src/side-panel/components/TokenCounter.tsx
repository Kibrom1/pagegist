import { useEffect, useState } from "react";
import { getActiveProvider } from "../../lib/providers";
import { estimateSessionCost } from "../../lib/tokens";

export function TokenCounter({
  inputTokens,
  outputTokens,
  model,
}: {
  inputTokens: number;
  outputTokens: number;
  model?: string;
}) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function compute() {
      const provider = await getActiveProvider();
      if (cancelled) return;
      const { label: costLabel, usd } = estimateSessionCost(
        inputTokens,
        outputTokens,
        provider,
        model,
      );
      // Free providers: "Free (on-device)" or "Free"
      // Paid providers: "~$0.003 this session"
      if (usd === 0) {
        setLabel(costLabel === "Free" ? "Free · on-device" : costLabel);
      } else {
        setLabel(`~${costLabel} this session`);
      }
    }
    void compute();
    return () => {
      cancelled = true;
    };
  }, [inputTokens, outputTokens, model]);

  if (!label) return null;
  return <span className="token-counter">{label}</span>;
}

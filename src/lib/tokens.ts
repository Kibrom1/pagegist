// Token counting + cost estimation.
//
// We use a fast character-based heuristic rather than a full BPE tokenizer.
// The gpt-tokenizer package embeds ~2.5 MB of vocabulary data that inflated
// the side-panel bundle to 3.5 MB. For our two use-cases — truncating page
// content before it's sent and showing a session cost estimate — a ±15%
// accuracy is more than adequate.
//
// Heuristic: ~4 chars per token for English prose (GPT/Claude BPE average).
// We also add a small word-count component because short words tokenise
// individually, pulling the ratio below 4. Empirically, on typical web text
// this lands within 10% of the real token count.

import type { ChatBackend } from "./providers/types";

export function countTokens(text: string): number {
  if (!text) return 0;
  // Word count × 1.3 approximates sub-word splits; char count / 4 covers
  // long words and code. Take the average of both signals.
  const byWords = (text.match(/\S+/g)?.length ?? 0) * 1.3;
  const byChars = text.length / 4;
  return Math.ceil((byWords + byChars) / 2);
}

export function estimateSessionCost(
  inputTokens: number,
  outputTokens: number,
  provider: ChatBackend,
  model?: string,
): { usd: number; label: string } {
  const usd = provider.estimateCost?.(inputTokens, outputTokens, model) ?? 0;
  if (usd === 0) return { usd: 0, label: "Free" };
  if (usd < 0.001) return { usd, label: "<$0.001" };
  if (usd < 0.01) return { usd, label: `$${usd.toFixed(4)}` };
  return { usd, label: `$${usd.toFixed(3)}` };
}

/** Truncate text to roughly `maxTokens` tokens, preferring whole sentences. */
export function truncateToTokens(text: string, maxTokens: number): string {
  const total = countTokens(text);
  if (total <= maxTokens) return text;
  // Binary search on character count for an approximate truncation point.
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (countTokens(text.slice(0, mid)) <= maxTokens) lo = mid;
    else hi = mid - 1;
  }
  // Snap to the last sentence boundary within the truncated range.
  const slice = text.slice(0, lo);
  const lastBoundary = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf(".\n"),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
  );
  return lastBoundary > slice.length * 0.6 ? `${slice.slice(0, lastBoundary + 1)} …` : `${slice} …`;
}

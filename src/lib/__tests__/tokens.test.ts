import { describe, expect, it } from "vitest";
import type { ChatBackend } from "../providers/types";
import { countTokens, estimateSessionCost, truncateToTokens } from "../tokens";

// ---------------------------------------------------------------------------
// countTokens
// ---------------------------------------------------------------------------

describe("countTokens", () => {
  it("returns 0 for empty string", () => {
    expect(countTokens("")).toBe(0);
  });

  it("returns a positive number for normal prose", () => {
    const n = countTokens("The quick brown fox jumps over the lazy dog.");
    expect(n).toBeGreaterThan(0);
  });

  it("scales roughly linearly — longer text gets more tokens", () => {
    const short = countTokens("Hello world");
    const long = countTokens("Hello world ".repeat(50));
    expect(long).toBeGreaterThan(short * 10);
  });

  it("returns a number (not NaN or Infinity) for unicode-heavy text", () => {
    const result = countTokens("日本語テスト 中文测试 العربية");
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeGreaterThan(0);
  });

  it("handles a single character", () => {
    expect(countTokens("a")).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// truncateToTokens
// ---------------------------------------------------------------------------

describe("truncateToTokens", () => {
  it("returns the original string if it is under the budget", () => {
    const text = "Short sentence.";
    expect(truncateToTokens(text, 10000)).toBe(text);
  });

  it("truncates long text to at most maxTokens", () => {
    const text = "word ".repeat(2000); // ~2000 words
    const result = truncateToTokens(text, 100);
    expect(countTokens(result)).toBeLessThanOrEqual(120); // allow small overshoot
    expect(result.length).toBeLessThan(text.length);
  });

  it("appends an ellipsis when truncating", () => {
    const text = "word ".repeat(2000);
    const result = truncateToTokens(text, 50);
    expect(result).toMatch(/…$/);
  });

  it("snaps to a sentence boundary when one is available in the latter 60%", () => {
    // Build a string where there is a clear sentence boundary well past 60%
    const prefix = "Short sentence. ".repeat(30); // lots of sentence endings
    const suffix = "no-boundary-here ".repeat(20);
    const text = prefix + suffix;
    const result = truncateToTokens(text, 80);
    // Should end with ". …" (sentence boundary snap) not mid-word
    expect(result).toMatch(/\.\s…$/);
  });

  it("handles empty string without throwing", () => {
    expect(truncateToTokens("", 100)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// estimateSessionCost
// ---------------------------------------------------------------------------

const freeProvider: ChatBackend = {
  id: "chrome-nano",
  displayName: "Chrome (Gemini Nano)",
  tier: "free",
  availability: async () => ({ available: true }),
  chat: () => ({
    [Symbol.asyncIterator]: () => ({ next: async () => ({ done: true, value: "" }) }),
  }),
  estimateCost: () => 0,
};

const paidProvider: ChatBackend = {
  id: "anthropic",
  displayName: "Anthropic Claude",
  tier: "byok-paid",
  availability: async () => ({ available: true }),
  chat: () => ({
    [Symbol.asyncIterator]: () => ({ next: async () => ({ done: true, value: "" }) }),
  }),
  // $3/M input, $15/M output (Sonnet pricing)
  estimateCost: (i, o) => (i * 3 + o * 15) / 1_000_000,
};

describe("estimateSessionCost", () => {
  it("returns Free label for free providers", () => {
    const { usd, label } = estimateSessionCost(1000, 500, freeProvider);
    expect(usd).toBe(0);
    expect(label).toBe("Free");
  });

  it("returns Free label when estimateCost is undefined", () => {
    const noEstimate: ChatBackend = { ...freeProvider, estimateCost: undefined };
    const { label } = estimateSessionCost(1000, 500, noEstimate);
    expect(label).toBe("Free");
  });

  it("returns <$0.001 for tiny paid usage", () => {
    // 10 input + 5 output → $0.000105, well under $0.001
    const { label } = estimateSessionCost(10, 5, paidProvider);
    expect(label).toBe("<$0.001");
  });

  it("returns 4-decimal format for sub-cent costs", () => {
    // 1000 input + 200 output → $0.006 → between 0.001 and 0.01
    const { label } = estimateSessionCost(1000, 200, paidProvider);
    expect(label).toMatch(/^\$0\.\d{4}$/);
  });

  it("returns 3-decimal format for costs above one cent", () => {
    // 10000 input + 1000 output → $0.045 → above 0.01
    const { label } = estimateSessionCost(10_000, 1_000, paidProvider);
    expect(label).toMatch(/^\$0\.\d{3}$/);
  });

  it("usd value is positive for paid usage", () => {
    const { usd } = estimateSessionCost(5_000, 1_000, paidProvider);
    expect(usd).toBeGreaterThan(0);
  });
});

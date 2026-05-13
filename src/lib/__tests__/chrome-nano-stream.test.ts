/**
 * Unit tests for the cumulative/incremental streaming mode detection in
 * chrome-nano.ts. The core algorithm is extracted here as a pure function so
 * we can exercise every branch without needing a real Chrome LanguageModel.
 *
 * Bug history:
 *   The original code set cumulativeMode=true unconditionally on the FIRST
 *   chunk (because accumulated="" and "".startsWith("") is always true).
 *   When Chrome sends incremental chunks, subsequent chunks were sliced by
 *   delta = value.slice(accumulated.length), chopping the beginning of every
 *   word and producing garbled output.
 *
 *   Fix: defer detection to the SECOND chunk, where accumulated is non-empty
 *   and the startsWith check is meaningful.
 */

import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Pure implementation of the streaming algorithm (mirrors chrome-nano.ts)
// ---------------------------------------------------------------------------

function buildReadableStream(chunks: string[]): ReadableStream<string> {
  let i = 0;
  return new ReadableStream<string>({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(chunks[i++]);
      } else {
        controller.close();
      }
    },
  });
}

async function* runStreamingAlgorithm(stream: ReadableStream<string>): AsyncGenerator<string> {
  const reader = stream.getReader();
  let accumulated = "";
  let cumulativeMode: boolean | null = null;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      if (cumulativeMode === null) {
        if (accumulated.length === 0) {
          // First chunk: yield verbatim, record as baseline for mode detection.
          accumulated = value;
          yield value;
          continue;
        }
        // Second-or-later chunk: detect mode.
        cumulativeMode = value.startsWith(accumulated);
      }

      if (cumulativeMode) {
        const delta = value.slice(accumulated.length);
        accumulated = value;
        if (delta) yield delta;
      } else {
        accumulated += value;
        yield value;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function collect(chunks: string[]): Promise<string[]> {
  const out: string[] = [];
  for await (const chunk of runStreamingAlgorithm(buildReadableStream(chunks))) {
    out.push(chunk);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("chrome-nano streaming mode detection", () => {
  describe("incremental mode (Chrome 138+)", () => {
    it("yields each chunk verbatim", async () => {
      const result = await collect(["Hello", " world", "!"]);
      expect(result.join("")).toBe("Hello world!");
      expect(result).toEqual(["Hello", " world", "!"]);
    });

    it("does NOT strip the beginning of later chunks", async () => {
      // This was the bug: "world" was being yielded as "rld" because slice
      // cut off the length of the first accumulated chunk.
      const result = await collect(["Hello", "world"]);
      expect(result).toEqual(["Hello", "world"]);
      expect(result.join("")).toBe("Helloworld");
    });

    it("works with longer realistic output", async () => {
      const words = ["Imagine", " computers", " understand", " tokenizers"];
      const result = await collect(words);
      expect(result).toEqual(words);
      expect(result.join("")).toBe("Imagine computers understand tokenizers");
    });
  });

  describe("cumulative mode (older Chrome builds)", () => {
    it("yields only the new delta on each chunk", async () => {
      // Chrome sends full accumulated text on every chunk.
      const result = await collect(["Hello", "Hello world", "Hello world!"]);
      expect(result).toEqual(["Hello", " world", "!"]);
      expect(result.join("")).toBe("Hello world!");
    });

    it("skips empty deltas", async () => {
      // Duplicate chunk should yield nothing extra.
      const result = await collect(["Hi", "Hi", "Hi there"]);
      expect(result).toEqual(["Hi", " there"]);
    });

    it("works when cumulative chunks share a long prefix", async () => {
      const result = await collect(["The quick", "The quick brown fox"]);
      expect(result).toEqual(["The quick", " brown fox"]);
    });
  });

  describe("edge cases", () => {
    it("single chunk stream yields that chunk once", async () => {
      const result = await collect(["Only chunk"]);
      expect(result).toEqual(["Only chunk"]);
    });

    it("empty stream yields nothing", async () => {
      const result = await collect([]);
      expect(result).toEqual([]);
    });

    it("skips empty string chunks", async () => {
      const result = await collect(["Hello", "", " world"]);
      expect(result).toEqual(["Hello", " world"]);
    });

    it("two-chunk incremental stream detects mode correctly on second chunk", async () => {
      // Second chunk "words" does NOT start with "Hello" → incremental
      const result = await collect(["Hello", " words"]);
      expect(result).toEqual(["Hello", " words"]);
    });
  });
});

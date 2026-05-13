import { describe, expect, it } from "vitest";
import { parseSSE, toProviderError } from "../providers/stream-helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fake Response whose body is a ReadableStream of SSE text. */
function makeSseResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream, { status });
}

async function collectSSE(
  response: Response,
  providerId: "groq" | "anthropic" = "groq",
): Promise<string[]> {
  const results: string[] = [];
  for await (const payload of parseSSE(response, providerId)) {
    results.push(payload);
  }
  return results;
}

// ---------------------------------------------------------------------------
// parseSSE
// ---------------------------------------------------------------------------

describe("parseSSE", () => {
  it("yields payloads from well-formed SSE events", async () => {
    const body = 'data: {"hello":"world"}\n\ndata: {"foo":"bar"}\n\n';
    const res = makeSseResponse([body]);
    const payloads = await collectSSE(res);
    expect(payloads).toEqual(['{"hello":"world"}', '{"foo":"bar"}']);
  });

  it("stops at the [DONE] sentinel", async () => {
    const body = 'data: {"a":1}\n\ndata: [DONE]\n\ndata: {"b":2}\n\n';
    const res = makeSseResponse([body]);
    const payloads = await collectSSE(res);
    expect(payloads).toEqual(['{"a":1}']);
  });

  it("handles events split across multiple chunks", async () => {
    // Split the SSE event across two chunks
    const chunks = ['data: {"x":', "1}\n\n"];
    const res = makeSseResponse(chunks);
    const payloads = await collectSSE(res);
    expect(payloads).toEqual(['{"x":1}']);
  });

  it("ignores lines that don't start with 'data:'", async () => {
    const body = ': keep-alive\n\ndata: {"ok":true}\n\nevent: ping\n\n';
    const res = makeSseResponse([body]);
    const payloads = await collectSSE(res);
    expect(payloads).toEqual(['{"ok":true}']);
  });

  it("throws ProviderError when response has no body", async () => {
    const emptyRes = new Response(null, { status: 200 });
    await expect(collectSSE(emptyRes)).rejects.toThrow("no body");
  });

  it("yields nothing for an empty stream", async () => {
    const res = makeSseResponse([]);
    const payloads = await collectSSE(res);
    expect(payloads).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// toProviderError
// ---------------------------------------------------------------------------

describe("toProviderError", () => {
  it("maps 401 to invalid-key code", async () => {
    const res = new Response("Unauthorized", { status: 401 });
    const err = await toProviderError(res, "groq");
    expect(err.code).toBe("invalid-key");
  });

  it("maps 403 to invalid-key code", async () => {
    const res = new Response("Forbidden", { status: 403 });
    const err = await toProviderError(res, "anthropic");
    expect(err.code).toBe("invalid-key");
  });

  it("maps 429 to rate-limited code", async () => {
    const res = new Response("Too Many Requests", { status: 429 });
    const err = await toProviderError(res, "groq");
    expect(err.code).toBe("rate-limited");
  });

  it("maps 404 to model-unavailable code", async () => {
    const res = new Response("Not Found", { status: 404 });
    const err = await toProviderError(res, "groq");
    expect(err.code).toBe("model-unavailable");
  });

  it("maps unknown status to unknown code", async () => {
    const res = new Response("Server Error", { status: 500 });
    const err = await toProviderError(res, "groq");
    expect(err.code).toBe("unknown");
  });

  it("includes the response body text in the error message", async () => {
    const res = new Response("detailed error message", { status: 500 });
    const err = await toProviderError(res, "groq");
    expect(err.message).toContain("detailed error message");
  });

  it("sets the providerId on the error", async () => {
    const res = new Response("oops", { status: 401 });
    const err = await toProviderError(res, "anthropic");
    expect(err.providerId).toBe("anthropic");
  });
});

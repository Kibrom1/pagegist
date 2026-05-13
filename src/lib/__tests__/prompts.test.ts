import { describe, expect, it } from "vitest";
import { type PageContext, QUICK_ACTIONS, buildSystemPrompt, withPageContext } from "../prompts";

const page: PageContext = {
  title: "Test Article",
  url: "https://example.com/article",
  byline: "Jane Doe",
  content: "This is the article content.",
};

// ---------------------------------------------------------------------------
// buildSystemPrompt
// ---------------------------------------------------------------------------

describe("buildSystemPrompt", () => {
  it("includes the page title", () => {
    expect(buildSystemPrompt(page)).toContain("Test Article");
  });

  it("includes the page URL", () => {
    expect(buildSystemPrompt(page)).toContain("https://example.com/article");
  });

  it("includes the byline when provided", () => {
    expect(buildSystemPrompt(page)).toContain("Jane Doe");
  });

  it("omits the byline line when not provided", () => {
    const noByline: PageContext = { ...page, byline: undefined };
    const prompt = buildSystemPrompt(noByline);
    expect(prompt).not.toContain("Byline:");
  });

  it("includes the page content", () => {
    expect(buildSystemPrompt(page)).toContain("This is the article content.");
  });

  it("includes the PageGist identity instruction", () => {
    expect(buildSystemPrompt(page)).toContain("PageGist");
  });

  it("includes the === PAGE === and === END PAGE === delimiters", () => {
    const prompt = buildSystemPrompt(page);
    expect(prompt).toContain("=== PAGE:");
    expect(prompt).toContain("=== END PAGE ===");
  });
});

// ---------------------------------------------------------------------------
// withPageContext
// ---------------------------------------------------------------------------

describe("withPageContext", () => {
  it("returns exactly two messages: system + user", () => {
    const [system, user] = withPageContext(page, "What is this about?") as [
      ReturnType<typeof withPageContext>[0],
      ReturnType<typeof withPageContext>[0],
    ];
    expect(system.role).toBe("system");
    expect(user.role).toBe("user");
  });

  it("puts the user message as the second message", () => {
    const [, user] = withPageContext(page, "Summarize this") as [
      ReturnType<typeof withPageContext>[0],
      ReturnType<typeof withPageContext>[0],
    ];
    expect(user.content).toBe("Summarize this");
  });

  it("embeds the page context in the system message", () => {
    const [system] = withPageContext(page, "Hello") as [
      ReturnType<typeof withPageContext>[0],
      ReturnType<typeof withPageContext>[0],
    ];
    expect(system.content).toContain("Test Article");
  });
});

// ---------------------------------------------------------------------------
// QUICK_ACTIONS
// ---------------------------------------------------------------------------

describe("QUICK_ACTIONS", () => {
  it("has exactly three actions", () => {
    expect(QUICK_ACTIONS).toHaveLength(3);
  });

  it("contains summarize, explain, and counter ids", () => {
    const ids = QUICK_ACTIONS.map((a) => a.id);
    expect(ids).toContain("summarize");
    expect(ids).toContain("explain");
    expect(ids).toContain("counter");
  });

  it("each action has a non-empty label and description", () => {
    for (const a of QUICK_ACTIONS) {
      expect(a.label.length).toBeGreaterThan(0);
      expect(a.description.length).toBeGreaterThan(0);
    }
  });

  describe("summarize action", () => {
    // biome-ignore lint/style/noNonNullAssertion: test — action is guaranteed to exist
    const action = QUICK_ACTIONS.find((a) => a.id === "summarize")!;

    it("builds a user message regardless of selection", () => {
      expect(action.buildUserMessage({})).toBeTruthy();
      expect(action.buildUserMessage({ selection: "some text" })).toBeTruthy();
    });
  });

  describe("explain action", () => {
    // biome-ignore lint/style/noNonNullAssertion: test — action is guaranteed to exist
    const action = QUICK_ACTIONS.find((a) => a.id === "explain")!;

    it("includes the selection text when provided", () => {
      const msg = action.buildUserMessage({ selection: "quantum entanglement" });
      expect(msg).toContain("quantum entanglement");
    });

    it("falls back gracefully when no selection", () => {
      const msg = action.buildUserMessage({});
      expect(msg).toBeTruthy();
      expect(msg).not.toContain('"""');
    });
  });

  describe("counter action", () => {
    // biome-ignore lint/style/noNonNullAssertion: test — action is guaranteed to exist
    const action = QUICK_ACTIONS.find((a) => a.id === "counter")!;

    it("includes the selection when provided", () => {
      const msg = action.buildUserMessage({ selection: "vaccines cause autism" });
      expect(msg).toContain("vaccines cause autism");
    });

    it("mentions counterarguments", () => {
      const msg = action.buildUserMessage({});
      expect(msg.toLowerCase()).toContain("counterargument");
    });
  });
});

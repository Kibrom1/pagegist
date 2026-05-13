# PageGist — Technical Architecture

**Status:** Design spec for v1 MVP
**Last updated:** May 12, 2026

---

## 1. Overview

PageGist is a Manifest V3 Chrome extension. It runs entirely client-side in Phase 1 — no backend, no auth, no server-side state. Every component lives in the user's browser. AI inference happens either on-device (Chrome Prompt API / Gemini Nano) or directly against a third-party API using the user's own key.

The architecture prioritizes three things, in order:
1. **Zero ongoing infrastructure cost** during the MVP phase
2. **Provider flexibility** — swappable backends behind a single interface
3. **Privacy** — page content never touches a server you operate

---

## 2. Extension Structure (Manifest V3)

```
pagegist/
├── manifest.json
├── public/
│   ├── icon-16.png, icon-48.png, icon-128.png
│   └── _locales/
├── src/
│   ├── background/
│   │   └── service-worker.ts        # Coordinator, message router
│   ├── content/
│   │   └── content-script.ts        # Page content extraction, selection capture
│   ├── side-panel/
│   │   ├── index.html
│   │   ├── main.tsx                 # Sidebar entry point
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── Composer.tsx
│   │   │   ├── QuickActions.tsx
│   │   │   ├── ProviderBadge.tsx
│   │   │   └── TokenCounter.tsx
│   │   └── hooks/
│   │       └── useChat.ts
│   ├── options/
│   │   ├── index.html
│   │   └── Options.tsx              # Settings, API key management
│   ├── onboarding/
│   │   ├── index.html
│   │   └── Onboarding.tsx           # First-run flow
│   └── lib/
│       ├── providers/
│       │   ├── index.ts             # Registry + factory
│       │   ├── chrome-nano.ts
│       │   ├── groq.ts
│       │   ├── anthropic.ts
│       │   ├── openai.ts
│       │   ├── google.ts
│       │   ├── openrouter.ts
│       │   └── ollama.ts
│       ├── chat.ts                  # Unified chat() entry point
│       ├── readability.ts           # Page extraction wrapper
│       ├── storage.ts               # chrome.storage.local abstractions
│       ├── tokens.ts                # Token counting + cost estimation
│       └── prompts.ts               # System prompts, quick-action templates
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. Manifest V3 Configuration

```json
{
  "manifest_version": 3,
  "name": "PageGist",
  "version": "0.1.0",
  "description": "AI marginalia for the modern web.",
  "permissions": [
    "sidePanel",
    "storage",
    "activeTab",
    "scripting"
  ],
  "optional_permissions": [
    "tabs"
  ],
  "host_permissions": [
    "https://api.groq.com/*",
    "https://api.anthropic.com/*",
    "https://api.openai.com/*",
    "https://generativelanguage.googleapis.com/*",
    "https://openrouter.ai/*",
    "http://localhost/*"
  ],
  "background": {
    "service_worker": "src/background/service-worker.ts",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/content-script.ts"],
      "run_at": "document_idle"
    }
  ],
  "side_panel": {
    "default_path": "src/side-panel/index.html"
  },
  "action": {
    "default_title": "Open PageGist"
  },
  "options_ui": {
    "page": "src/options/index.html",
    "open_in_tab": true
  }
}
```

**Permission rationale:**
- `sidePanel` — required for the chat UI
- `storage` — settings, keys (encrypted), chat history
- `activeTab` + `scripting` — content extraction only on user click (Chrome Web Store-friendly)
- `host_permissions` — direct API calls to each provider
- `http://localhost/*` — optional, for the Ollama tier

---

## 4. Component Responsibilities

### 4.1 Service worker (`service-worker.ts`)
- Listens for `chrome.action.onClicked` → opens the side panel
- Routes messages between content script and side panel
- Manages provider initialization and key retrieval
- Handles streaming responses (since side panel can be closed without aborting requests)

### 4.2 Content script (`content-script.ts`)
- Injected on all pages at `document_idle`
- Listens for messages from the side panel: `EXTRACT_PAGE`, `GET_SELECTION`
- Runs Mozilla Readability on demand
- Returns clean article text, title, byline, and URL
- Captures user text selection for the highlight → action flow

### 4.3 Side panel (`side-panel/`)
- React-based chat UI
- Mounts on user click of extension icon
- Pulls page content from content script on first message
- Streams provider responses token-by-token
- Persists conversation history per URL

### 4.4 Options page (`options/`)
- Provider selection (radio: Nano / Groq / Anthropic / OpenAI / Google / Ollama)
- API key input fields (masked, validated)
- Model picker per provider
- Privacy settings (cross-page memory on/off, telemetry on/off)
- Data export / clear all

### 4.5 Onboarding page (`onboarding/`)
- Opens automatically on first install
- Detects Chrome Nano availability
- Branches: "Ready to go" (Nano available) vs. "Quick setup" (Groq signup deep link)
- Three-step walkthrough with the first quick action

---

## 5. Provider Abstraction

All backends conform to one interface. The UI never knows which is in use.

### 5.1 Interface

```ts
// src/lib/providers/index.ts

export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ChatOpts = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};

export type ProviderAvailability =
  | { available: true }
  | { available: false; reason: string };

export interface ChatBackend {
  readonly id: string;          // 'chrome-nano' | 'groq' | 'anthropic' | ...
  readonly displayName: string;
  readonly tier: 'free' | 'byok-free' | 'byok-paid' | 'local';

  availability(): Promise<ProviderAvailability>;
  chat(messages: Message[], opts?: ChatOpts): AsyncIterable<string>;
  estimateCost?(inputTokens: number, outputTokens: number): number;
}

export interface ProviderConfig {
  apiKey?: string;
  endpoint?: string;    // For Ollama / OpenRouter custom routes
  model?: string;
}
```

### 5.2 Unified entry point

```ts
// src/lib/chat.ts

import { getActiveProvider } from './providers';

export async function* chat(
  messages: Message[],
  opts?: ChatOpts
): AsyncIterable<string> {
  const provider = await getActiveProvider();
  const availability = await provider.availability();

  if (!availability.available) {
    throw new ProviderUnavailableError(provider.id, availability.reason);
  }

  yield* provider.chat(messages, opts);
}
```

### 5.3 Provider implementation matrix

| Provider | Endpoint | Auth | Streaming | Schema |
|----------|----------|------|-----------|--------|
| Chrome Nano | `LanguageModel.create()` | None | Native | Web API |
| Groq | `https://api.groq.com/openai/v1/chat/completions` | Bearer | SSE | OpenAI |
| Anthropic | `https://api.anthropic.com/v1/messages` | x-api-key | SSE | Anthropic |
| OpenAI | `https://api.openai.com/v1/chat/completions` | Bearer | SSE | OpenAI |
| Google | `https://generativelanguage.googleapis.com/v1/models/{m}:streamGenerateContent` | API key | SSE | Google |
| OpenRouter | `https://openrouter.ai/api/v1/chat/completions` | Bearer | SSE | OpenAI |
| Ollama | `http://localhost:11434/api/chat` | None | NDJSON | Ollama |

Five of seven providers use the OpenAI chat-completions schema, so a single `streamOpenAICompatible()` helper handles Groq, OpenAI, OpenRouter, and most Ollama setups. Anthropic and Google get their own adapter.

### 5.4 Chrome Nano implementation (reference)

```ts
// src/lib/providers/chrome-nano.ts

export const chromeNano: ChatBackend = {
  id: 'chrome-nano',
  displayName: 'Chrome (Gemini Nano)',
  tier: 'free',

  async availability() {
    if (!('LanguageModel' in self)) {
      return { available: false, reason: 'Prompt API not present in this Chrome version' };
    }
    const status = await LanguageModel.availability();
    return status === 'available'
      ? { available: true }
      : { available: false, reason: `Model status: ${status}` };
  },

  async *chat(messages, opts) {
    const lm = getLanguageModel();
    if (!lm) throw new ProviderError('chrome-nano', 'unavailable', 'Prompt API not present.');

    // Find the last user message — everything before it becomes initialPrompts
    // (preserving system prompt + full conversation history across turns).
    const lastUserIdx = messages.findLastIndex(m => m.role === 'user');
    if (lastUserIdx === -1) throw new ProviderError('chrome-nano', 'unknown', 'No user message.');

    const initialPrompts = messages.slice(0, lastUserIdx);
    const userMessage = messages[lastUserIdx].content;

    const session = await lm.create({
      initialPrompts: initialPrompts.length > 0 ? initialPrompts : undefined,
      signal: opts?.signal,
    });

    try {
      const stream = session.promptStreaming(userMessage, { signal: opts?.signal });
      for await (const chunk of stream) {
        yield chunk;
      }
    } finally {
      session.destroy(); // Always release the session, even on abort.
    }
  },

  estimateCost: () => 0,
};
```

---

## 6. Page Content Extraction

```ts
// src/content/content-script.ts

import { Readability } from '@mozilla/readability';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'EXTRACT_PAGE') {
    const doc = document.cloneNode(true) as Document;
    const article = new Readability(doc).parse();
    sendResponse({
      title: article?.title ?? document.title,
      byline: article?.byline,
      content: article?.textContent ?? document.body.innerText,
      url: location.href,
    });
    return true; // async response
  }

  if (msg.type === 'GET_SELECTION') {
    sendResponse({ text: window.getSelection()?.toString() ?? '' });
    return true;
  }
});
```

**Token-budgeting rule:** truncate extracted content to ~8K tokens before sending to the provider. Expose a "send full page" toggle for the small minority who hit the limit.

---

## 7. Storage Strategy

```ts
// src/lib/storage.ts

const KEYS = {
  providerConfig: 'pagegist:provider-config',
  activeProvider: 'pagegist:active-provider',
  chatHistory: (url: string) => `pagegist:history:${hash(url)}`,
  settings: 'pagegist:settings',
} as const;

// API keys stored under chrome.storage.local with an extra
// layer of obfuscation using the WebCrypto API and a key
// derived from chrome.runtime.id. Not "real" encryption but
// blocks casual exfil from inspecting the extension storage.
```

**What's persisted:**
- Provider configs (one per backend; user can switch)
- Active provider ID
- Chat history per URL (keyed by SHA-256 hash of URL for privacy in storage browser)
- User settings (theme, telemetry opt-in, etc.)

**What's not:**
- Telemetry (off by default; opt-in only)
- Cross-device sync (Phase 2)

---

## 8. First-Run Flow

```
Install
  └─> Open onboarding tab
       └─> Detect Chrome Prompt API
            ├─> Available
            │   └─> "PageGist is ready. Click the extension icon to start."
            │        Default provider: chrome-nano
            │
            └─> Unavailable
                └─> "Your machine doesn't support on-device AI yet.
                     Get a free Groq key in 30 seconds for fast, free responses."
                     ├─> [Sign up at Groq] (deep link)
                     ├─> [Paste key]
                     └─> [Use my own API key (advanced)]
                          └─> Provider picker
```

Onboarding is single-page React, no router — just conditional rendering based on availability check.

---

## 9. Token Counting and Cost Visibility

A small but important UX detail: show the user what each message costs.

```ts
// src/lib/tokens.ts

import { encode } from 'gpt-tokenizer';

export function countTokens(text: string): number {
  return encode(text).length;
}

export function estimateSessionCost(
  inputTokens: number,
  outputTokens: number,
  provider: ChatBackend
): { usd: number; label: string } {
  const usd = provider.estimateCost?.(inputTokens, outputTokens) ?? 0;
  if (usd === 0) return { usd: 0, label: 'Free' };
  if (usd < 0.001) return { usd, label: '<$0.001' };
  return { usd, label: `$${usd.toFixed(4)}` };
}
```

Display: small footer in the side panel — "12.3K tokens · $0.0021 this session." Builds trust, surfaces regressions, lets users compare providers.

---

## 10. Error Handling and Fallback

Providers fail in different ways. Map them to user-actionable states:

| Error | UI state |
|-------|----------|
| No API key configured | "Add your Groq key in settings →" |
| Invalid API key (401) | "Key was rejected. Update it in settings →" |
| Rate limited (429) | "Slow down — Groq's free tier is rate-limited. Try again in 30s." |
| Model unavailable | "Switch model in settings →" |
| Network error | "Couldn't reach the API. Check your connection." |
| Nano not available | Silent: route to fallback provider |

If the primary provider fails and a fallback is configured, the UI offers a "Retry with [fallback]" button rather than auto-switching (preserves user agency).

---

## 11. Build and Distribution

- **Bundler:** Vite + `vite-plugin-web-extension`
- **Type checking:** `tsc --noEmit` in CI
- **Linting:** Biome (replaces ESLint + Prettier; significantly faster)
- **Testing:** Vitest for `lib/`; Playwright for E2E side-panel flows
- **Versioning:** Conventional commits, automated via `changesets`
- **Distribution:** Chrome Web Store (manual review, ~1 week for first submission)

**CI checks before Web Store submission:**
1. Manifest validates against Web Store schema
2. No `console.log` in production bundle
3. No remote-code execution patterns (Web Store auto-rejects)
4. Bundle size < 1MB compressed
5. All host permissions documented in privacy policy

---

## 12. Performance Notes

- **Side panel cold start:** target < 500ms to interactive
- **Page extraction:** < 200ms for articles up to 50KB of HTML
- **First token latency:**
  - Chrome Nano: 100–300ms
  - Groq: 100–500ms (genuinely the fastest hosted provider)
  - Anthropic / OpenAI: 500–1500ms
- **Streaming UX:** render tokens as they arrive; avoid full re-render per chunk (use `MessageEvent` accumulator pattern)

# PageGist — Architecture

## Overview

PageGist is a Chrome MV3 extension. All AI calls go directly from the user's browser to their chosen provider — there is no PageGist server.

## Extension components

```
src/
├── background/service-worker.ts   MV3 service worker: side panel, onboarding, tab events
├── content/content-script.ts      Injected into every page: Readability extraction + selection
├── side-panel/                    React chat UI (the main user-facing surface)
│   ├── App.tsx                    Root component: auto-summarize, quick actions, layout
│   ├── components/                ChatPanel, MessageList, Composer, QuickActions, TokenCounter
│   └── hooks/                     useChat (streaming + history), usePage (tab watching)
├── options/Options.tsx            Settings page: provider picker, API keys, behavior toggles
├── onboarding/Onboarding.tsx      First-run page: Nano detection → Groq fallback
└── lib/
    ├── providers/                 Backend adapters — one file per provider
    │   ├── types.ts               ChatBackend interface + ProviderError
    │   ├── index.ts               Registry: getActiveProvider(), getProvider(id)
    │   ├── chrome-nano.ts         Chrome built-in Prompt API (Gemini Nano)
    │   ├── anthropic.ts           Anthropic Claude (SSE, custom auth headers)
    │   ├── groq.ts                Groq (OpenAI-compatible)
    │   └── stream-helpers.ts      parseSSE(), streamOpenAICompatible(), toProviderError()
    ├── chat.ts                    Unified chat() entry point used by the UI
    ├── prompts.ts                 System prompt + quick action templates (single source of truth)
    ├── storage.ts                 chrome.storage.local wrappers, schema versioning, history
    ├── tokens.ts                  Token counting heuristic + truncateToTokens()
    └── readability.ts             Re-exports ExtractedPage; truncatePageContent() helper
```

## Provider abstraction

Every AI backend implements `ChatBackend` (`src/lib/providers/types.ts`):

```ts
interface ChatBackend {
  readonly id: ProviderId;
  readonly displayName: string;
  readonly tier: 'free' | 'byok-free' | 'byok-paid' | 'local';
  readonly defaultModel?: string;
  readonly supportedModels?: readonly { id: string; label: string }[];
  readonly maxContextTokens?: number;

  availability(): Promise<ProviderAvailability>;
  chat(messages: Message[], opts?: ChatOpts): AsyncIterable<string>;
  estimateCost?(inputTokens: number, outputTokens: number, model?: string): number;
}
```

The UI never imports backends directly — it calls `getActiveProvider()` from the registry.

To add a new provider: create `src/lib/providers/<name>.ts`, implement `ChatBackend`, register it in `index.ts`, and add a config block to `Options.tsx`.

## Data flow

1. User opens side panel → `usePage` requests page extraction from the content script via `chrome.tabs.sendMessage`
2. Content script runs Mozilla Readability on a document clone and returns `ExtractedPage`
3. `useChat` auto-fires the summarize action on first load (once per URL per session)
4. `send()` in `useChat` trims the page content to `min(userBudget, providerBudget)` tokens, builds the API messages array, and streams the response chunk by chunk
5. Completed conversations are persisted to `chrome.storage.local` keyed by SHA-256 hash of the URL

## Storage schema

Keys are namespaced under `pagegist:`. See `src/lib/storage.ts` for the full list.
Schema version is stored at `pagegist:schema-version`; `migrateIfNeeded()` runs on every service worker startup.

## Token counting

Token counts use a fast character/word heuristic (±15% accuracy) rather than a full BPE tokenizer — the `gpt-tokenizer` vocabulary data would add ~2.5 MB to the bundle. Accuracy is sufficient for page truncation and cost display.

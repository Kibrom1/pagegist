# PageGist

> AI marginalia for the modern web. Highlight anything on any page to get explanations, summaries, or counterarguments — without leaving the page.

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Install-blue)](#chrome-web-store-link-coming-soon)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](tsconfig.json)

---

## What is it?

PageGist is a Chrome extension that injects an AI chat sidebar into any webpage. The sidebar has the current page's content as context — so you can highlight a paragraph and ask "what does this mean," "what's the counterargument," or "extract the dates" without copying anything anywhere.

The name comes from "pagegist" — the historical term for an explanatory note written alongside a text. That's what the extension does, just with AI instead of a quill.

## Features

- **Zero-setup default** — Uses Chrome's built-in Gemini Nano (on-device, no API key required) when available
- **Multi-backend** — Swap between Chrome Nano, Groq, Anthropic, OpenAI, Google, OpenRouter, or your local Ollama
- **Page-aware** — Mozilla Readability strips clutter and feeds clean content to the model
- **Quick actions** — Highlight text to summarize, explain, find counterarguments, or extract structured data
- **Per-page history** — Conversations are scoped to URLs and persist across sessions
- **Token visibility** — Real-time cost counter so you always know what each session costs
- **No backend** — All AI calls go directly from your browser to your chosen provider. There's no PageGist server.

## Quick Start

### Install

1. [Install from the Chrome Web Store](#) (Phase 1: pending submission)
2. Open any webpage
3. Click the PageGist icon in your toolbar
4. Highlight text and pick an action — or type a question in the sidebar

### First-time setup

If your machine supports Chrome's built-in Prompt API, PageGist is ready immediately. If not, the onboarding flow guides you through getting a free Groq API key (about 30 seconds, no credit card).

### Bring your own keys

Open the options page from the extension icon and paste keys for any of:

- **Groq** — free tier covers most personal use; sign up at [console.groq.com](https://console.groq.com)
- **Google AI Studio** — generous free tier for Gemini Flash; [aistudio.google.com](https://aistudio.google.com)
- **Anthropic** — pay-as-you-go Claude access; [console.anthropic.com](https://console.anthropic.com)
- **OpenAI** — GPT models; [platform.openai.com](https://platform.openai.com)
- **OpenRouter** — unified access to dozens of models; [openrouter.ai](https://openrouter.ai)
- **Ollama** — local models on your own machine; runs at `localhost:11434`

## Privacy

PageGist is designed to leak as little of your data as physically possible.

- **No backend** — There is no PageGist server. Anywhere.
- **No telemetry** — We don't collect usage data, errors, or analytics by default.
- **Direct API calls** — Your messages go from your browser to the AI provider you picked. We literally cannot see them.
- **Local storage only** — Chat history, API keys, and settings live in `chrome.storage.local`. Clear anytime from the options page.

Full details: [Privacy Policy](https://kibrom1.github.io/pagegist/privacy.html)

The engineering choice underneath it is: build the extension so we have no infrastructure capable of seeing user data, full stop.

## Development

### Requirements

- Node.js 22 or later
- pnpm 9 or later
- Chrome 148+ for testing on-device Gemini Nano

### Setup

```bash
git clone https://github.com/Kibrom1/pagegist.git
cd pagegist
pnpm install
pnpm dev
```

This starts Vite in watch mode and outputs an unpacked extension to `dist/`. To load it into Chrome:

1. Visit `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `dist/` directory

### Build for production

```bash
pnpm build
```

Output ends up in `dist/`. Zip it for Chrome Web Store submission with `pnpm package`.

### Project structure

```
src/
├── background/        # MV3 service worker
├── content/           # Content script (page extraction)
├── side-panel/        # React-based chat UI
├── options/           # Settings page
├── onboarding/        # First-run flow
└── lib/
    ├── providers/     # Backend adapters (one per AI provider)
    ├── chat.ts        # Unified streaming interface
    ├── readability.ts # Mozilla Readability wrapper
    ├── storage.ts     # chrome.storage abstractions
    └── tokens.ts      # Token counting + cost estimation
```

For deeper architecture detail, see [`docs/architecture.md`](docs/architecture.md).

### Adding a new provider

All providers implement the same `ChatBackend` interface:

```ts
export interface ChatBackend {
  readonly id: string;
  readonly displayName: string;
  readonly tier: 'free' | 'byok-free' | 'byok-paid' | 'local';

  availability(): Promise<ProviderAvailability>;
  chat(messages: Message[], opts?: ChatOpts): AsyncIterable<string>;
  estimateCost?(inputTokens: number, outputTokens: number): number;
}
```

To add one:

1. Create `src/lib/providers/<your-provider>.ts`
2. Implement `ChatBackend`
3. Register it in `src/lib/providers/index.ts`
4. Add a config UI block to `src/options/Options.tsx`

Most providers use the OpenAI chat-completions schema — there's a `streamOpenAICompatible()` helper you can wrap.

## Testing

```bash
pnpm test          # Vitest unit tests
pnpm typecheck     # tsc --noEmit
pnpm lint          # Biome
```

## Contributing

PageGist is in early development. Bug reports and PRs welcome.

- **Bug reports** — [GitHub Issues](https://github.com/Kibrom1/pagegist/issues) with reproduction steps
- **Feature requests** — Open an issue tagged `enhancement` first to discuss before opening a PR
- **PRs** — Match the existing code style (Biome enforces this); include tests for new providers

If you want to add a provider but can't write TypeScript, open an issue with the API docs and one of us will pick it up.

## Roadmap

- **v0.1 (current)** — MVP: three providers, three quick actions, per-page history
- **v0.2** — Custom prompt templates, more providers (OpenRouter, Ollama, Google), conversation export
- **v0.3** — Cross-page memory via local embeddings, vault sync to user's cloud storage
- **v0.4** — Optional hosted Pro tier ($5/mo) for users who don't want to manage keys

See [`docs/roadmap.md`](docs/roadmap.md) for details.

## License

MIT. Use it, fork it, ship a competitor — just don't pretend you wrote it from scratch.

## Acknowledgements

- [Mozilla Readability](https://github.com/mozilla/readability) — Page content extraction
- [Chrome built-in AI APIs](https://developer.chrome.com/docs/ai) — On-device Gemini Nano
- [Groq](https://groq.com) — Genuinely fast inference for the free tier upgrade path
- Every other AI extension that walked so this one could iterate on the formula

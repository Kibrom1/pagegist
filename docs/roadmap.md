# PageGist — Roadmap

## v0.1 (current) — MVP

- Chrome MV3 extension with side panel, content script, service worker
- Provider abstraction layer (`ChatBackend` interface)
- Backends: Chrome Nano (Gemini, on-device), Groq BYOK (free), Anthropic BYOK (paid)
- Quick actions: Summarize, Explain, Counterarguments
- Dynamic summary format scaled to page length
- Per-page conversation history via `chrome.storage.local`
- Token counter + cost estimation
- Options page: provider picker, API key input, behavior settings
- First-run onboarding: Nano detection → Groq fallback

## v0.2 — Provider expansion + power features

Trigger: 500+ weekly active users or clear demand signal.

- Additional providers: OpenAI, Google Gemini (AI Studio), OpenRouter, Ollama (local)
- Custom prompt templates and saved quick actions
- Conversation export (Markdown, JSON)
- Cross-page memory via local vector embeddings (IndexedDB)
- Optional sync via user-supplied cloud storage (no backend required)

## v0.3 — Cross-page memory

- Semantic search across all saved conversations
- "What have I read about X?" — query your own browsing history
- Vault sync to user's cloud storage bucket

## v0.4 — Optional hosted Pro tier

Trigger: paying users would unlock a feature not possible without a backend.

- Cloudflare Workers proxy → Groq paid tier
- Stripe metered billing
- $5/month: 500 Llama 70B messages
- $15/month: 2,000 messages + Claude Sonnet access
- Auth via passwordless email or Sign in with Google

**Note:** Free tier stays BYOK. Paid tier = our proxy. No free hosted tier.

## Open decisions

- **Pricing model**: subscription vs. one-time license (Gumroad $9–19)
- **Open source**: MIT-license core + Pro closed source, or fully closed?
- **Cross-page memory**: opt-in (default off) given privacy implications
- **Free tier limits**: trust users to manage BYOK quotas, or soft-cap to nudge upgrades?

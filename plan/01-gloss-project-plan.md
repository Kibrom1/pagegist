# PageGist — Project Plan

**Status:** Pre-build planning
**Working name:** PageGist *(pending availability check on Chrome Web Store, .ai/.com domain, USPTO TM)*
**Owner:** Kibrom
**Last updated:** May 12, 2026
**Target:** MVP shippable in 1–2 weekends

---

## 1. Pitch

> PageGist is an AI sidebar that lives in the margin of every webpage. Highlight anything to explain, summarize, find counterarguments, or extract structured data — without leaving the page. Free by default (on-device Gemini Nano), faster with a Groq key, premium with your own Anthropic key.

The name comes from "pagegist" — the historical term for an explanatory note written alongside a text. That's exactly what the extension does: provides AI-generated marginalia on whatever you're reading.

---

## 2. Concept

A Chrome extension that injects an AI chat sidebar into any webpage. The sidebar has the current page's content as context, so the user can ask questions, get summaries, find counterarguments, extract data, or rewrite selections without leaving the page.

**Core interactions:**
- Highlight text → quick actions menu ("Explain," "Simplify," "Find counterarguments," "Translate")
- Open sidebar → freeform chat with page content pre-loaded as context
- Conversation history per page, optional cross-page memory
- Model picker (free local → BYOK premium)

**Why this idea:**
- Best effort-to-utility ratio of the weekend-project options evaluated
- Genuinely dogfoodable during build — you use it while building
- Same plumbing can fork into vertical extensions later (PR review companion, sales prospecting, research mode)
- Strong demo piece for AI consulting credibility

---

## 3. Target Users (Initial)

- Developers and PMs already using Claude / ChatGPT in a side tab
- Researchers and writers doing source synthesis
- Power users on Hacker News, dev Twitter, r/ClaudeAI, Indie Hackers

This audience self-selects to a technical, AI-curious crowd — which fits the low-marketing-burden filter.

---

## 4. Multi-Backend Tier Strategy

Progressive disclosure — capability scales as user invests setup time.

| Tier | Backend | Setup | Cost to user | Cost to you |
|------|---------|-------|--------------|-------------|
| 1. Default free | Chrome built-in Prompt API (Gemini Nano) | None | $0 | $0 |
| 2. Free upgrade | Groq BYOK (free tier) | ~30 sec signup, paste key | $0 | $0 |
| 2b. Alt free | Google AI Studio BYOK | ~30 sec signup, paste key | $0 | $0 |
| 3. Power user | Local Ollama endpoint | 5+ min, terminal | $0 | $0 |
| 4. Premium BYOK | Anthropic / OpenAI / OpenRouter | Signup + billing | Their API cost | $0 |
| 5. (Future) Hosted | Your proxy → Groq paid | Just install | Subscription price | See cost doc |

**First-run flow:**
1. Detect Chrome Prompt API availability via `await LanguageModel.availability()`
2. If available → "Ready to use, no setup needed." Default to Gemini Nano.
3. If not available → "Get free, faster AI in 30 seconds" → deep link to Groq signup
4. Settings page exposes all providers for users who want to switch

---

## 5. Phased Roadmap

### Phase 1: MVP (1–2 weekends)

**Goal:** Shippable v1 on Chrome Web Store. Zero infra cost. Tests whether anyone wants this.

- [ ] Manifest V3 scaffold + side panel + content script
- [ ] Mozilla Readability integration for page extraction
- [ ] Provider abstraction layer (single `chat()` interface)
- [ ] Backends: Chrome Prompt API + Groq BYOK + Anthropic BYOK
- [ ] Options page: provider picker, key input, model selection
- [ ] First-run onboarding: detect Nano → fall back to Groq signup deep link
- [ ] Token counter in UI (per-session cost visibility)
- [ ] Three quick actions: Summarize, Explain selection, Find counterarguments
- [ ] Persistent chat history per URL in `chrome.storage.local`
- [ ] Privacy policy + Chrome Web Store assets

**Success criteria:** 200 installs from a Show HN post within the first week (realistic case; see Launch Plan §10 for scenario breakdown).

### Phase 2: Expansion (post-validation)

Trigger: 500+ weekly active users OR clear demand signal.

- [ ] Cross-page memory (vector embeddings in IndexedDB)
- [ ] Custom prompt templates / saved actions
- [ ] Additional providers: OpenRouter, Ollama, OpenAI, Google
- [ ] Conversation export (Markdown, JSON)
- [ ] Optional sync via user-supplied cloud storage (no backend still)

### Phase 3: Monetization (only if traction)

Trigger: paying users would unlock a feature you can't ship in MV3 alone.

- [ ] Cloudflare Workers proxy backend with Groq paid tier
- [ ] Stripe metered billing
- [ ] $5/month tier: 500 Llama 70B messages
- [ ] $15/month tier: 2,000 messages + Claude Sonnet access
- [ ] Auth via passwordless email or Sign in with Google

**Note:** Don't run a free hosted tier. Free = BYOK. Paid = your proxy. Clean economics.

---

## 6. Open Decisions

1. **Pricing model** if/when monetized — one-time license ($9–19 via Gumroad) vs. recurring subscription. One-time is simpler; recurring funds ongoing development.
2. **Free tier limits in BYOK flow** — should the extension cap free-tier usage to encourage upgrade, or trust users to manage their own quotas?
3. **Cross-page memory** — opt-in or default-off? Privacy implications.
4. **Open source?** — MIT-license the core and monetize a Pro version, or keep closed? Open source helps HN distribution but limits some monetization paths.
5. **Final brand voice** — see Launch Plan doc for positioning options.

---

## 7. Risk Register

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Chrome Prompt API blocked on user's hardware | High (~30% desktop) | Groq BYOK fallback in onboarding |
| Anthropic / Groq API pricing changes | Medium | Multi-provider abstraction; switch defaults if economics shift |
| Chrome Web Store rejection | Low | Follow MV3 best practices; minimal permissions; clear privacy policy |
| Competitor ships same feature | High | Out-execute on UX; pick a sharper angle for v2 |
| Users won't paste API keys | High | Lead with Gemini Nano (zero setup); make Groq signup feel like 2 clicks |
| Hosted tier costs explode if launched too early | Medium | Stay BYOK until Phase 3; never free hosted |
| "PageGist" name unavailable | Medium | Fallback: Marginalia, Hunch, Pith |

---

## 8. Companion Documents

- `02-pagegist-technical-architecture.md` — Code structure, MV3 setup, provider abstraction
- `03-pagegist-cost-economics.md` — Full pricing analysis, unit economics, break-even
- `04-pagegist-launch-plan.md` — Positioning, Chrome Web Store copy, Show HN draft, distribution
- `05-pagegist-readme.md` — Public README for the eventual repo

---

## 9. Immediate Next Actions

1. **Verify the PageGist name** — Chrome Web Store search, USPTO TESS, domain check (pagegist.ai, getgloss.com)
2. **Scaffold the MV3 project** — `pnpm create vite-plugin-web-extension`
3. **Build provider abstraction** with Chrome Nano + Groq BYOK
4. **Wire side panel + content script + Readability**
5. **Ship to Chrome Web Store** as "early access" with a Show HN launch post

# PageGist — Cost & Economics

**Status:** Reference for financial decisions
**Last updated:** May 12, 2026
**Pricing source:** Provider documentation as of May 2026; verify before commitment.

---

## 1. Provider Pricing Matrix

All prices per million tokens, input / output.

| Provider | Model | Input | Output | Notes |
|----------|-------|-------|--------|-------|
| Chrome | Gemini Nano | Free | Free | On-device, Chrome 148+ desktop |
| Groq | Llama 3.1 8B | $0.05 | $0.08 | Cheapest production option |
| Groq | Llama 3.1 405B | $0.15 | $0.60 | Best quality/cost balance on Groq |
| Groq | Llama 3.3 70B | $0.59 | $0.79 | GPT-4o-class quality |
| Google | Gemini 2.5 Flash-Lite | $0.10 | $0.40 | Cheapest proprietary |
| Google | Gemini 2.5 Flash | $0.15 | $0.60 | 1M context, generous free tier |
| Mistral | Mistral Small | $0.10 | $0.30 | EU-hosted option |
| OpenAI | GPT-4.1 Nano | $0.10 | $0.40 | |
| OpenAI | GPT-4.1 Mini | $0.40 | $1.60 | Good price-quality balance |
| DeepSeek | DeepSeek V3.2 | $0.14 | $0.28 | Best quality-per-dollar |
| Anthropic | Claude Haiku 4.5 | $1.00 | $5.00 | *(version approx.)* |
| Anthropic | Claude Sonnet 4.6 | $3.00 | $15.00 | *(version approx.)* |
| Anthropic | Claude Opus 4.7 | $5.00 | $25.00 | Flagship *(version approx.)* |

**Discount levers:**
- Prompt caching: ~90% off cached input tokens (most providers)
- Batch API: 50% off, but requires async tolerance — not usable for chat
- Groq Developer tier: 25% off all tokens with credit card on file

**Free tier highlights (no credit card):**
- Groq: 1,000 RPD on most models, 14,400 RPD on Llama 3.1 8B
- Google AI Studio: 1,500 RPD, 1M TPM on Gemini Flash
- OpenRouter: DeepSeek R1, Llama 3.3 70B, Gemma 3 free (rate-limited)

---

## 2. Per-Session Cost Model

Standard assumption for all calculations below, unless noted:

- **Page context:** 5,000 input tokens (after Readability extraction)
- **User question:** ~50 input tokens
- **Conversation overhead:** ~200 tokens (system prompt + history)
- **Response:** 500 output tokens
- **Total per session:** ~5,250 input + 500 output

This is a realistic "summarize and follow-up" pattern. Heavier use (multi-turn deep dives) doubles or triples these numbers.

---

## 3. Personal Dogfooding (Phase 1)

You'll be the heaviest user during build. Estimate 30 sessions/day = 158K input + 15K output daily.

| Provider | Daily | Monthly |
|----------|-------|---------|
| Chrome Gemini Nano | $0 | $0 |
| Groq free tier | $0 | $0 (within limits) |
| Groq Llama 8B (paid) | $0.009 | $0.27 |
| Groq Llama 70B (paid) | $0.105 | $3.15 |
| Anthropic Haiku | $0.233 | $7 |
| Anthropic Sonnet | $0.700 | $21 |

Realistic out-of-pocket during build: **$0–$5/month**. Use Groq free tier for dogfooding, occasionally switch to Sonnet/Opus when testing premium-tier features.

---

## 4. Hosted Tier Scenarios (Phase 3 only)

Only relevant if you decide to ship a paid product with a managed backend. Assumes the user does ~10 sessions/day on average (a fraction of users will do far more).

| DAU | Daily sessions | Llama 8B | GPT-OSS 120B | Llama 70B |
|-----|----------------|----------|--------------|-----------|
| 100 | 1,000 | $8/mo | $30/mo | $100/mo |
| 1,000 | 10,000 | $80/mo | $300/mo | $1,000/mo |
| 5,000 | 50,000 | $400/mo | $1,500/mo | $5,000/mo |
| 10,000 | 100,000 | $800/mo | $3,000/mo | $10,000/mo |

**Infrastructure cost on top:**
- Cloudflare Workers proxy: ~$5/month at 100K req/day; ~$20/month at 1M req/day
- Stripe fees: 2.9% + $0.30 per transaction
- Domain + email + misc: ~$20/month

---

## 5. Why a Free Hosted Tier Doesn't Work

Three reasons not to offer a free hosted experience even at low scale:

1. **Groq rate limits are per organization, not per user.** A shared free-tier key gets exhausted by the first handful of users each day.
2. **No abuse prevention** — anyone can hammer your backend without a credit card on file. Auth + per-user rate limits become required infrastructure.
3. **Unit economics are upside-down.** At Groq paid rates with 5K input/500 output sessions, you eat ~$0.0003 per session on Llama 8B. 100 free users doing 50 sessions/day = $45/month. That's tolerable. But abusers and bots can push that 10x quickly, and there's no offsetting revenue.

**Decision: Phase 3 launches paid-only. Free remains BYOK forever.**

---

## 6. Pricing Model Options (Phase 3)

### Option A: One-time license

| Tier | Price | Includes |
|------|-------|----------|
| Personal | $19 one-time | All features, BYOK only, lifetime updates |

- **Pros:** No subscription fatigue, simple billing, Gumroad/Lemonsqueezy handles it, no monthly churn pressure
- **Cons:** No recurring revenue to fund development, no margin for hosted features

### Option B: Subscription (recommended if hosted tier ships)

| Tier | Price | Includes |
|------|-------|----------|
| Free | $0 | All features, BYOK only, Chrome Nano default |
| Pro | $5/month | 500 Llama 70B messages/mo via hosted backend, cross-page memory, priority support |
| Premium | $15/month | 2,000 Llama 70B OR 500 Claude Sonnet messages/mo, all Pro features |

- **Pros:** Funds ongoing development, predictable revenue
- **Cons:** Higher friction to convert, requires backend + auth + billing infrastructure

### Option C: Hybrid (best of both)

- **Free** — BYOK forever, no time limit
- **Pro one-time** — $29 lifetime license unlocks Pro features (custom prompts, cross-page memory, conversation export, priority Web Store updates) but still BYOK
- **Hosted** — separate $5/month tier for users who want to avoid managing keys

Hybrid lets you collect license revenue early without backend complexity, then layer hosted on once you have audience.

---

## 7. Unit Economics for Hosted Pro Tier

Assumes the $5/month Pro tier with 500 Llama 3.3 70B messages/month allowance.

**Cost per Pro user (Groq paid + 25% Developer discount):**
- 500 messages × (5,250 input + 500 output tokens)
- = 2.625M input + 250K output per user/month
- = (2.625 × $0.44) + (0.25 × $0.59)
- = $1.155 + $0.148
- **= ~$1.30/user/month in COGS**

**Margin per Pro user:**
- Revenue: $5.00
- COGS: $1.30
- Stripe fee: $0.45
- Infrastructure (amortized): $0.05
- **Net: $3.20/user/month (64% margin)**

**Break-even on Phase 3 dev investment:**
- Assume Phase 3 takes 80 hours of work at $100/hr opportunity cost = $8,000
- Plus $50/month fixed infra = $600/year
- Need ~225 Pro users to break even on year 1
- Need ~150 Pro users to cover year 2+ ongoing

That's a meaningful but achievable target. Realistic only if Phase 1 hits 5,000+ free users first.

---

## 8. Cost Optimization Levers

If Phase 3 ever feels expensive:

1. **Default Pro to Llama 8B** with optional 70B upgrade. Drops COGS to ~$0.10/user/month, 87% margin.
2. **Prompt caching** on system prompts and page content for follow-up turns — 30–50% reduction on multi-turn sessions.
3. **Per-user rate limits** at the API level. 500 messages/month = ~17/day cap. Smooths usage and prevents abuse.
4. **Mixed routing** — route simple queries (summarize, translate) to Llama 8B; reserve 70B for "find counterarguments" or chat. Auto-classify based on action type.
5. **Cache common page extractions** — same article hit by multiple users? Don't reprocess. Possible v3 optimization.

---

## 9. Sensitivity Analysis

What if Groq prices change? Multi-provider abstraction means you can swap defaults without breaking the product. Realistic scenarios:

| Scenario | Impact | Response |
|----------|--------|----------|
| Groq raises 70B price 50% to $0.89/$1.19 | COGS rises to $1.95/user, margin drops to 56% | Acceptable; or default Pro to GPT-OSS 120B at $0.15/$0.60 |
| Groq removes free tier | Onboarding friction increases | Switch default to Google AI Studio free tier |
| Anthropic Haiku drops to $0.50/$2.50 | Premium tier gets cheaper | Lower Premium price or improve margin |
| Chrome ships Gemini Nano on Android | Mobile becomes viable target | Phase 2 expansion: mobile-optimized side panel |

---

## 10. Bottom Line

- **Phase 1:** Costs you $0–$5/month for personal dogfooding.
- **Phase 2:** Same. No infrastructure added.
- **Phase 3:** Starts at $20–50/month fixed (proxy + domain + email) plus $1.30 COGS per Pro user. Breaks even around 225 Pro subs.

The whole project is designed so you never spend more than your dogfood cost until paying users explicitly fund the next phase.

# PageGist — Launch Plan

**Status:** Pre-launch
**Target launch:** Phase 1 MVP, 2–3 weeks from project start
**Last updated:** May 12, 2026

---

## 1. Positioning

### One-line pitch

**PageGist is AI marginalia for the modern web — explain, summarize, or push back on anything you read, without leaving the page.**

### Why this positioning

The space is crowded (Sider, Monica, ChatHub, Glasp, MaxAI, half a dozen others). Generic "AI assistant" framing will lose. Three angles to choose between — pick one before launch:

**Angle A: The reader's tool.** For people who read a lot online — researchers, analysts, journalists, knowledge workers. Marginalia framing leans here. Emphasizes citation, counterarguments, source critique.

**Angle B: The privacy-first AI sidebar.** Defaults to on-device Gemini Nano. No backend, no telemetry, no key required. Lean into the privacy story hard. Strong differentiator vs. cloud-only competitors.

**Angle C: The developer's AI sidebar.** Code-aware, GitHub/Stack Overflow optimized, supports Ollama for local dev workflows. Narrower audience but deeper engagement.

**Recommendation: Angle A + B as a combined story.** "The AI sidebar that lives in the margin — and never leaves your machine unless you tell it to." This combines an evocative metaphor with a concrete differentiator. Angle C becomes Phase 2 (the PageGist Dev extension or feature flag).

### What we are not

- Not a search replacement (we work *with* what you're already reading)
- Not a writing tool (Phase 2 maybe)
- Not a generic ChatGPT clone (no chat without page context as the default flow)

---

## 2. Brand Voice

**Tone:** Confident, technical, slightly literary. Like a thoughtful editor, not a hype-merchant.

**Yes:**
- "PageGist reads the page, you ask the questions."
- "Marginalia for the modern web."
- "Highlight anything. Get the gist, the counterargument, or the missing context."

**No:**
- "🚀 Supercharge your browsing with AI! ✨"
- "10x your reading speed!!!"
- Emoji-heavy marketing copy
- Anthropomorphic ("PageGist thinks...", "PageGist loves...")

---

## 3. Target Audience Tiers

### Tier 1: Beachhead (first 100 users)

- HN regulars, AI/ML Twitter, r/ClaudeAI, r/LocalLLaMA
- Already use Claude/ChatGPT daily
- Will tolerate BYOK
- Source of feedback, not revenue

### Tier 2: Growth (next 1,000 users)

- Indie Hackers, Product Hunt browsers
- Substack readers, paid newsletter audiences
- Some will pay for Pro features once shipped

### Tier 3: Mainstream (10,000+)

- Researchers, students, knowledge workers
- Want zero-setup experience
- Drive Phase 3 hosted tier revenue
- Reached through SEO, YouTube reviews, word of mouth

---

## 4. Chrome Web Store Listing

### Title (45 char max)

`PageGist — AI Marginalia for the Web`

### Short description (132 char max)

`Highlight anything on any page. Get explanations, summaries, and counterarguments — free on-device, no signup required.`

### Detailed description

```
PageGist is an AI sidebar that lives in the margin of every webpage.

Highlight any text to get:
• A plain-language explanation
• A concise summary
• Counterarguments and missing context
• A structured extraction (dates, names, quotes, citations)

WHY GLOSS

Free by default. PageGist uses Chrome's built-in Gemini Nano model
on your device — no API key, no signup, no data sent to a server.

Bring your own keys for premium quality. Want Claude Sonnet,
GPT-4.1, or Llama 3.3 70B on Groq? Paste your key in settings.
We never see it; calls go directly from your browser to the
provider.

Private by design. PageGist has no backend. We don't track you,
don't collect telemetry, don't see your conversations. Your
chat history stays in your browser, on your machine.

Built for readers. Researchers, journalists, analysts, and
knowledge workers who read a lot online.

WHAT'S DIFFERENT

Most AI sidebars are wrappers around one cloud model. PageGist
gives you a tier system — on-device for free, hosted for free
(BYOK Groq), and premium when you need it. Same UI, swappable
backends.

INSTALL AND START READING

No account. No subscription. Click the icon, highlight some
text, ask a question.
```

### Keywords (5)

`AI sidebar, page summarizer, reading assistant, Claude extension, Groq Chrome`

### Screenshots (5 required)

1. Hero: Side panel open on a long-form article, with "Find counterarguments" response streaming
2. Quick actions: Highlight selection menu over an article paragraph
3. Settings: Provider picker showing Nano / Groq / Anthropic options
4. Privacy: Settings page highlighting "No backend, no telemetry, BYOK"
5. Token counter: Bottom-of-panel UI showing session cost

### Privacy policy (required)

```
GLOSS PRIVACY POLICY

PageGist is designed to collect and transmit as little of your
data as technically possible.

WHAT GLOSS STORES LOCALLY
• Your provider preference (which AI backend to use)
• Your API keys, if you provide them (stored in chrome.storage.local
  with obfuscation; not transmitted anywhere except the provider
  you choose)
• Your chat history, keyed to the URL of the page (stored locally;
  you can clear at any time from the settings page)

WHAT GLOSS SENDS TO THIRD PARTIES
• When you ask a question, the extracted text of the current page
  and your messages are sent to the AI provider you have selected
  (Chrome Nano, Groq, Anthropic, OpenAI, Google, OpenRouter, or
  your local Ollama instance).
• That provider's privacy policy then applies to that data.

WHAT GLOSS DOES NOT DO
• We do not run a backend server. We cannot see your conversations.
• We do not collect telemetry, analytics, or usage data.
• We do not sell, share, or log anything.

QUESTIONS
Contact: [email or GitHub issues link]
```

---

## 5. Show HN Post Draft

### Title

`Show HN: PageGist – AI marginalia for the web (free on-device, BYOK premium)`

### Body

```
Hi HN,

I built PageGist because I kept opening Claude in a side tab to ask
"what does this paragraph mean" and "what's the counterargument
here" about whatever I was reading. The context-switching was
worse than the answers were good.

PageGist is a Chrome extension that puts an AI sidebar next to any
page, with the page content as context. Highlight text to get an
explanation, summary, or pushback inline. The flagship interaction
is "Find counterarguments" — useful for op-eds, marketing copy,
and your own draft writing.

Three things I tried to get right:

1. ZERO SETUP BY DEFAULT. PageGist uses Chrome's built-in Gemini Nano
   (Prompt API, on-device) if available. No key, no signup, no
   backend. Works the moment you install it.

2. MULTI-BACKEND. If Nano isn't available on your machine (or you
   want better quality), paste a Groq key — their free tier covers
   most personal use. Or paste Anthropic / OpenAI / Google /
   OpenRouter / point at your local Ollama. Same UI, swappable
   backend behind a single interface.

3. NO BACKEND I OPERATE. There's no PageGist server. Your conversations
   go directly from your browser to whatever provider you picked.
   I can't see them.

Stack: TypeScript, Manifest V3, React in the side panel, Mozilla
Readability for page extraction, Vite for build.

A few things I'd love feedback on:
- The free → BYOK upgrade flow (does the Groq signup detour feel
  reasonable or is it too much friction?)
- Default angle: is "marginalia for readers" too narrow, or does
  it differentiate enough?
- Should I open-source it? Leaning yes for the core, but worried
  about how that interacts with a future hosted tier.

[Web Store link]
[GitHub link if open-sourced]
[Privacy policy]

Happy to answer anything.
```

### When to post

Tuesday or Wednesday, 9–11 AM Pacific. Avoid Mondays (drowned) and Fridays (low engagement).

### How to handle comments

- Reply to every top-level comment in the first 4 hours
- Don't argue with critics — note the feedback, thank them, move on
- Pin a comment with the link to the GitHub repo and a TL;DR of what's changed since the post if it's still on the front page after 12 hours

---

## 6. Distribution Channels (Phase 1)

In priority order:

1. **Show HN** — single biggest potential spike, fits audience perfectly
2. **r/ClaudeAI, r/LocalLLaMA, r/chrome_extensions** — niche but engaged
3. **AI Twitter / X** — thread, tag a few relevant accounts (no @-spam)
4. **Indie Hackers** — "I built this in a weekend" post
5. **Product Hunt** — Phase 2 launch, save for when there's a story to tell beyond "it works"
6. **Personal network** — LinkedIn post focused on AI consulting angle

**Channels to skip in Phase 1:** TikTok, Instagram, paid ads, influencer outreach. Wrong audience, bad ROI for a BYOK technical product.

---

## 7. Pre-Launch Checklist

### Tech
- [ ] All three Phase 1 providers (Nano, Groq, Anthropic) working end-to-end
- [ ] Onboarding tested with Nano available and unavailable
- [ ] API keys are stored with obfuscation, not plaintext
- [ ] Token counter shows accurate session cost
- [ ] Clear "Reset all data" button in settings
- [ ] Privacy policy hosted at a stable URL
- [ ] Manifest V3 passes Web Store policy checks

### Store assets
- [ ] All 5 screenshots taken at 1280×800
- [ ] Icon set: 16, 48, 128 px
- [ ] Promo tile (440×280) for Web Store featuring
- [ ] Detailed description proofread
- [ ] Privacy policy URL working

### Marketing assets
- [ ] Landing page or GitHub README polished
- [ ] Show HN draft reviewed by one other person
- [ ] Twitter thread drafted (5–7 tweets)
- [ ] LinkedIn post drafted
- [ ] 30-second demo video (Loom is fine for Show HN; GIF for Twitter)

### Operations
- [ ] Support email or GitHub issues link ready
- [ ] Plan for handling bug reports during launch surge
- [ ] First-day metrics dashboard (just Web Store install count is fine)

---

## 8. Launch Day Plan

**T-1 day:** Post a "tomorrow at 10am Pacific" tweet to your network. Pre-warm.

**T+0 (launch morning):**
- 9:30 AM PT: Submit Show HN
- 9:45 AM PT: Post Twitter thread
- 10:00 AM PT: Cross-post to relevant subreddits
- 10:30 AM PT: Indie Hackers post
- 11:00 AM PT: LinkedIn post

**Hours 1–4:** Reply to every HN comment. This is the entire job for those four hours.

**Hour 4+:** Step back, breathe, monitor metrics. Don't ship code on launch day.

---

## 9. Metrics to Watch

### Week 1
- Chrome Web Store installs
- Daily active users (DAU)
- Provider distribution (% on Nano vs. Groq vs. Anthropic)
- Retention: % of installers who use PageGist again on day 2, day 7
- Show HN points + comments
- GitHub stars (if open source)

### Week 2–4
- WAU/DAU ratio (1.5–2.0 is healthy)
- Average sessions per WAU
- Provider conversion rates (Nano → Groq → Premium)
- Bug reports / feature requests volume

### Trigger metrics for Phase 2 work
- 500 WAU sustained for 2 weeks
- Retention day-7 > 30%
- At least 5 unsolicited "would pay for X" comments

---

## 10. What Success Looks Like

### Realistic Week 1
- 200–500 installs from Show HN
- 50–100 stick around past day 2
- 10–20 GitHub stars
- 3–5 quality feature requests

### Optimistic Week 1
- 2,000+ installs from a front-page Show HN
- 500+ DAU at end of week
- Product Hunt features PageGist organically
- A few influential AI Twitter accounts post about it

### Honest worst-case
- 50 installs, 5 stick around
- Confirms the niche is too narrow or execution is off
- Take feedback, iterate, relaunch in 4 weeks with a clearer angle

The honest worst-case is still cheap. The whole project costs you weekends and ~$5 in Anthropic dogfood usage. Even a "failure" leaves you with the multi-provider abstraction, MV3 know-how, and a portfolio piece for AI consulting work.

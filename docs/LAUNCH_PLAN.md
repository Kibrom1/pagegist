# PageGist — Post-Submission Launch Plan

> **Status:** Submitted to Chrome Web Store. Awaiting review approval (typically 1–3 business days, up to 7 for new accounts).

---

## Phase 1 — While Waiting for Approval

**Goal:** Have everything ready so launch day is execution, not preparation.

### 1.1 Draft the Show HN post

File: `LAUNCH_PLAN_ASSETS.md` (see below, or write directly in this doc)

```
Title:
Show HN: PageGist – AI reading companion for any webpage (no backend, BYOK, on-device Nano)

Body:
PageGist is a Chrome sidebar extension that lets you ask questions about any page you're
reading — summaries, explanations, counterarguments, or freeform chat.

What I focused on technically:
- Gemini Nano (on-device, Chrome 138+) as the free default — no API key needed
- BYOK support for Groq, OpenAI, Anthropic, Google AI, OpenRouter, and local Ollama
- API keys are XOR-obfuscated with chrome.runtime.id before being written to storage
- No backend — all inference goes directly from the extension to whichever provider the user chooses
- Full MV3 compliance: service worker, no remote code execution
- Built with React + Vite + TypeScript; 62 unit tests

The extension uses Mozilla Readability to extract clean article text so the AI gets signal,
not nav menus and ads.

Chrome Web Store: [link]
GitHub: [link]

Happy to answer questions about the MV3 architecture or the on-device AI integration.
```

**Post time:** Tuesday–Thursday, 9–11 am ET. Have the CWS and GitHub links ready to paste.

---

### 1.2 Draft the ProductHunt listing

```
Name: PageGist
Tagline: Think deeper about what you read — AI marginalia for any webpage
Topics: Chrome Extensions, Artificial Intelligence, Productivity, Reading

Description:
PageGist adds an AI sidebar to every page you visit. Highlight text for instant
explanations, ask follow-up questions, get summaries, or stress-test ideas with
counterarguments — without leaving the tab.

Free to use with Gemini Nano (runs fully on-device in Chrome 138+). Bring your own key
for Groq, OpenAI, Anthropic, Google AI, OpenRouter, or local Ollama. Zero backend,
zero signup.

Maker comment (post this as your first comment on launch day):
"Built this because I kept copy-pasting paragraphs into ChatGPT to understand what I was
reading. Felt like the AI should just... be next to the page. Happy to answer anything
about the architecture or the on-device Nano integration."
```

**Launch day:** Tuesday, Wednesday, or Thursday. Never Monday or Friday.
First-hour upvotes matter most — line up 5–10 people to upvote within the first 60 minutes.

---

### 1.3 Prepare Reddit posts (three separate versions)

**r/chrome**
```
Title: I built a Chrome extension that adds an AI sidebar to any webpage — no backend, no signup

Body: [brief description + CWS link + screenshot GIF if possible]
```

**r/ChatGPT / r/LocalLLaMA**
```
Title: Built a reading companion extension — BYOK for OpenAI/Anthropic/Groq, or free Gemini Nano on-device

Body: Focus on the provider flexibility and the on-device privacy angle
```

**r/productivity**
```
Title: Stop copy-pasting articles into ChatGPT — built a sidebar that brings AI to the page

Body: Focus on the reading workflow and time saved
```

---

### 1.4 Capture a real screenshot or GIF

The mockups in the store are good, but a GIF of the actual extension working on a real article (NYT, Wired, Ars Technica) converts better for social posts. Record a 10–15 second clip:
1. Open an article
2. Click the PageGist icon
3. Hit "Summarize"
4. Watch the response stream in

Tools: QuickTime screen recording → GIPHY Capture or `ffmpeg` to convert to GIF.

---

## Phase 2 — Launch Day

**Checklist (do in this order):**

- [ ] Confirm CWS listing is live and the install button works
- [ ] Post Show HN
- [ ] Post to r/chrome
- [ ] Post to r/ChatGPT or r/LocalLLaMA
- [ ] Share on any personal Twitter/X or LinkedIn
- [ ] Reply to every comment on HN within the first 2 hours

**Do not** launch ProductHunt the same day as Show HN. Space them 2–3 days apart so you get two distinct traffic spikes.

---

## Phase 3 — First Two Weeks

### 3.1 Monitor and respond

- Check CWS developer dashboard daily for reviews and ratings
- Reply to every 1- or 2-star review within 24 hours — this signals active maintenance to prospective users
- Watch the GitHub repo for issues; first-week bugs are common and fast fixes build trust

### 3.2 ProductHunt launch (Day 3–5 after CWS goes live)

- Use the draft from Phase 1.2
- Schedule for Tuesday–Thursday
- Post at 12:01 am PT (ProductHunt day resets at midnight PT)
- Share the PH link immediately on HN, Reddit, and anywhere you have an audience

### 3.3 Extension-specific directories

Submit to:
- **AlternativeTo** — add PageGist as an alternative to Monica, Merlin, Sider
- **There's An AI For That** (theresanaiforthat.com) — submit as a reading/research tool
- **Extension directories** — ExtensionsList.com, ChromeStats.com

These are low-effort, permanent inbound links that help CWS search ranking over time.

---

## Phase 4 — 30-Day Growth

### 4.1 Watch what users actually do

After ~50 installs you'll have enough signal to answer:
- Which quick action (Summarize / Explain / Counterargument) gets used most?
- Which AI provider do most users pick?
- Are users asking follow-up questions, or just using the one-click actions?

Use this to decide what to build next.

### 4.2 Likely first feature requests

Based on similar tools, expect requests for:
- **Save / export** — "Can I save this summary to Notion / clipboard?"
- **Custom prompts** — "Can I add my own quick actions?"
- **History** — "Can I see summaries I ran last week?"
- **PDF support** — works on some PDFs already, but users will ask for better handling

Prioritize based on CWS reviews and GitHub issues, not assumptions.

### 4.3 Review cadence

Aim for one small release every 1–2 weeks in the first month. Frequent updates:
- Push the extension higher in CWS search (update recency is a ranking signal)
- Give you a reason to post again ("v0.2 — now with custom prompts")
- Show reviewers the extension is actively maintained

---

## Reference — Focus Guard Benchmark

Your previously published "Focus Guard" extension reached **50 installs** organically over 30 days with 1,566% period-over-period growth. That's the baseline for an unannounced launch.

PageGist has a broader target audience and a planned Show HN + ProductHunt launch, so the realistic first-30-day target with those channels is **200–500 installs**. HN alone can drive 100–300 installs on a good day if the post lands on the front page.

---

## Key Links (fill in once live)

| Resource | URL |
|---|---|
| CWS listing | _pending_ |
| GitHub repo | https://github.com/Kibrom1/pagegist |
| Privacy policy | https://kibrom1.github.io/pagegist/privacy.html |
| ProductHunt listing | _pending_ |

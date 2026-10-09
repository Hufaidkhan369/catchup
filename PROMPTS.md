# Prompt log — CatchUp (Hackathon)

This file records the chat prompts exchanged between the participant and the AI
coding assistant while building CatchUp. It is included for transparency, as
requested for the submission.

---

## Prompt 1 — Problem statement

> "this is the problem statement that has been given to me in a hackathon the
> first image is of the problem statement and the other 2 is about what to do
> in the hackathon like i need to create a git repo and push the changes and
> also make a prompt file inside the repo that would have all the prompt chats
> between us"

**Problem statement text:**

> Build a local-first AI micro-app called "CatchUp" that solves "The Unread
> Problem: What Did I Miss?"
>
> CORE FEATURES
> 1. Chat import: paste text or upload a WhatsApp/Telegram/Slack export
>    (.txt/.json). Parse sender, timestamp, message. Include a "load demo chat"
>    button with a realistic 150+ message group chat (college project team)
>    containing deadlines, decisions, @mentions, and noise.
> 2. Summary: short TL;DR plus a topic-wise breakdown.
> 3. Key extraction: decisions, action items (task, owner, deadline), important
>    announcements.
> 4. Priority scoring: High / Medium / Low using urgency and relevance
>    (mentions of the user, their tasks).
> 5. "You may have missed" panel: @mentions, questions, upcoming deadlines,
>    unanswered requests.
> 6. User profile: name/handle for personalised relevance.
> 7. Filters and tools: filter by priority/type/sender; search; mark action
>    items done; export summary as text or markdown.
>
> NEW FEATURES
> 8. Catch-up window "Since I was last online" (1h/6h/24h/custom) + unread
>    divider.
> 9. Explainable priority: "Why?" tooltip for each badge.
> 10. Decision updates: detect changed decisions/deadlines; show latest only,
>     with history on tap.
> 11. Message context viewer: tap item → original message ±3, highlighted.
> 12. Smart reply drafts: 2-3 on-device reply suggestions with copy button.
>
> PRIVACY (must-have)
> - All processing local. No data leaves the device. No backend/API/analytics.
> - On-device AI: Gemini Nano or WebLLM / Transformers.js, with rule-based
>   fallback. Show which engine is active.
> - "100% on-device" badge + offline indicator. In-memory or IndexedDB storage,
>   with "clear all data".
> - Mask OTPs, phone numbers, card numbers in summaries/exports.
>
> UX
> - Clean, mobile-friendly, single-page UI, light/dark mode.
> - Summary card on top; tabs for Priority, Action Items, Decisions, Mentions.
> - Color-coded badges, expandable items, loading/empty/error states.
>
> TECH
> - React + Tailwind (or single HTML), TypeScript preferred. Chunk long chats,
>   modular code, README.
>
> OUTPUT
> - Complete runnable code, setup steps, 3 extension ideas (voice digest,
>   multi-chat inbox, smart notifications).

---

## Prompt 2 — Clarifying details (the three images)

> "ill tell what the images tell some parts are unnecesceary [sic]"

The participant relayed the image content:

- **Image 1 (Challenge):** Build a simple AI micro-app to quickly understand
  and prioritise information from overwhelming chats — summarising long/unread
  conversations, identifying decisions/action items, prioritising by urgency
  and relevance, highlighting mentions/deadlines/missed items, all using
  local-first processing so nothing leaves the device.
- **Image 2 (Submission/Evaluation):** Submit a **public GitHub repo link**, a
  **deployed project link**, a brief project description, and mention **which
  Gen AI services were used & where**. Automatic code assessment scores:
  code quality, security, efficiency, testing, accessibility, and problem
  statement alignment. Up to 3 scored submissions.
- **Image 3 (Impact + disqualification):** Parameters weighting
  (UI/UX polish High, Security Medium, Innovation Medium, Testing Low,
  Accessibility Medium, Code quality & modular structure High, Documentation
  Low, meaningful Git commits Medium). **Disqualifiers:** static/hardcoded
  pages, mock/fake data presented as real output, hallucinated AI responses,
  features that fail end-to-end evaluation. Tip: make every feature actually
  work; make real AI calls; test as an evaluator.

> "Important for your project: the 'Tips' slide says mock data, hardcoded pages,
> and fake AI responses get you disqualified. So your app must make real
> on-device AI calls, and the demo chat should only be sample input, not fake
> output. keep in mind the previous thing i told you"

---

## Prompt 3 — Setup decisions

> "Where should I create the new CatchUp project?" → **answered: New 'CatchUp'
> folder in current workspace (Recommended)** (own git repo, pushed separately)
>
> "How should I build it?" → **answered: Vite + React + TypeScript + Tailwind
> (Recommended)** (modular, testable, documented)

---

## Assistant actions summary (for the repo history)

1. Scoped a fresh Vite + React + TS + Tailwind project under `CatchUp/` with its
   own git repo (required `gh auth login` note — token was invalid on this
   machine).
2. Implemented the full pipeline: parser, demo chat (150+ messages), extractor,
   explainable priority, decision-update resolution, chunked summariser, on-device
   AI engines (Gemini Nano → WebLLM → rule-based), reply drafts, redaction,
   IndexedDB storage, exports.
3. Built the UI: header badges (on-device/offline/engine), profile & import
   panels, catch-up window picker, summary card, tabs, filters, item cards with
   Why? tooltips and context viewer, chat view with unread divider, light/dark
   mode.
4. Wrote 44 unit tests (parsing, privacy, time, priority, extraction, decision
   updates, summarisation, demo integrity) — all passing; production build green.
5. Added README (architecture + setup + 3 extension ideas), LICENSE, GitHub
   Pages CI, and this prompt log.

## Known setup steps for the participant

```bash
# 1. Create the GitHub repo (empty, public), then:
cd "CatchUp"
gh auth login            # or use a PAT if gh is not authenticated
git remote add origin https://github.com/<you>/<catchup-repo>.git
git push -u origin main

# 2. Deploy
#    - Enable GitHub Pages -> "GitHub Actions" (workflow included), or
#    - Import the repo into Vercel/Netlify (build: npm run build, out: dist).

# 3. Try it
npm install && npm run dev   # Load demo chat -> Analyse -> explore tabs
```
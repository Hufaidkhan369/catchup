# Gugli AI — Project Prompt

Build and improve **Gugli AI**, a local-first web app that helps people catch up on busy group chats. The central task is to help someone answer: **“What did I miss, and what should I do next?”**

## Product experience

- Make the interface approachable, clear, and responsive on phones and desktop.
- Use a WhatsApp-inspired chat workspace: familiar conversation surfaces, warm chat wallpaper, readable message bubbles, and a friendly green palette. Keep Gugli AI's own identity; do not present the app as WhatsApp or imply an affiliation.
- Provide distinct, easy-to-find tabs for Home, Summary, Important, To-dos, Decisions, Mentions, Messages, and My profile.
- Give every screen a useful empty state and a clear next step. Make unread summarization easy to find and show progress and a visible result when it completes.

## Core capabilities

- Import exported WhatsApp or Telegram text chats and Slack JSON exports, or paste chat text; include a clearly labeled demo chat.
- Parse senders, timestamps, messages, and system events.
- Summarize recent or unread messages with a concise overview and topic breakdown. Chat exports do not include read receipts, so let the user choose the last message they read and treat subsequent messages as unread.
- Identify important messages, explain their High / Medium / Low priority, and extract decisions, announcements, action items, direct mentions, and questions.
- Let users filter and search extracted items, mark action items complete, inspect surrounding message context, and export or copy summaries.
- Personalize relevance with a user profile, while keeping every feature understandable and accessible.

## Privacy and implementation requirements

- Process imported conversations and summaries in the browser. Do not send chat content to a server, analytics service, or third-party API.
- Store app data locally and provide a clear-data control. Mask sensitive numbers in summaries and generated replies.
- Keep the existing React, TypeScript, and Vite architecture. Prefer small, maintainable changes and reuse existing analysis and storage logic instead of adding a backend.
- Preserve accessibility: semantic controls, keyboard navigation, visible focus, sufficient contrast, and reduced-motion support.
- Do not claim automatic access to a messaging account, live message syncing, or read-receipt detection. The user supplies an exported conversation.

When making changes, keep Gugli AI's local-first privacy promise accurate, make the primary task obvious, and verify that the production build succeeds.

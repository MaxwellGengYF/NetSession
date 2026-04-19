# Chat-Box Interactive Code Reference

## Overview

This document maps the interactive JavaScript/TypeScript code that powers the chat-box UI across the project. All TODO comments added during analysis are summarized below.

---

## File Inventory

| File | Purpose | Lines |
|------|---------|-------|
| `src/components/ChatArea.tsx` | Message rendering, input handling, AI simulation | 337 |
| `src/App.tsx` | App shell, message routing, AI role detection | 68 |
| `src/hooks/useConversations.ts` | Conversation state, messages, window API | 183 |
| `src/components/Sidebar.tsx` | Conversation list, switching, creation, deletion | 165 |
| `src/types/conversation.ts` | Domain types and global window declarations | 35 |

---

## `src/components/ChatArea.tsx`

### Interactive Blocks

1. **`handleSend` (lines ~60–76)**  
   Captures textarea input, clears the field, and simulates an AI response after 800 ms.  
   **TODO added:** Replace simulated AI response with real API integration.

2. **`handleKeyDown` (lines ~78–84)**  
   Traps `Enter` (without `Shift`) to trigger `handleSend`.  
   **TODO added:** Add keyboard shortcuts for quick actions and accessibility.

3. **`handleQuickAction` (lines ~86–95)**  
   Sends a pre-defined prompt and mirrors the same AI simulation logic as `handleSend`.  
   **TODO added:** Deduplicate AI response simulation logic shared with `handleSend`.

4. **Markdown/Code rendering (lines ~192–231)**  
   Splits message content on triple back-ticks to render inline code blocks with a language header and `<pre>` block.  
   **TODO added:** Extract markdown rendering into a reusable component.

5. **Textarea input (lines ~302–317)**  
   Controlled `<textarea>` with focus/blur state driving border color and box-shadow changes.  
   **TODO added:** Add auto-resize and file attachment support to textarea.

6. **Send button (lines ~319–330)**  
   Gradient-enabled when `inputValue.trim()` is truthy; disabled otherwise.

---

## `src/App.tsx`

### Interactive Blocks

1. **`handleSendMessage` (lines ~21–37)**  
   Receives content from `ChatArea`, applies a heuristic (`length > 100` or contains `` ``` ``) to guess whether the content is an AI response, then calls `addMessage` with role `'assistant'` or `'user'`.  
   **TODO added:** Refactor AI detection heuristic; use explicit role from API response.

---

## `src/hooks/useConversations.ts`

### Interactive Blocks

1. **`useConversations` hook (lines ~60–184)**  
   Manages `conversations` array, `activeConversationId`, and listener refs for external subscriptions. Provides CRUD actions: `createConversation`, `destroyConversation`, `switchConversation`, `addMessage`.

2. **Persistence gap (line ~60)**  
   State lives only in React memory; no localStorage or backend sync.  
   **TODO added:** Persist conversations to localStorage or backend API.

3. **Window API exposure (lines ~141–172)**  
   Attaches a `ConversationFlow` object to `window` so external scripts can drive the app imperatively.  
   **TODO added:** Remove global window API or secure it before production release.

---

## `src/components/Sidebar.tsx`

### Interactive Blocks

1. **Conversation switching (lines ~76–93)**  
   `onClick` switches active conversation; `onMouseEnter`/`onMouseLeave` toggle hover background.

2. **Dropdown menu (lines ~115–138)**  
   Toggled via local `menuOpenId` state; contains a delete action.  
   **TODO added:** Close dropdown on outside click and add keyboard navigation.

3. **New Chat button (lines ~47–57)**  
   Calls `onCreateConversation` to append a blank conversation and activate it.

---

## `src/types/conversation.ts`

### Key Types

- `Message` – id, role, content, timestamp, optional suggestions.  
- `Conversation` – id, title, messages[], createdAt, updatedAt.  
- `ConversationAPI` – shape of the imperative API exposed on `window.ConversationFlow`.

---

## Summary of TODOs Added

| # | File | Line | TODO |
|---|------|------|------|
| 1 | `ChatArea.tsx` | ~68 | Replace simulated AI response with real API integration |
| 2 | `ChatArea.tsx` | ~78 | Add keyboard shortcuts for quick actions and accessibility |
| 3 | `ChatArea.tsx` | ~88 | Deduplicate AI response simulation logic shared with `handleSend` |
| 4 | `ChatArea.tsx` | ~192 | Extract markdown rendering into a reusable component |
| 5 | `ChatArea.tsx` | ~302 | Add auto-resize and file attachment support to textarea |
| 6 | `App.tsx` | ~21 | Refactor AI detection heuristic; use explicit role from API response |
| 7 | `useConversations.ts` | ~60 | Persist conversations to localStorage or backend API |
| 8 | `useConversations.ts` | ~141 | Remove global window API or secure it before production release |
| 9 | `Sidebar.tsx` | ~115 | Close dropdown on outside click and add keyboard navigation |

---

## Session Lifecycle Analysis

### `src/hooks/useConversations.ts`

1. **`createConversation` (lines ~75–92)**  
   Generates a new `Conversation` object with a timestamp-based ID, prepends it to the state array, and auto-activates it.  
   **TODO added:** Validate title input and prevent duplicate session names.

2. **`destroyConversation` (lines ~94–107)**  
   Filters the target conversation out of state. If the destroyed session was active, it falls back to the first remaining conversation (or `null`).  
   **TODO added:** Add confirmation dialog and support soft-delete / archiving before removal.

### `src/components/Sidebar.tsx`

1. **New Chat button (lines ~48–58)**  
   UI trigger that calls `onCreateConversation` prop, creating a blank session immediately.  
   **TODO added:** Allow template selection or prompt before creating a new session.

2. **Delete button (lines ~125–137)**  
   Dropdown menu item that calls `onDestroyConversation(conv.id)` without any confirmation.  
   **TODO added:** Add a confirmation modal before destroying the session.

### `src/App.tsx`

1. **Props wiring (lines ~47–49)**  
   `createConversation` and `destroyConversation` are pulled from `useConversations()` and passed into `<Sidebar>` as callbacks.

---

## Summary of TODOs Added (Session Lifecycle)

| # | File | Line | TODO |
|---|------|------|------|
| 10 | `useConversations.ts` | ~75 | Validate title input and prevent duplicate session names |
| 11 | `useConversations.ts` | ~94 | Add confirmation dialog and support soft-delete / archiving before removal |
| 12 | `Sidebar.tsx` | ~48 | Allow template selection or prompt before creating a new session |
| 13 | `Sidebar.tsx` | ~125 | Add a confirmation modal before destroying the session |

---

*Generated by code analysis.*

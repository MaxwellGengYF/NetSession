# TODOs, Risks & Improvement Vectors

## 1. Extracted TODOs (from source code)

| TODO | File | Context |
|------|------|---------|
| Persist conversations to localStorage or backend API | `useConversations.ts:60` | State is ephemeral; refresh loses all chats |
| Validate title input and prevent duplicate session names | `useConversations.ts:76` | No input validation on `createConversation` |
| Add confirmation dialog and support soft-delete / archiving before removal | `useConversations.ts:96` | `destroyConversation` is immediate hard-delete |
| Remove global window API or secure it before production release | `useConversations.ts:163` | `window.ConversationFlow` is a security surface |
| Extract markdown rendering into a reusable component | `ChatArea.tsx:244` | Inline markdown parser inside ChatArea |
| Add auto-resize and file attachment support to textarea | `ChatArea.tsx:388` | Textarea is fixed 1 row, no file upload |
| Allow template selection or prompt before creating a new session | `Sidebar.tsx:45` | "New Chat" immediately creates blank convo |
| Close dropdown on outside click and add keyboard navigation | `Sidebar.tsx:113` | Conversation menu stays open, no Escape handler |
| Add a confirmation modal before destroying the session | `Sidebar.tsx:124` | Delete button is single-click destructive |

## 2. Security Risks

| Risk | Severity | Details |
|------|----------|---------|
| **Global window API** | High | Any third-party script can create/delete/switch conversations via `window.ConversationFlow` |
| **No input sanitization** | Medium | User messages are rendered with inline HTML splitting (```). XSS possible if backend returns malicious HTML |
| **No auth / session tokens** | Medium | TCP and WebSocket endpoints accept any connection |
| **Hardcoded localhost URLs** | Low | `ws://127.0.0.1:8889` prevents remote deployment without rebuild |
| **Python 3.14 requirement** | Low | Very new Python version; may limit deployment targets |

## 3. Architecture Risks

| Risk | Severity | Details |
|------|----------|---------|
| **Global singleton WebSocket** | Medium | Shared state across all `useRpcSocket` consumers can leak between tests and cause cross-tab interference |
| **Order-dependent pending queue** | High | JSON-RPC responses matched by queue position, not strict `id` index lookup |
| **Polling for assistant responses** | Medium | 500ms poll loop is inefficient; server-push via WebSocket would be cleaner |
| **Thread-per-request in backend** | Low | `input_from_client` spawns unbounded threads; no thread pool limit for RPC workers |
| **No request timeout** | Medium | `sendRequest` can hang indefinitely if response is lost |

## 4. Performance Notes

- **Large conversation lists**: `conversations` array is fully mapped on every render; no virtualization.
- **Message re-renders**: Every new message triggers full `ChatArea` re-render; `React.memo` not applied.
- **CSS-in-JS hybrid**: Mix of Tailwind classes and inline `style` objects prevents some Tailwind JIT optimizations.
- **Font loading**: Google Fonts loaded synchronously in `<head>`; can block first paint on slow networks.

## 5. Improvement Vectors

### Short Term (Quick Wins)
1. **Add `localStorage` persistence** to `useConversations` (serialize on change, hydrate on mount).
2. **Fix pending queue matching** in `useRpcSocket` — use a `Map<number, Pending>` keyed by `id`.
3. **Add confirmation modal** before delete (shadcn Dialog already available).
4. **Close dropdown on outside click** — use a `useClickOutside` hook.
5. **Extract MarkdownRenderer** component from ChatArea.

### Medium Term
1. **Replace polling with server-push** — stream assistant chunks directly over WebSocket instead of `get_output_from_client` polling.
2. **Add React Router routes** — `/chat/:id` for direct conversation links.
3. **Add `useRpcSocket` unit tests** — mock `WebSocket`, test reconnect, timeout, and queue logic.
4. **Add Python pytest suite** — test JSON-RPC dispatch, TCP frame parsing, session lifecycle.
5. **Input sanitization** — escape HTML before rendering or use a proper markdown parser (e.g., `react-markdown`).

### Long Term
1. **Backend auth** — token-based or cookie-based authentication on WebSocket handshake.
2. **Database persistence** — SQLite or PostgreSQL for conversations and messages.
3. **Real LLM integration** — replace echo stub in `input_from_client` with actual model inference.
4. **E2E testing** — Playwright tests covering full user flows (create → type → receive → delete).
5. **Mobile responsiveness** — Sidebar collapses into a drawer on narrow viewports (`use-mobile.ts` exists but is unused).

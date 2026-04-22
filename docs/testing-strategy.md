# Testing Strategy Analysis

## 1. Test Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Vitest | 4.1.4 | Test runner |
| jsdom | 24.1.3 | DOM environment |
| `@testing-library/react` | 16.3.2 | Component rendering & queries |
| `@testing-library/jest-dom` | 6.9.1 | Custom matchers (`toBeInTheDocument`) |
| `@testing-library/user-event` | 14.6.1 | Simulated user interactions |

## 2. Test Matrix

### Hooks

| File | What It Tests |
|------|---------------|
| `tests/hooks/useConversations.test.ts` | Init state, CRUD, switching, message addition, title auto-generation, window API exposure |
| `tests/hooks/use-mobile.test.ts` | Mobile breakpoint detection via `matchMedia` |

### Components

| File | What It Tests |
|------|---------------|
| `tests/App.test.tsx` | Integration: render, create conversation, open/close help modal |
| `tests/components/ChatArea.test.tsx` | Placeholder state, welcome cards, message rendering, send flow, Enter key, quick actions, code blocks, suggestion pills |
| `tests/components/Sidebar.test.tsx` | (exists, not analyzed in detail) |
| `tests/components/HelpModal.test.tsx` | (exists, not analyzed in detail) |

### UI Primitives

| File | What It Tests |
|------|---------------|
| `tests/components/ui/button.test.tsx` | shadcn Button |
| `tests/components/ui/empty.test.tsx` | Empty state component |
| `tests/components/ui/spinner.test.tsx` | Spinner/loading indicator |

### Other

| File | What It Tests |
|------|---------------|
| `tests/lib/utils.test.ts` | `cn()` helper (clsx + tailwind-merge) |
| `tests/pages/Home.test.tsx` | Placeholder Home page |
| `tests/smoke/ui-components.test.tsx` | Broad smoke test across UI primitives |
| `tests/types/conversation.test.ts` | Type-level contracts |

## 3. Key Mocking Patterns

### `useRpcSocket` Mock
Used heavily to isolate components from real WebSocket connections:

```ts
vi.mock("@/hooks/useRpcSocket", () => ({
  useRpcSocket: () => ({
    readyState: "open",
    sendRequest: vi.fn(() => Promise.resolve("done")),
    sendNotification: vi.fn(),
  }),
}));
```

### Test Setup (`tests/setup.ts`)
- Polyfills `Element.prototype.scrollIntoView` with `vi.fn()` to avoid jsdom errors.
- Runs `cleanup()` after each test.

## 4. Coverage Gaps

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| No `useRpcSocket` unit tests | Reconnect, pending queue, error handling untested | Add `tests/hooks/useRpcSocket.test.ts` |
| No backend Python tests | JSON-RPC dispatch, TCP framing, session lifecycle untested | Add `pytest` suite in `py_network/` |
| No E2E / Playwright tests | Real browser flow (WebSocket + UI) untested | Consider Playwright or Cypress |
| No visual regression tests | Dark-theme UI shifts untested | Consider Chromatic or Percy |
| `pollForResponse` loop not tested | Polling edge cases (disconnect mid-poll, empty chunks) untested | Mock timer-based tests in ChatArea |
| Accessibility (a11y) not tested | Keyboard nav, screen reader support unknown | Add `@testing-library/jest-dom` a11y queries + axe |

## 5. Running Tests

```bash
# Once
npm run test

# Watch mode
npm run test:watch
```

# Frontend Deep Analysis

## 1. Component Tree

```
App.tsx (root layout: flex h-screen)
├── Sidebar.tsx
│   ├── Brand (logo.png + "ConversationFlow")
│   ├── "New Chat" button
│   ├── Conversation list (mapped from props)
│   │   └── per-item dropdown (delete)
│   └── Bottom actions (Help, Settings)
├── ChatArea.tsx
│   ├── Connection status indicator (readyState dot)
│   ├── Welcome state (empty conversation)
│   │   └── 3 quick-action cards
│   ├── Message list
│   │   ├── User bubble (right-aligned, outlined)
│   │   └── Assistant bubble (left-aligned, avatar + markdown-ish + suggestions)
│   └── Input bar (textarea + attach + send)
└── HelpModal.tsx
    ├── Left nav (Videos / FAQ / Release Notes)
    └── Right content pane
```

> **Note**: `src/pages/Home.tsx` is a **legacy Vite placeholder** (counter demo) and is **not used** by `App.tsx`. React Router is installed but not actively routing — the app is currently a single-page layout.

## 2. State Management

### `useConversations` (`src/hooks/useConversations.ts`)
- **Local React state only** (`useState`). No Redux, Zustand, or Context API.
- Holds `conversations[]` and `activeConversationId`.
- Provides CRUD: `createConversation`, `destroyConversation`, `switchConversation`, `addMessage`, `setSessionId`.
- Auto-generates conversation titles from the first user message (`content.slice(0,40)`).
- **Initial seed data**: 3 hardcoded conversations with sample messages.
- **Window API exposure**: via `useEffect`, mounts `window.ConversationFlow` with listeners (`onConversationChange`, `onActiveChange`).

### `useRpcSocket` (`src/hooks/useRpcSocket.ts`)
- **Global singleton** WebSocket (module-level variables: `globalWs`, `globalReadyState`).
- All consumers share one connection to `ws://127.0.0.1:8889`.
- Maintains `pendingQueue` for JSON-RPC request/response pairing.
- Auto-reconnect with exponential backoff (max 3 attempts).

## 3. Data Flow

```
User types ──▶ ChatArea (local inputValue)
     │
     ▼
Enter / Click Send
     │
     ▼
onSendMessage(content, 'user')  ──▶ useConversations.addMessage
     │                                    │
     │                                    ▼
     │                              updates conversations[]
     │                                    │
     ▼                                    ▼
sendRequest('input_from_client', [sid, content])
     │
     ▼
useRpcSocket (WebSocket) ──▶ JSON-RPC backend
     │
     ▼
pollForResponse() loops:
   sendRequest('get_output_from_client', [sid])
   sendRequest('is_session_finished', [sid])
     │
     ▼
onSendMessage(chunk, 'assistant') ──▶ useConversations.addMessage
```

## 4. Styling System

- **Tailwind CSS** utility classes + **inline `style` objects** for brand-specific colors.
- **CSS variables** in `src/index.css` define a dark cyberpunk palette:
  - Background: `#0D0D0D`
  - Card/elevated: `#141414`
  - Border: `#2A2A2A`
  - Hover: `#1F1F1F`
  - Brand purple: `#6C5CE7` (gradient start `#5B4BD3`, end `#8E7CF5`)
  - Text heading: `#FFFFFF`
  - Text body: `#A1A1AA`
  - Text muted: `#52525B`
- **shadcn/ui tokens** mapped to HSL CSS vars (`--primary`, `--secondary`, `--muted`, etc.) for component primitives.
- **Custom utilities**: `.gradient-text`, `.gradient-bg`, `.glow-purple`, `.animate-fade-in-up`, `.animate-breathe`.
- **Scrollbar**: Custom WebKit + Firefox thin scrollbar themed to `#2A2A2A` / `#6C5CE7`.

## 5. Asset Inventory

| File | Usage |
|------|-------|
| `public/logo.png` | Sidebar brand icon |
| `public/ai-avatar.png` | Assistant avatar in ChatArea |
| `public/video-thumbnail.jpg` | HelpModal video tutorial placeholder |
| Google Fonts CDN (`Inter`, `JetBrains Mono`) | Loaded in `index.html` |

## 6. Path Aliases

- `@/` → `./src` (Vite `resolve.alias` + TS `paths`).
- Used consistently across imports.

## 7. Routing (React Router 7)

- Package installed (`react-router`) but **not wired** in `App.tsx`.
- `src/pages/Home.tsx` exists but is orphaned.
- App is currently a single static layout. Router can be adopted later without structural changes.

## 8. Unused / Legacy Artifacts

- `src/pages/Home.tsx` — Vite starter counter page.
- `src/App.css` — Imported by Home.tsx but mostly empty/unused.
- `react-router` dependency is present but un-routed.

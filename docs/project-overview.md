# Project Overview — ConversationFlow

## 1. What This Is
A **hybrid chat-interface application** with a React 19 frontend and a Python TCP/WebSocket JSON-RPC backend. The product name is **ConversationFlow** (see `index.html` title and `src/components/Sidebar.tsx`).

## 2. Tech Stack

| Layer | Tech | Version | Config File |
|-------|------|---------|-------------|
| Bundler / Dev server | Vite | 7.2.4 | `vite.config.ts` |
| UI Framework | React | 19.2.0 | — |
| Language | TypeScript | ~5.9.3 | `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` |
| Styling | Tailwind CSS | 3.4.19 | `tailwind.config.js`, `postcss.config.js` |
| Component Lib | shadcn/ui + Radix UI | latest | `components.json` |
| Routing | React Router | 7.6.1 | — |
| Icons | Lucide React | 0.562.0 | — |
| Testing | Vitest + jsdom | 4.1.4 | `vitest.config.ts` |
| Lint | ESLint (flat config) | 9.39.1 | `eslint.config.js` |
| Python Runtime | CPython | >=3.14 | `pyproject.toml` |
| Python Package Manager | uv | — | `uv.lock` |
| Python deps | websockets | >=12.0 | `pyproject.toml` |

## 3. Architecture (Text Diagram)

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React 19 + Vite)                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Sidebar    │  │   ChatArea   │  │    HelpModal     │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│         │                   │                                    │
│         └─────────┬─────────┘                                    │
│                   ▼                                              │
│         useConversations (state hook)                            │
│                   │                                              │
│         ┌─────────┴─────────┐                                    │
│         ▼                   ▼                                    │
│  useRpcSocket       window.ConversationFlow                     │
│  (WebSocket client)   (global API)                              │
│         │                                                       │
│         ▼                                                       │
│  ws://127.0.0.1:8889  (WebSocket)                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Python Backend                                             │
│  ┌─────────────────┐     ┌────────────────────────────────┐ │
│  │ WebSocket Server│────▶│  ws_handler per client         │ │
│  │  (port 8889)    │     │  └─ spawns TCPClient           │ │
│  └─────────────────┘     └────────────────────────────────┘ │
│                              │                                │
│                              ▼                                │
│  ┌─────────────────┐     ┌────────────────────────────────┐ │
│  │ TCP Group Server│◀────│  TCPClient (length-prefixed)   │ │
│  │  (port 8888)    │     └────────────────────────────────┘ │
│  └─────────────────┘                                         │
│       │                                                      │
│       ▼                                                      │
│  JSON-RPC 2.0 dispatch (handle_rpc)                          │
│  Methods: open_session, input_from_client,                   │
│           get_output_from_client, is_session_finished,       │
│           close_session                                      │
└─────────────────────────────────────────────────────────────┘
```

## 4. Entry Points

### Frontend
- **HTML**: `index.html` (mounts `src/main.tsx`)
- **React mount**: `src/main.tsx` → `src/App.tsx`
- **Dev server**: `npm run dev` → `http://localhost:3000`
- **Production build**: `npm run build` → `dist/` (relative base path `./`)

### Backend
- **Python main**: `py_network/json_rpc_backend.py` (run with `python py_network/json_rpc_backend.py`)
- **TCP server**: `127.0.0.1:8888` (`TcpGroupServer`)
- **WebSocket server**: `127.0.0.1:8889` (`websockets.serve`)

## 5. Directory Layout

```
├── docs/                      # ← Report target directory
├── dist/                      # Vite production build output
├── public/                    # Static assets (logo.png, ai-avatar.png, video-thumbnail.jpg)
├── src/
│   ├── components/            # App-level components (Sidebar, ChatArea, HelpModal)
│   ├── components/ui/         # shadcn/ui primitives (~50 files)
│   ├── hooks/                 # useConversations, useRpcSocket, use-mobile
│   ├── lib/                   # utils.ts (cn helper)
│   ├── pages/                 # Home.tsx (legacy/unused placeholder)
│   ├── types/                 # conversation.ts (Message, Conversation types)
│   ├── App.tsx                # Root layout
│   ├── main.tsx               # React DOM mount
│   └── index.css              # Global styles + Tailwind directives
├── tests/                     # Vitest test suite
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   ├── smoke/
│   ├── types/
│   └── setup.ts               # Test environment setup
├── py_network/                # Python package
│   ├── json_rpc_backend.py    # Main backend entry
│   ├── tcp_group_server.py    # Multi-client TCP server
│   ├── tcp_server.py          # Single-client TCP server
│   └── tcp_client.py          # TCP client (used by WS bridge)
├── package.json               # npm deps & scripts
├── pyproject.toml             # Python project config
├── vite.config.ts             # Vite config (alias @ → src, port 3000)
├── vitest.config.ts           # Test config (jsdom, globals, alias)
├── tailwind.config.js         # Theme tokens (dark mode, shadcn colors)
└── eslint.config.js           # Flat ESLint config
```

## 6. Quick Commands

```bash
# Frontend dev
npm run dev

# Frontend build
npm run build

# Frontend tests
npm run test

# Frontend lint
npm run lint

# Backend (requires uv / Python 3.14+)
uv run python -m py_network.json_rpc_backend
```

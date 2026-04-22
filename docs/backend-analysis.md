# Backend Deep Analysis

## 1. Python Package: `py_network`

| Module | Role | Lines | Exposes |
|--------|------|-------|---------|
| `json_rpc_backend.py` | Main entry point — WebSocket server + JSON-RPC dispatcher | 249 | `main()` coroutine |
| `tcp_group_server.py` | Multi-client TCP server (thread pool) | 370 | `TcpGroupServer` class |
| `tcp_server.py` | Single-client TCP server | 307 | `TCPServer` class |
| `tcp_client.py` | TCP client with length-prefixed framing | 244 | `TCPClient` class |
| `__init__.py` | Empty | 0 | — |

## 2. Server Architecture

### Dual-Server Model

```
┌──────────────────────────────────────┐
│  WebSocket Server (asyncio)          │
│  ws://127.0.0.1:8889                 │
│  └─ websockets.serve(ws_handler, ...)│
└──────────────────────────────────────┘
              │
              │ per WebSocket client
              ▼
┌──────────────────────────────────────┐
│  ws_handler                          │
│  ├─ creates TCPClient("127.0.0.1", 8888)
│  ├─ on_tcp_message  ──▶  ws_send_queue
│  ├─ forward_to_ws() (async task)
│  └─ on message ──▶ tcp_client.send()
└──────────────────────────────────────┘
              │
              ▼ TCP (length-prefixed)
┌──────────────────────────────────────┐
│  TcpGroupServer (thread pool)        │
│  127.0.0.1:8888                      │
│  └─ ThreadPoolExecutor per client    │
└──────────────────────────────────────┘
              │
              ▼
│  on_raw_data ──▶ json.loads ──▶ handle_rpc
```

**Design intent**: Every browser tab gets its own WebSocket connection, and each WebSocket spawns a private `TCPClient` to the shared TCP Group Server. This keeps the TCP JSON-RPC stack fully exercised end-to-end.

## 3. Length-Prefixed Protocol

All TCP modules use a **4-byte big-endian length prefix** (`struct.pack("!I", len(payload))`) followed by the UTF-8 payload.

```
[ 4 bytes: length N ] [ N bytes: payload ]
```

- Max payload sanity check: **10 MB**.
- Used consistently in `TcpGroupServer`, `TCPServer`, `TCPClient`.

## 4. JSON-RPC 2.0 Dispatch (`handle_rpc`)

### Methods

| Method | Params | Behavior |
|--------|--------|----------|
| `open_session` | `[]` | Creates a new `Session` with UUID, returns `session_id` |
| `input_from_client` | `[text, session_id?]` | Spawns a thread that chunks an echo response into the session's `output_queue`; returns `"processing"` |
| `get_output_from_client` | `[session_id]` | Drains all available chunks from `output_queue` (non-blocking) |
| `is_session_finished` | `[session_id]` | Checks if worker thread is alive; cleans up thread ref when done |
| `close_session` | `[session_id]` | Removes session from global `clients` dict |

### Session Model

```python
@dataclass
class Session:
    session_id: str
    output_queue: queue.Queue
    thread: threading.Thread | None
```

Sessions are stored per-client inside `ClientState`:

```python
@dataclass
class ClientState:
    sessions: dict[str, Session]
```

Global registry: `clients: dict[int, ClientState]` keyed by `client_id` from `TcpGroupServer`.

## 5. Threading Model

| Layer | Threading |
|-------|-----------|
| `TcpGroupServer` | Main accept thread + `ThreadPoolExecutor` (max 10 workers) for per-client receive loops |
| `TCPServer` | Main accept thread + one receive thread per client |
| `TCPClient` | Optional receive thread (daemon) when `blocking=False` |
| `json_rpc_backend` | Asyncio event loop for WebSocket; each `input_from_client` spawns a `threading.Thread` for fake processing |

**Thread-safety**: `TcpGroupServer`, `TCPServer`, and `TCPClient` all use `threading.Lock` around socket operations.

## 6. `TCPServer` vs `TcpGroupServer`

- `TCPServer`: **Single-client-at-a-time**. Accepts one connection; new connections force-close the old one. Useful for simple 1:1 debugging.
- `TcpGroupServer`: **Multi-client**. Keeps a map of `client_id → socket`, supports broadcast, per-client send/receive. This is the one used in production by `json_rpc_backend`.

## 7. Python Build / Packaging

- Build backend: `hatchling`.
- Package name: `py-network`.
- Requires Python **>=3.14** (very modern; likely a developer preference or typo for 3.12).
- Single dependency: `websockets>=12.0`.
- Managed via `uv` (lockfile `uv.lock`).

## 8. Notable Backend Behaviors

- **Echo-only logic**: `input_from_client` currently returns a hardcoded echo string split into word pairs. It is a stub/proof-of-concept awaiting real LLM or agent integration.
- **No persistence**: Sessions live only in memory. Server restart = all sessions lost.
- **No auth**: Any TCP/WebSocket client can connect and invoke RPC methods.
- **Global mutable state**: `clients` dict is a module-level global with no concurrency control beyond per-socket locks.

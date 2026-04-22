# Communication Layer Deep Analysis

## 1. Overview
The frontend talks to the backend through a **WebSocket-to-TCP bridge**. The browser never connects directly to the TCP JSON-RPC server; instead it opens a WebSocket to port 8889, and the Python backend forwards each message over a private TCP connection to port 8888.

## 2. `useRpcSocket` Hook (`src/hooks/useRpcSocket.ts`)

### Singleton Design
All hook instances share **one global WebSocket** via module-level variables:

```ts
let globalWs: WebSocket | null = null;
let globalReadyState: ReadyState = 'closed';
const stateListeners = new Set<(state: ReadyState) => void>();
```

This means:
- First mount opens the connection.
- Subsequent mounts reuse it.
- Unmounting only removes the listener; socket stays open.

### Reconnect Strategy
- `maxReconnectAttempts = 3`
- Exponential backoff: `delay = min(1000 * 2^attempt, 10000)`
- On `ws.onclose`, drained `pendingQueue` rejects all with `"WebSocket closed"`.

### Request / Response Pairing

```ts
const pendingQueue: { resolve; reject }[] = [];
let requestId = 1;
```

- Every `sendRequest` pushes a Promise into `pendingQueue`.
- `ws.onmessage` JSON-parses the response and resolves/rejects the first pending Promise (or matches by `id` if present).
- **Critical bug risk**: matching logic is fragile. If responses arrive out of order, the wrong Promise may be resolved.

### Exported API

```ts
export function useRpcSocket(url: string) {
  return { readyState, sendRequest, sendNotification };
}
```

- `sendRequest(method, params)` — returns `Promise<unknown>`.
- `sendNotification(method, params)` — fire-and-forget (no `id` field).

## 3. JSON-RPC Message Format

### Request
```json
{ "jsonrpc": "2.0", "method": "input_from_client", "params": ["sid-uuid", "hello"], "id": 1 }
```

### Response
```json
{ "jsonrpc": "2.0", "result": "processing", "id": 1 }
```

### Error
```json
{ "jsonrpc": "2.0", "error": { "code": -32602, "message": "Invalid params" }, "id": 1 }
```

## 4. ChatArea ↔ Backend Flow (`src/components/ChatArea.tsx`)

### Lifecycle
1. **Focus / mount** → `useEffect` triggers `open_session` → receives `sessionId`.
2. **User sends message** → `sendRequest('input_from_client', [sid, content])`.
3. **Backend returns `"processing"`** → `pollForResponse()` starts.
4. **Polling loop** (every 500ms):
   - `get_output_from_client` → drains text chunks.
   - `is_session_finished` → exits loop when `true`.
5. **Each chunk** is appended via `onSendMessage(chunk, 'assistant')`.

### Connection Status UI
- Dot in top-right of ChatArea: green (`open`), yellow (`connecting`), red (`closed`/`error`).
- Send button disabled when `readyState !== 'open'`.

## 5. Known Communication Issues

| Issue | Location | Severity |
|-------|----------|----------|
| **Pending queue match is order-dependent, not id-matched reliably** | `useRpcSocket.ts:48-54` | High |
| **No heartbeat / keep-alive** | `useRpcSocket.ts` | Medium |
| **Polling instead of server-push** | `ChatArea.tsx:58-85` | Medium |
| **WebSocket URL is hardcoded** | `ChatArea.tsx:25`, `useConversations.ts:66` | Low |
| **No request timeout** | `useRpcSocket.ts:103-114` | Medium |
| **Race: `sendRequest` before `open` can silently fail** | `useRpcSocket.ts:106` | Medium |
| **pollForResponse has no cancellation on unmount** | `ChatArea.tsx:58-85` | Low |

## 6. Global Window API (`window.ConversationFlow`)

`useConversations` exposes a programmatic API on the `window` object:

```ts
window.ConversationFlow = {
  conversations: {
    create(title?),
    destroy(id),
    switch(id),
    list(),
    sendMessage(conversationId, content),
    onConversationChange(callback),
    onActiveChange(callback),
  }
};
```

- Useful for browser-console automation and external scripts.
- **Security risk**: any injected script can call these methods. Marked with `TODO: Remove global window API or secure it before production release`.

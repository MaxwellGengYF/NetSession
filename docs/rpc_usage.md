# JSON-RPC Server Usage

## Overview

The Kimi CLI server (`src\kimix\cli_impl\server.py`) hosts a **JSON-RPC 2.0 TCP server** that manages per-client agent sessions, processes text prompts and slash-commands, and streams LLM output asynchronously.

The underlying transport is provided by `JSONRPCServer` in `src\kimix\network\rpc_server.py`, built on top of `TcpGroupServer`.

---

## JSON-RPC Protocol Format

All communication uses **JSON-RPC 2.0** over TCP.

### Request Format

```json
{
  "jsonrpc": "2.0",
  "method": "<method_name>",
  "params": [<positional_args>],
  "id": <request_id>
}
```

- `method` — Name of the registered function.
- `params` — Array of positional arguments **after** `client_id` (see [Note on client_id](#note-on-client_id)).
- `id` — Optional; used if you expect a response. Notifications omit `id`.

### Response Format (Success)

```json
{
  "jsonrpc": "2.0",
  "result": <return_value>
}
```

### Response Format (Error)

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": <error_code>,
    "message": "<description>"
  }
}
```

### Error Codes

| Code   | Meaning          | When It Occurs                                      |
|--------|------------------|-----------------------------------------------------|
| -32700 | Parse error      | Malformed JSON or invalid UTF-8                     |
| -32600 | Invalid Request  | Top-level request is not a JSON object              |
| -32601 | Method not found | `method` is unknown or not registered               |
| -32602 | Invalid params   | Wrong argument types or count for the method        |
| -32603 | Internal error   | Exception raised inside the invoked function        |

---

## Note on `client_id`

The `JSONRPCServer` automatically **prepends** the internal `client_id` (an `int`) as the **first positional argument** to every registered function call. You do **not** include it in `params`.

Example: calling `input_from_client(client_id=3, text="hello")` is done by sending:

```json
{
  "jsonrpc": "2.0",
  "method": "input_from_client",
  "params": ["hello"]
}
```

---

## Server Lifecycle

```python
from kimix.network.rpc_server import JSONRPCServer
from kimix.cli_impl.server import (
    input_from_client,
    get_output_from_client,
    is_session_finished,
    on_client_connect,
    on_client_disconnect,
)

server = JSONRPCServer(
    host="127.0.0.1",
    port=8888,
    on_client_connect=on_client_connect,
    on_client_disconnect=on_client_disconnect,
)

server.register_function(input_from_client)
server.register_function(get_output_from_client)
server.register_function(is_session_finished)

server.start(blocking=True)   # blocking=True runs forever
# ...
server.stop()
```

| Method | Description |
|--------|-------------|
| `register(name, func)` | Register a function under an explicit name. |
| `register_function(func)` | Register a function using its `__name__`. |
| `start(blocking=True)` | Start the TCP server. |
| `stop()` | Stop accepting connections and shut down. |
| `get_client_count()` | Number of connected clients. |
| `is_client_connected()` | `True` if at least one client is connected. |
| `wait_for_connection(timeout=5.0)` | Block until a client connects. |
| `wait_for_disconnection(timeout=5.0)` | Block until all clients disconnect. |
| `get_client_ids()` | List of currently connected client IDs. |
| `disconnect_client(client_id)` | Forcibly disconnect a specific client. |

---

## Registered RPC Functions

### `input_from_client(client_id, text: str) -> str`

Receive a text message (or slash-command) from a client, start LLM prompt processing in a background thread, and return immediately.

- If the client has no session, one is created lazily via `_create_session_async`.
- If a prompt is already running for this client, returns `"error: prompt already in progress"`.
- If the client is unknown, returns `"error: client not connected"`.
- On success, returns `"processing"`.

**Request example:**

```json
{
  "jsonrpc": "2.0",
  "method": "input_from_client",
  "params": ["Explain Python decorators"],
  "id": 1
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": "processing"
}
```

---

### `get_output_from_client(client_id) -> list[str]`

Drain and return all queued output strings for a client that have been produced by the background prompt thread.

- Returns `["error: client not connected"]` if the client is unknown.
- Returns `[]` if no output is available yet.

**Request example:**

```json
{
  "jsonrpc": "2.0",
  "method": "get_output_from_client",
  "params": [],
  "id": 2
}
```

**Response (with output):**

```json
{
  "jsonrpc": "2.0",
  "result": ["A decorator is a function that takes another function...", "and extends its behavior."]
}
```

---

### `is_session_finished(client_id) -> bool`

Check whether the background prompt thread for a client has finished executing.

- Returns `true` if the thread finished (and clears the thread reference).
- Returns `false` if no thread exists or the thread is still alive.

**Request example:**

```json
{
  "jsonrpc": "2.0",
  "method": "is_session_finished",
  "params": [],
  "id": 3
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": true
}
```

---

## Slash Commands

When `input_from_client` receives text starting with `/`, it is parsed as a command rather than a raw LLM prompt.

Format: `/<command>` or `/<command>:<argument>`

| Command | Argument | Behavior |
|---------|----------|----------|
| `/help` | — | Print help text. |
| `/clear` | — | Reset the session context. |
| `/summarize` | — | Compact context by generating a memory file and resuming. |
| `/exit` | — | Print `bye!`. |
| `/context` | — | Show current token usage percentage. |
| `/script:<code>` | Python code | `exec(arg)` in an empty globals/locals dict. |
| `/cmd:<command>` | Shell command | Run via `os.system`. |
| `/cd:<path>` | Directory path | Change working directory and reset/resume session. |
| `/fix:<command>` | Shell command | Run command, capture stderr, return a fix prompt. |
| `/think:on`\|`off` | — | Toggle thinking mode and reset/resume session. |
| `/txt:<text>` | Raw text | Return the text as a normal prompt. |
| `/skill:<name>` | Skill name | Return `Use skill:<name>.` as a prompt prefix. |
| `/file:<path>` | File path | Read file contents and return as the prompt text. |

If an unrecognized command is sent, the server replies with `"Unrecognized command."` via the output queue.

### Command Examples

**Clear context:**

```json
{
  "jsonrpc": "2.0",
  "method": "input_from_client",
  "params": ["/clear"],
  "id": 4
}
```

**Read a file as input:**

```json
{
  "jsonrpc": "2.0",
  "method": "input_from_client",
  "params": ["/file:src/main.py"],
  "id": 5
}
```

**Toggle thinking mode on:**

```json
{
  "jsonrpc": "2.0",
  "method": "input_from_client",
  "params": ["/think:on"],
  "id": 6
}
```

---

## Client State Management

Each connected client is tracked in a `Client` dataclass:

```python
@dataclass
class Client:
    session: Session | None = None
    thread: threading.Thread | None = None
    output_queue: queue.Queue[str] | None = None
```

- `session` — The active Kimi agent session (`kimi_agent_sdk.Session`). Created lazily on first prompt.
- `thread` — The background thread running `prompt_async`. `None` when idle.
- `output_queue` — A `queue.Queue[str]` where the thread posts LLM output chunks and command messages.

### Connection Callbacks

| Callback | Signature | Purpose |
|----------|-----------|---------|
| `on_client_connect` | `(client_id: int, client_addr: tuple[str, int]) -> None` | Initialize a blank `Client` entry. |
| `on_client_disconnect` | `(client_id: int) -> None` | Pop the client entry and close its session. |

---

## Typical Client Workflow

1. **Connect** to the TCP port.
2. **Send** `input_from_client` with the user's message.
3. **Poll** `get_output_from_client` repeatedly to collect streamed output.
4. **Poll** `is_session_finished` to know when the prompt is complete.
5. **Disconnect** (or send `/exit`) when done.

```
Client                      Server
  | ---- input_from_client ---> |
  | <------- "processing" ----- |
  |                             |  [starts background thread]
  | ---- get_output_from_client -> |
  | <------- ["chunk1", "chunk2"] -- |
  | ---- is_session_finished --> |
  | <--------- false ----------- |
  | ... (repeat polling) ...    |
  | ---- is_session_finished --> |
  | <---------- true ----------- |
```

---

## Important Files

| File | Role |
|------|------|
| `src\kimix\cli_impl\server.py` | Core CLI server; command dispatch, session management, threaded prompt execution. |
| `src\kimix\network\rpc_server.py` | Generic JSON-RPC 2.0 TCP server; request parsing, method dispatch, error handling. |
| `src\kimix\network\tcp_group_server.py` | Low-level TCP group server that `JSONRPCServer` wraps. |
| `src\kimix\kimi_utils.py` | SDK utilities: `Session`, `prompt_async`, `_create_session_async`, etc. |

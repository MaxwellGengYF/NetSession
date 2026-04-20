#!/usr/bin/env python3
"""JSON-RPC Backend with WebSocket-to-TCP Bridge.

This module runs two servers:
1. A TCP Group Server (port 8888) that speaks JSON-RPC 2.0 over length-prefixed frames.
2. A WebSocket server (port 8889) that bridges browser connections to the TCP server.

Each WebSocket client gets a dedicated TCPClient connection to the TCP Group Server,
so the full TCP + JSON-RPC stack is exercised end-to-end.
"""

import asyncio
import json
import queue
import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path

import websockets

# Allow imports when running from project root or from inside py_network
from py_network.tcp_group_server import TcpGroupServer
from py_network.tcp_client import TCPClient


# ---------------------------------------------------------------------------
# Per-client state managed by the TCP Group Server
# ---------------------------------------------------------------------------

@dataclass
class Session:
    session_id: str
    output_queue: queue.Queue = field(default_factory=queue.Queue)
    thread: threading.Thread | None = None


@dataclass
class ClientState:
    sessions: dict[str, Session] = field(default_factory=dict)


clients: dict[int, ClientState] = {}


def on_client_connect(client_id: int, client_addr: tuple[str, int]) -> None:
    print(f"[Backend] TCP client {client_id} connected from {client_addr}")
    clients[client_id] = ClientState()
    print('CONNECT')


def on_client_disconnect(client_id: int) -> None:
    print(f"[Backend] TCP client {client_id} disconnected")
    clients.pop(client_id, None)
    print('DISCONNECT')


def handle_rpc(client_id: int, request: dict) -> dict:
    """Dispatch JSON-RPC requests."""
    method = request.get("method")
    params = request.get("params", [])
    print(f"\033[32m{method + ' ' + str(params)}\033[0m")
    if method == "input_from_client":
        if not params:
            return {"jsonrpc": "2.0", "error": {"code": -32602, "message": "Invalid params"}}
        text = str(params[0])
        session_id = str(params[1]) if len(params) > 1 else None
        state = clients.get(client_id)
        if state is None:
            return {"jsonrpc": "2.0", "result": "error: client not connected"}
        sid = session_id or "default"
        session = state.sessions.get(sid)
        if session is None:
            session = Session(session_id=sid)
            state.sessions[sid] = session
        if session.thread is not None and session.thread.is_alive():
            return {"jsonrpc": "2.0", "result": "error: prompt already in progress"}

        def process() -> None:
            response = (
                f"Echo from JSON-RPC server: '{text}'. "
                "Your message was received and processed successfully."
            )
            words = response.split(" ")
            for i in range(0, len(words), 2):
                chunk = " ".join(words[i : i + 2]) + " "
                session.output_queue.put(chunk)
                time.sleep(0.15)

        session.thread = threading.Thread(target=process, daemon=True)
        session.thread.start()
        return {"jsonrpc": "2.0", "result": "processing"}

    elif method == "get_output_from_client":

        state = clients.get(client_id)
        if state is None:
            return {"jsonrpc": "2.0", "result": ["error: client not connected"]}
        session_id = str(params[0]) if params else None
        sid = session_id or "default"
        session = state.sessions.get(sid)
        if session is None:
            return {"jsonrpc": "2.0", "result": []}
        chunks = []
        while True:
            try:
                chunks.append(session.output_queue.get_nowait())
            except queue.Empty:
                break
        return {"jsonrpc": "2.0", "result": chunks}

    elif method == "is_session_finished":

        state = clients.get(client_id)
        if state is None:
            return {"jsonrpc": "2.0", "result": True}
        session_id = str(params[0]) if params else None
        sid = session_id or "default"
        session = state.sessions.get(sid)
        if session is None:
            return {"jsonrpc": "2.0", "result": True}
        finished = session.thread is None or not session.thread.is_alive()
        if finished:
            session.thread = None
        return {"jsonrpc": "2.0", "result": finished}

    elif method == "open_session":
        state = clients.get(client_id)
        if state is None:
            return {"jsonrpc": "2.0", "result": "error: client not connected"}
        new_session_id = str(uuid.uuid4())
        state.sessions[new_session_id] = Session(session_id=new_session_id)
        return {"jsonrpc": "2.0", "result": new_session_id}

    elif method == "close_session":
        if not params:
            return {"jsonrpc": "2.0", "error": {"code": -32602, "message": "Invalid params"}}
        target_session_id = str(params[0])
        found = False
        for state in clients.values():
            if target_session_id in state.sessions:
                state.sessions.pop(target_session_id)
                found = True
                break
        return {"jsonrpc": "2.0", "result": "closed" if found else "missing"}

    else:
        return {
            "jsonrpc": "2.0",
            "error": {"code": -32601, "message": "Method not found"},
        }


def on_raw_data(client_id: int, data: bytes) -> str | None:
    """Called by TcpGroupServer for every incoming message. Returns the response to send back."""
    try:
        request = json.loads(data.decode("utf-8"))
        response = handle_rpc(client_id, request)
        print(f"\033[32m{'response ' + str(response)}\033[0m")

        return json.dumps(response)
    except json.JSONDecodeError:
        return json.dumps({"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}})
    except Exception as e:
        return json.dumps({"jsonrpc": "2.0", "error": {"code": -32603, "message": str(e)}})


# ---------------------------------------------------------------------------
# WebSocket-to-TCP Bridge
# ---------------------------------------------------------------------------

async def ws_handler(websocket):
    """Handle one WebSocket client by spawning a TCPClient to the JSON-RPC server."""
    loop = asyncio.get_running_loop()
    tcp_client = TCPClient("127.0.0.1", 8888)
    ws_send_queue: asyncio.Queue[str | None] = asyncio.Queue()

    def on_tcp_message(msg: str) -> None:
        try:
            asyncio.run_coroutine_threadsafe(ws_send_queue.put(msg), loop)
        except RuntimeError:
            pass  # loop closed

    def on_tcp_disconnect() -> None:
        try:
            asyncio.run_coroutine_threadsafe(ws_send_queue.put(None), loop)
            asyncio.run_coroutine_threadsafe(websocket.close(), loop)
        except RuntimeError:
            pass

    tcp_client.on_message(on_tcp_message)
    tcp_client.on_disconnect(on_tcp_disconnect)

    if not tcp_client.connect(blocking=False):
        print("[WS] Failed to connect TCP client to backend")
        await websocket.close()
        return

    async def forward_to_ws() -> None:
        while True:
            msg = await ws_send_queue.get()
            if msg is None:
                break
            try:
                await websocket.send(msg)
            except Exception:
                break

    forward_task = asyncio.create_task(forward_to_ws())

    try:
        async for message in websocket:
            tcp_client.send(message)
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        await ws_send_queue.put(None)
        forward_task.cancel()
        try:
            await forward_task
        except asyncio.CancelledError:
            pass
        tcp_client.disconnect()
        print("[WS] WebSocket client disconnected")


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

async def main() -> None:
    tcp_server = TcpGroupServer("127.0.0.1", 8888)
    tcp_server.on_client_connect(on_client_connect)
    tcp_server.on_client_disconnect(on_client_disconnect)
    tcp_server.on_raw_data(on_raw_data)
    tcp_server.start(blocking=False)
    print("[Backend] TCP Group Server started on 127.0.0.1:8888")

    print("[Backend] WebSocket server starting on ws://127.0.0.1:8889")
    async with websockets.serve(ws_handler, "127.0.0.1", 8889):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[Backend] Shutting down")

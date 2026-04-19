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
class ClientState:
    output_queue: queue.Queue = field(default_factory=queue.Queue)
    thread: threading.Thread | None = None


clients: dict[int, ClientState] = {}


def on_client_connect(client_id: int, client_addr: tuple[str, int]) -> None:
    print(f"[Backend] TCP client {client_id} connected from {client_addr}")
    clients[client_id] = ClientState()


def on_client_disconnect(client_id: int) -> None:
    print(f"[Backend] TCP client {client_id} disconnected")
    clients.pop(client_id, None)


def handle_rpc(client_id: int, request: dict) -> dict:
    """Dispatch JSON-RPC requests."""
    method = request.get("method")
    params = request.get("params", [])
    req_id = request.get("id")

    if method == "input_from_client":
        if not params:
            return {"jsonrpc": "2.0", "error": {"code": -32602, "message": "Invalid params"}, "id": req_id}
        text = str(params[0])
        state = clients.get(client_id)
        if state is None:
            return {"jsonrpc": "2.0", "result": "error: client not connected", "id": req_id}
        if state.thread is not None and state.thread.is_alive():
            return {"jsonrpc": "2.0", "result": "error: prompt already in progress", "id": req_id}

        def process() -> None:
            response = (
                f"Echo from JSON-RPC server: '{text}'. "
                "Your message was received and processed successfully."
            )
            words = response.split(" ")
            for i in range(0, len(words), 2):
                chunk = " ".join(words[i : i + 2]) + " "
                state.output_queue.put(chunk)
                time.sleep(0.15)

        state.thread = threading.Thread(target=process, daemon=True)
        state.thread.start()
        return {"jsonrpc": "2.0", "result": "processing", "id": req_id}

    elif method == "get_output_from_client":
        state = clients.get(client_id)
        if state is None:
            return {"jsonrpc": "2.0", "result": ["error: client not connected"], "id": req_id}
        chunks = []
        while True:
            try:
                chunks.append(state.output_queue.get_nowait())
            except queue.Empty:
                break
        return {"jsonrpc": "2.0", "result": chunks, "id": req_id}

    elif method == "is_session_finished":
        state = clients.get(client_id)
        if state is None:
            return {"jsonrpc": "2.0", "result": True, "id": req_id}
        finished = state.thread is None or not state.thread.is_alive()
        if finished:
            state.thread = None
        return {"jsonrpc": "2.0", "result": finished, "id": req_id}

    else:
        return {
            "jsonrpc": "2.0",
            "error": {"code": -32601, "message": "Method not found"},
            "id": req_id,
        }


def on_raw_data(client_id: int, data: bytes) -> str | None:
    """Called by TcpGroupServer for every incoming message. Returns the response to send back."""
    try:
        request = json.loads(data.decode("utf-8"))
        response = handle_rpc(client_id, request)
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

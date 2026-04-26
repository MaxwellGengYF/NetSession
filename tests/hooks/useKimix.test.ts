import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useKimix } from "@/hooks/useKimix";

const mockSubscribe = vi.fn();
const mockConnectionState = "open";

vi.mock("@/hooks/useKimixSSE", () => ({
  useKimixSSE: () => ({
    connectionState: mockConnectionState,
    subscribe: mockSubscribe,
    subscribeGlobal: vi.fn(),
    reconnect: vi.fn(),
  }),
}));

vi.mock("@/api/kimixClient", () => ({
  createSession: vi.fn((title?: string) => Promise.resolve({ id: "sess-1", title: title || null, createdAt: 1, updatedAt: 1, parentID: null })),
  deleteSession: vi.fn(() => Promise.resolve(true)),
  sendPromptAsync: vi.fn(() => Promise.resolve()),
  abortSession: vi.fn(() => Promise.resolve(true)),
}));

describe("useKimix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("openSession creates a session and returns id", async () => {
    const { result } = renderHook(() => useKimix());
    let sid: string | undefined;
    await act(async () => {
      sid = await result.current.openSession("My Session");
    });
    expect(sid).toBe("sess-1");
  });

  it("closeSession deletes a session", async () => {
    const { result } = renderHook(() => useKimix());
    await act(async () => {
      await result.current.closeSession("sess-1");
    });
    const { deleteSession } = await import("@/api/kimixClient");
    expect(deleteSession).toHaveBeenCalledWith("sess-1");
  });

  it("sendMessage subscribes to SSE and accumulates deltas", async () => {
    const { result } = renderHook(() => useKimix());
    const deltas: { text: string; done: boolean }[] = [];

    mockSubscribe.mockImplementation((_sessionId: string, cb: (e: unknown) => void) => {
      // Simulate receiving deltas
      setTimeout(() => {
        cb({
          type: "message.part.updated",
          properties: {
            sessionID: "sess-1",
            part: { type: "text", text: "Hello", messageID: "m1" },
            delta: "Hello",
          },
        });
      }, 10);
      setTimeout(() => {
        cb({
          type: "message.part.updated",
          properties: {
            sessionID: "sess-1",
            part: { type: "text", text: "Hello world", messageID: "m1" },
            delta: " world",
          },
        });
      }, 20);
      setTimeout(() => {
        cb({
          type: "session.idle",
          properties: { sessionID: "sess-1" },
        });
      }, 30);
      return () => {};
    });

    await act(async () => {
      await result.current.sendMessage("sess-1", "hi", (delta) => {
        deltas.push(delta);
      });
    });

    await waitFor(() => expect(deltas.some((d) => d.done)).toBe(true));
    const texts = deltas.filter((d) => !d.done).map((d) => d.text);
    expect(texts).toContain("Hello");
    expect(texts).toContain(" world");
  });

  it("sendMessage resolves on session.idle", async () => {
    const { result } = renderHook(() => useKimix());

    mockSubscribe.mockImplementation((_sessionId: string, cb: (e: unknown) => void) => {
      setTimeout(() => {
        cb({
          type: "session.idle",
          properties: { sessionID: "sess-1" },
        });
      }, 10);
      return () => {};
    });

    await act(async () => {
      await result.current.sendMessage("sess-1", "hi", vi.fn());
    });

    expect(mockSubscribe).toHaveBeenCalledWith("sess-1", expect.any(Function));
  });

  it("sendMessage rejects on error status", async () => {
    const { result } = renderHook(() => useKimix());

    mockSubscribe.mockImplementation((_sessionId: string, cb: (e: unknown) => void) => {
      setTimeout(() => {
        cb({
          type: "session.status",
          properties: { sessionID: "sess-1", status: { type: "error" } },
        });
      }, 10);
      return () => {};
    });

    await expect(
      act(async () => {
        await result.current.sendMessage("sess-1", "hi", vi.fn());
      })
    ).rejects.toThrow("Session error");
  });

  it("abort calls abortSession", async () => {
    const { result } = renderHook(() => useKimix());
    await act(async () => {
      await result.current.abort("sess-1");
    });
    const { abortSession } = await import("@/api/kimixClient");
    expect(abortSession).toHaveBeenCalledWith("sess-1");
  });
});

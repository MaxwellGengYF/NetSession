import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  health,
  createSession,
  listSessions,
  getSession,
  deleteSession,
  getMessages,
  sendMessage,
  sendPromptAsync,
  abortSession,
  getEventStreamUrl,
} from "@/api/kimixClient";

describe("kimixClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockFetch(response: unknown, status = 200) {
    return () =>
      Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        text: () => Promise.resolve(JSON.stringify(response)),
        json: () => Promise.resolve(response),
      } as Response);
  }

  it("health calls /global/health", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(
      mockFetch({ healthy: true, version: "0.1.0" })
    );
    const result = await health();
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:4096/global/health",
      expect.objectContaining({ method: "GET" })
    );
    expect(result.healthy).toBe(true);
  });

  it("createSession POSTs to /session with title", async () => {
    const session = {
      id: "s1",
      title: "Test",
      createdAt: 1,
      updatedAt: 1,
      parentID: null,
    };
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(mockFetch(session));
    const result = await createSession("Test");
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:4096/session",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ title: "Test" }),
      })
    );
    expect(result.id).toBe("s1");
  });

  it("listSessions GETs /session", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(mockFetch([]));
    await listSessions();
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:4096/session",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("getSession GETs /session/{id}", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(
      mockFetch({ id: "s1", title: "T", createdAt: 1, updatedAt: 1, parentID: null })
    );
    await getSession("s1");
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:4096/session/s1",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("deleteSession DELETEs /session/{id}", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(mockFetch(true));
    await deleteSession("s1");
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:4096/session/s1",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("getMessages GETs /session/{id}/message with optional limit", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(mockFetch([]));
    await getMessages("s1", 10);
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:4096/session/s1/message?limit=10",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("sendMessage POSTs to /session/{id}/message", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(
      mockFetch({ info: { id: "m1", role: "assistant", sessionID: "s1", agent: "", createdAt: 1 }, parts: [] })
    );
    await sendMessage("s1", "hello");
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:4096/session/s1/message",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ parts: [{ type: "text", text: "hello" }] }),
      })
    );
  });

  it("sendPromptAsync POSTs to /session/{id}/prompt_async and returns undefined on 204", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () =>
        Promise.resolve({
          ok: true,
          status: 204,
          text: () => Promise.resolve(""),
          json: () => Promise.resolve({}),
        } as Response)
    );
    await sendPromptAsync("s1", "hello");
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:4096/session/s1/prompt_async",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ parts: [{ type: "text", text: "hello" }] }),
      })
    );
  });

  it("abortSession POSTs to /session/{id}/abort", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(mockFetch(true));
    await abortSession("s1");
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:4096/session/s1/abort",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws on HTTP error", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(
      mockFetch({ detail: "not found" }, 404)
    );
    await expect(health()).rejects.toThrow("HTTP 404");
  });

  it("getEventStreamUrl returns correct URL", () => {
    expect(getEventStreamUrl()).toBe("http://127.0.0.1:4096/event");
  });
});

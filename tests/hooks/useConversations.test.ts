import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useConversations } from "@/hooks/useConversations";

describe("useConversations", () => {
  it("initializes with default conversations", () => {
    const { result } = renderHook(() => useConversations());
    expect(result.current.conversations.length).toBe(3);
    expect(result.current.activeConversation).not.toBeNull();
    expect(result.current.activeConversationId).not.toBeNull();
  });

  it("creates a new conversation and makes it active", () => {
    const { result } = renderHook(() => useConversations());
    let newId: string;
    act(() => {
      newId = result.current.createConversation("My Chat");
    });
    expect(result.current.conversations.length).toBe(4);
    expect(result.current.activeConversationId).toBe(newId);
    expect(result.current.activeConversation?.title).toBe("My Chat");
  });

  it("creates conversation with default title when none provided", () => {
    const { result } = renderHook(() => useConversations());
    act(() => {
      result.current.createConversation();
    });
    expect(result.current.conversations[0].title).toMatch(/New Conversation/);
  });

  it("switches between conversations", () => {
    const { result } = renderHook(() => useConversations());
    const firstId = result.current.conversations[0].id;
    const secondId = result.current.conversations[1].id;
    act(() => {
      result.current.switchConversation(secondId);
    });
    expect(result.current.activeConversationId).toBe(secondId);
    act(() => {
      result.current.switchConversation(firstId);
    });
    expect(result.current.activeConversationId).toBe(firstId);
  });

  it("returns false when switching to non-existent conversation", () => {
    const { result } = renderHook(() => useConversations());
    let switched: boolean;
    act(() => {
      switched = result.current.switchConversation("fake-id");
    });
    expect(switched!).toBe(false);
  });

  it("destroys a conversation and updates active", () => {
    const { result } = renderHook(() => useConversations());
    const firstId = result.current.conversations[0].id;
    act(() => {
      result.current.destroyConversation(firstId);
    });
    expect(result.current.conversations.length).toBe(2);
    expect(result.current.activeConversationId).not.toBe(firstId);
  });

  it("adds a user message and updates conversation title from first user message", () => {
    const { result } = renderHook(() => useConversations());
    const conv = result.current.conversations.find((c) => c.messages.length === 0)!;
    act(() => {
      result.current.addMessage(conv.id, "Hello world this is a test message", "user");
    });
    const updated = result.current.conversations.find((c) => c.id === conv.id)!;
    expect(updated.messages.length).toBe(1);
    expect(updated.messages[0].role).toBe("user");
    expect(updated.title).toBe("Hello world this is a test message");
  });

  it("adds an assistant message without changing title", () => {
    const { result } = renderHook(() => useConversations());
    const conv = result.current.conversations[0];
    const oldTitle = conv.title;
    act(() => {
      result.current.addMessage(conv.id, "Assistant reply", "assistant");
    });
    const updated = result.current.conversations.find((c) => c.id === conv.id)!;
    expect(updated.messages[updated.messages.length - 1].role).toBe("assistant");
    expect(updated.title).toBe(oldTitle);
  });

  it("exposes window.ConversationFlow API", async () => {
    renderHook(() => useConversations());
    await waitFor(() => {
      expect(window.ConversationFlow).toBeDefined();
    });
    expect(window.ConversationFlow!.conversations).toBeDefined();
    expect(window.ConversationFlow!.conversations.create).toBeTypeOf("function");
    expect(window.ConversationFlow!.conversations.destroy).toBeTypeOf("function");
    expect(window.ConversationFlow!.conversations.switch).toBeTypeOf("function");
    expect(window.ConversationFlow!.conversations.list).toBeTypeOf("function");
    expect(window.ConversationFlow!.conversations.sendMessage).toBeTypeOf("function");
    expect(window.ConversationFlow!.conversations.onConversationChange).toBeTypeOf("function");
    expect(window.ConversationFlow!.conversations.onActiveChange).toBeTypeOf("function");
  });

  it("window API create conversation works", async () => {
    const { result } = renderHook(() => useConversations());
    await waitFor(() => expect(window.ConversationFlow).toBeDefined());
    let newId: string;
    act(() => {
      newId = window.ConversationFlow!.conversations.create("API Chat");
    });
    expect(result.current.conversations.some((c) => c.id === newId!)).toBe(true);
  });

  it("window API onConversationChange listener fires", async () => {
    renderHook(() => useConversations());
    await waitFor(() => expect(window.ConversationFlow).toBeDefined());
    const cb = vi.fn();
    act(() => {
      window.ConversationFlow!.conversations.onConversationChange(cb);
    });
    expect(cb).toHaveBeenCalled();
    const beforeCount = cb.mock.calls.length;
    act(() => {
      window.ConversationFlow!.conversations.create("X");
    });
    expect(cb.mock.calls.length).toBeGreaterThan(beforeCount);
  });

  it("window API onActiveChange listener fires", async () => {
    renderHook(() => useConversations());
    await waitFor(() => expect(window.ConversationFlow).toBeDefined());
    const cb = vi.fn();
    act(() => {
      window.ConversationFlow!.conversations.onActiveChange(cb);
    });
    expect(cb).toHaveBeenCalled();
  });
});

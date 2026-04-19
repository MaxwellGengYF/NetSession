import { describe, it, expect } from "vitest";
import type { Message, Conversation, ConversationAPI } from "@/types/conversation";

describe("Conversation types runtime checks", () => {
  it("can create a valid Message object", () => {
    const msg: Message = {
      id: "msg_1",
      role: "user",
      content: "Hello",
      timestamp: new Date(),
    };
    expect(msg.id).toBe("msg_1");
    expect(msg.role).toBe("user");
    expect(msg.content).toBe("Hello");
    expect(msg.timestamp).toBeInstanceOf(Date);
  });

  it("Message can have optional suggestions", () => {
    const msg: Message = {
      id: "msg_2",
      role: "assistant",
      content: "Hi",
      timestamp: new Date(),
      suggestions: ["a", "b"],
    };
    expect(msg.suggestions).toEqual(["a", "b"]);
  });

  it("can create a valid Conversation object", () => {
    const conv: Conversation = {
      id: "conv_1",
      title: "Test",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(conv.id).toBe("conv_1");
    expect(conv.title).toBe("Test");
    expect(conv.messages).toEqual([]);
  });

  it("ConversationAPI interface shapes are callable", () => {
    const api: ConversationAPI = {
      create: (title?: string) => title ?? "id",
      destroy: () => true,
      switch: () => true,
      list: () => [],
      sendMessage: () => {},
      onConversationChange: () => () => {},
      onActiveChange: () => () => {},
    };
    expect(api.create("t")).toBe("t");
    expect(api.destroy("x")).toBe(true);
    expect(api.switch("x")).toBe(true);
    expect(api.list()).toEqual([]);
    expect(api.sendMessage).toBeTypeOf("function");
  });
});

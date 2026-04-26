import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatArea } from "@/components/ChatArea";
import type { Conversation } from "@/types/conversation";

const mockSendMessage = vi.fn();

vi.mock("@/hooks/useKimixSSE", () => ({
  useKimixSSE: () => ({
    connectionState: "open" as const,
    subscribe: vi.fn(() => () => {}),
    subscribeGlobal: vi.fn(() => () => {}),
    reconnect: vi.fn(),
  }),
}));

vi.mock("@/hooks/useKimix", () => ({
  useKimix: () => ({
    connectionState: "open" as const,
    openSession: vi.fn(() => Promise.resolve("sess-1")),
    closeSession: vi.fn(() => Promise.resolve()),
    sendMessage: mockSendMessage,
    abort: vi.fn(),
  }),
}));

describe("kimix integration flow", () => {
  it("sends message and receives streaming response", async () => {
    mockSendMessage.mockImplementation(
      (_sid: string, _text: string, onDelta: (d: { text: string; done: boolean }) => void) => {
        onDelta({ text: "Hello", done: false });
        onDelta({ text: " world", done: false });
        onDelta({ text: "", done: true });
        return Promise.resolve();
      }
    );

    const conversation: Conversation = {
      id: "c1",
      title: "Test",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      sessionId: "sess-1",
    };

    const onSendMessage = vi.fn();
    const onAppendToLastMessage = vi.fn();

    render(
      <ChatArea
        conversation={conversation}
        onSendMessage={onSendMessage}
        onAppendToLastMessage={onAppendToLastMessage}
      />
    );

    const textarea = screen.getByPlaceholderText(/type your message/i);
    await userEvent.type(textarea, "Hi there");
    const sendButton = screen.getByTestId("send-button");
    expect(sendButton).not.toBeDisabled();
    await userEvent.click(sendButton);

    // User message appears immediately
    expect(onSendMessage).toHaveBeenCalledWith("Hi there", "user");

    // Streaming deltas are delivered
    expect(mockSendMessage).toHaveBeenCalledWith("sess-1", "Hi there", expect.any(Function));
    expect(onAppendToLastMessage).toHaveBeenCalledWith("c1", "Hello");
    expect(onAppendToLastMessage).toHaveBeenCalledWith("c1", " world");
  });

  it("shows connected status when SSE is open", () => {
    const conversation: Conversation = {
      id: "c1",
      title: "Test",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      sessionId: "sess-1",
    };

    render(<ChatArea conversation={conversation} onSendMessage={vi.fn()} />);
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });
});

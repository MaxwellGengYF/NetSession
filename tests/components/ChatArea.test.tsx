import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatArea } from "@/components/ChatArea";
import type { Conversation } from "@/types/conversation";

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
    sendMessage: vi.fn((_sid, _text, onDelta) => {
      onDelta({ text: "Response", done: true });
      return Promise.resolve();
    }),
    abort: vi.fn(),
    closeSession: vi.fn(),
  }),
}));

const emptyConversation: Conversation = {
  id: "c1",
  title: "Empty",
  messages: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const populatedConversation: Conversation = {
  id: "c2",
  title: "Chat",
  messages: [
    {
      id: "m1",
      role: "user",
      content: "Hi",
      timestamp: new Date(),
    },
    {
      id: "m2",
      role: "assistant",
      content: "Hello there",
      timestamp: new Date(),
      suggestions: ["Tip 1", "Tip 2"],
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("ChatArea", () => {
  it("shows placeholder when no conversation", () => {
    render(<ChatArea conversation={null} onSendMessage={vi.fn()} />);
    expect(screen.getByText(/select or create a conversation/i)).toBeInTheDocument();
  });

  it("shows welcome state for empty conversation", () => {
    render(<ChatArea conversation={emptyConversation} onSendMessage={vi.fn()} />);
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    expect(screen.getByText("Analyze existing design")).toBeInTheDocument();
  });

  it("renders messages for populated conversation", () => {
    render(<ChatArea conversation={populatedConversation} onSendMessage={vi.fn()} />);
    expect(screen.getByText("Hi")).toBeInTheDocument();
    expect(screen.getByText("Hello there")).toBeInTheDocument();
  });

  it("calls onSendMessage when user types and clicks send", async () => {
    const onSend = vi.fn();
    render(<ChatArea conversation={populatedConversation} onSendMessage={onSend} />);
    const textarea = screen.getByPlaceholderText(/type your message/i);
    await userEvent.type(textarea, "My message");
    const sendButton = screen.getByTestId("send-button");
    await userEvent.click(sendButton);
    expect(onSend).toHaveBeenCalledWith("My message", "user");
  });

  it("calls onSendMessage on Enter key", async () => {
    const onSend = vi.fn();
    render(<ChatArea conversation={populatedConversation} onSendMessage={onSend} />);
    const textarea = screen.getByPlaceholderText(/type your message/i);
    await userEvent.type(textarea, "Enter message{Enter}");
    expect(onSend).toHaveBeenCalledWith("Enter message", "user");
  });

  it("does not send empty message", async () => {
    const onSend = vi.fn();
    render(<ChatArea conversation={populatedConversation} onSendMessage={onSend} />);
    const sendButton = screen.getByTestId("send-button");
    await userEvent.click(sendButton);
    expect(onSend).not.toHaveBeenCalled();
  });

  it("triggers quick action on welcome cards", async () => {
    const onSend = vi.fn();
    render(<ChatArea conversation={emptyConversation} onSendMessage={onSend} />);
    await userEvent.click(screen.getByText("Analyze existing design"));
    expect(onSend).toHaveBeenCalledWith(
      "Analyze this design and suggest improvements for visual hierarchy and user experience.",
      "user"
    );
  });

  it("renders code blocks in assistant messages", () => {
    const convWithCode: Conversation = {
      id: "c3",
      title: "Code",
      messages: [
        {
          id: "m3",
          role: "assistant",
          content: "Here is code:\n```css\n.body { color: red; }\n```",
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    render(<ChatArea conversation={convWithCode} onSendMessage={vi.fn()} />);
    expect(screen.getByText("css")).toBeInTheDocument();
    expect(screen.getByText(".body { color: red; }")).toBeInTheDocument();
  });

  it("renders suggestion pills and clicking triggers onSendMessage", async () => {
    const onSend = vi.fn();
    render(<ChatArea conversation={populatedConversation} onSendMessage={onSend} />);
    const pill = screen.getByText("Tip 1");
    expect(pill).toBeInTheDocument();
    await userEvent.click(pill);
    await waitFor(() => expect(onSend).toHaveBeenCalledWith("Tip 1", "user"));
  });

  it("shows connected status when SSE is open", () => {
    render(<ChatArea conversation={populatedConversation} onSendMessage={vi.fn()} />);
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });
});

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

// JavaScript API interfaces exposed to window
export interface ConversationAPI {
  create: (title?: string) => string;
  destroy: (id: string) => boolean;
  switch: (id: string) => boolean;
  list: () => { id: string; title: string }[];
  sendMessage: (conversationId: string, content: string) => void;
  onConversationChange: (callback: (conversations: Conversation[]) => void) => void;
  onActiveChange: (callback: (conversationId: string | null) => void) => void;
}

declare global {
  interface Window {
    ConversationFlow?: {
      conversations: ConversationAPI;
    };
  }
}

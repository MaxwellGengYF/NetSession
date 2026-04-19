import { useState, useCallback, useRef, useEffect } from 'react';
import type { Conversation, Message } from '@/types/conversation';

let globalIdCounter = 0;
const generateId = () => `conv_${Date.now()}_${globalIdCounter++}`;

const initialConversations: Conversation[] = [
  {
    id: generateId(),
    title: 'Mobile App UX Analysis',
    messages: [
      {
        id: 'msg_1',
        role: 'user',
        content: 'Analyze the UX of this mobile app mockup. I need to know if the navigation is intuitive enough for first-time users.',
        timestamp: new Date(Date.now() - 3600000),
      },
      {
        id: 'msg_2',
        role: 'assistant',
        content: 'I\'ve analyzed your mobile app mockup. The navigation structure follows a standard bottom-tab pattern which is familiar to most users. However, I noticed a few areas that could be improved:\n\n1. **Tab Labels**: The icons lack text labels, which may confuse users unfamiliar with the iconography.\n2. **Active State**: The active tab indicator is subtle - consider increasing contrast.\n3. **Gesture Support**: No visible back gesture affordance in the sub-screens.\n\nOverall score: 7.5/10 for intuitiveness.',
        timestamp: new Date(Date.now() - 3500000),
        suggestions: ['Refine layout', 'Add spacing', 'Responsive check'],
      },
    ],
    createdAt: new Date(Date.now() - 3600000),
    updatedAt: new Date(Date.now() - 3500000),
  },
  {
    id: generateId(),
    title: 'Dashboard Layout Redesign',
    messages: [
      {
        id: 'msg_3',
        role: 'user',
        content: 'Help me redesign the analytics dashboard. The current layout feels cluttered with too many competing elements.',
        timestamp: new Date(Date.now() - 7200000),
      },
      {
        id: 'msg_4',
        role: 'assistant',
        content: 'For your dashboard redesign, I recommend a clear visual hierarchy:\n\n- **Primary Zone**: Reserve the top-left area for the most critical KPI cards (F-pattern reading).\n- **Chart Area**: Use a 2/3 width column for the main trend chart, with a 1/3 sidebar for breakdown tables.\n- **Whitespace**: Increase padding between modules from 12px to 24px to reduce cognitive load.\n- **Color System**: Use a muted palette for secondary metrics, reserving brand purple for alerts and anomalies.',
        timestamp: new Date(Date.now() - 7100000),
        suggestions: ['Generate wireframe', 'Color palette', 'Spacing system'],
      },
    ],
    createdAt: new Date(Date.now() - 7200000),
    updatedAt: new Date(Date.now() - 7100000),
  },
  {
    id: generateId(),
    title: 'Animation Code Review',
    messages: [],
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 86400000),
  },
];

// TODO: Persist conversations to localStorage or backend API
export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConversations[0]?.id ?? null);
  const changeListeners = useRef<((conversations: Conversation[]) => void)[]>([]);
  const activeListeners = useRef<((conversationId: string | null) => void)[]>([]);

  const notifyChange = useCallback((newConversations: Conversation[]) => {
    changeListeners.current.forEach(cb => cb(newConversations));
  }, []);

  const notifyActive = useCallback((id: string | null) => {
    activeListeners.current.forEach(cb => cb(id));
  }, []);

  // TODO: Validate title input and prevent duplicate session names
  const createConversation = useCallback((title?: string) => {
    const newConv: Conversation = {
      id: generateId(),
      title: title || `New Conversation ${conversations.length + 1}`,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setConversations(prev => {
      const updated = [newConv, ...prev];
      notifyChange(updated);
      return updated;
    });
    setActiveConversationId(newConv.id);
    notifyActive(newConv.id);
    return newConv.id;
  }, [conversations.length, notifyChange, notifyActive]);

  // TODO: Add confirmation dialog and support soft-delete / archiving before removal
  const destroyConversation = useCallback((id: string) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id);
      notifyChange(updated);
      if (activeConversationId === id) {
        const newActive = updated[0]?.id ?? null;
        setActiveConversationId(newActive);
        notifyActive(newActive);
      }
      return updated;
    });
    return true;
  }, [activeConversationId, notifyChange, notifyActive]);

  const switchConversation = useCallback((id: string) => {
    const exists = conversations.some(c => c.id === id);
    if (!exists) return false;
    setActiveConversationId(id);
    notifyActive(id);
    return true;
  }, [conversations, notifyActive]);

  const addMessage = useCallback((conversationId: string, content: string, role: 'user' | 'assistant') => {
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      role,
      content,
      timestamp: new Date(),
    };
    setConversations(prev => {
      const updated = prev.map(c => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          messages: [...c.messages, newMessage],
          updatedAt: new Date(),
          title: c.messages.length === 0 && role === 'user'
            ? content.slice(0, 40) + (content.length > 40 ? '...' : '')
            : c.title,
        };
      });
      notifyChange(updated);
      return updated;
    });
  }, [notifyChange]);

  const activeConversation = conversations.find(c => c.id === activeConversationId) ?? null;

  // TODO: Remove global window API or secure it before production release
  // Expose API to window
  useEffect(() => {
    const api = {
      conversations: {
        create: (title?: string) => createConversation(title),
        destroy: (id: string) => {
          destroyConversation(id);
          return true;
        },
        switch: (id: string) => switchConversation(id),
        list: () => conversations.map(c => ({ id: c.id, title: c.title })),
        sendMessage: (conversationId: string, content: string) => {
          addMessage(conversationId, content, 'user');
        },
        onConversationChange: (callback: (conversations: Conversation[]) => void) => {
          changeListeners.current.push(callback);
          callback(conversations);
          return () => {
            changeListeners.current = changeListeners.current.filter(cb => cb !== callback);
          };
        },
        onActiveChange: (callback: (conversationId: string | null) => void) => {
          activeListeners.current.push(callback);
          callback(activeConversationId);
          return () => {
            activeListeners.current = activeListeners.current.filter(cb => cb !== callback);
          };
        },
      },
    };
    window.ConversationFlow = api;
  }, [conversations, activeConversationId, createConversation, destroyConversation, switchConversation, addMessage]);

  return {
    conversations,
    activeConversation,
    activeConversationId,
    createConversation,
    destroyConversation,
    switchConversation,
    addMessage,
  };
}

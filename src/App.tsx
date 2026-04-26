import { useState, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { HelpModal } from '@/components/HelpModal';
import { useConversations } from '@/hooks/useConversations';

export default function App() {
  const {
    conversations,
    activeConversation,
    activeConversationId,
    createConversation,
    destroyConversation,
    switchConversation,
    setSessionId,
    addMessage,
    appendToLastMessage,
  } = useConversations();

  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const handleSendMessage = useCallback(
    (content: string, role: 'user' | 'assistant') => {
      if (!activeConversationId) return;
      addMessage(activeConversationId, content, role);
    },
    [activeConversationId, addMessage]
  );

  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ backgroundColor: '#0D0D0D' }}
    >
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onCreateConversation={() => createConversation()}
        onSwitchConversation={switchConversation}
        onDestroyConversation={destroyConversation}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Main Chat Area */}
      <main className="flex-1 overflow-hidden">
        <ChatArea
          conversation={activeConversation}
          onSendMessage={handleSendMessage}
          onSetSessionId={setSessionId}
          onAppendToLastMessage={appendToLastMessage}
        />
      </main>

      {/* Help Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}

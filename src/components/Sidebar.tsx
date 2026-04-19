import { useState } from 'react';
import { Plus, HelpCircle, Settings, MoreHorizontal, MessageSquare, Trash2 } from 'lucide-react';
import type { Conversation } from '@/types/conversation';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onCreateConversation: () => void;
  onSwitchConversation: (id: string) => void;
  onDestroyConversation: (id: string) => void;
  onOpenHelp: () => void;
}

export function Sidebar({
  conversations,
  activeConversationId,
  onCreateConversation,
  onSwitchConversation,
  onDestroyConversation,
  onOpenHelp,
}: SidebarProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  return (
    <aside
      className="flex flex-col h-full"
      style={{
        width: 260,
        minWidth: 260,
        backgroundColor: '#141414',
        borderRight: '1px solid #2A2A2A',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <img src="/logo.png" alt="ConversationFlow" className="w-8 h-8" />
        <span
          className="text-sm font-semibold tracking-wide"
          style={{ color: '#FFFFFF' }}
        >
          ConversationFlow
        </span>
      </div>

      {/* TODO: Allow template selection or prompt before creating a new session */}
      {/* New Chat Button */}
      <div className="px-4 mb-4">
        <button
          onClick={onCreateConversation}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
          style={{
            background: 'linear-gradient(90deg, #5B4BD3, #8E7CF5)',
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          New Chat
        </button>
      </div>

      {/* History Label */}
      <div className="px-5 mb-2">
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: '#52525B' }}
        >
          History
        </span>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-3">
        {conversations.map((conv) => {
          const isActive = conv.id === activeConversationId;
          return (
            <div
              key={conv.id}
              className="group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 mb-1"
              style={{
                backgroundColor: isActive ? '#1F1F1F' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#1F1F1F';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              onClick={() => onSwitchConversation(conv.id)}
            >
              <MessageSquare
                size={16}
                style={{ color: isActive ? '#6C5CE7' : '#52525B' }}
                className="flex-shrink-0"
              />
              <span
                className="text-sm truncate flex-1"
                style={{ color: isActive ? '#FFFFFF' : '#A1A1AA' }}
              >
                {conv.title}
              </span>
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-md hover:bg-[#2A2A2A]"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenId(menuOpenId === conv.id ? null : conv.id);
                }}
              >
                <MoreHorizontal size={14} style={{ color: '#52525B' }} />
              </button>
              {/* TODO: Close dropdown on outside click and add keyboard navigation */}
              {/* Dropdown menu */}
              {menuOpenId === conv.id && (
                <div
                  className="absolute right-2 top-10 z-50 rounded-lg py-1 shadow-lg"
                  style={{
                    backgroundColor: '#1F1F1F',
                    border: '1px solid #2A2A2A',
                    minWidth: 140,
                  }}
                >
                  {/* TODO: Add a confirmation modal before destroying the session */}
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors duration-150 hover:bg-[#2A2A2A]"
                    style={{ color: '#A1A1AA' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDestroyConversation(conv.id);
                      setMenuOpenId(null);
                    }}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div
        className="px-3 py-3 space-y-1"
        style={{ borderTop: '1px solid #2A2A2A' }}
      >
        <button
          onClick={onOpenHelp}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-[#1F1F1F]"
        >
          <HelpCircle size={16} style={{ color: '#52525B' }} />
          <span className="text-sm" style={{ color: '#A1A1AA' }}>
            Help
          </span>
        </button>
        <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-[#1F1F1F]">
          <Settings size={16} style={{ color: '#52525B' }} />
          <span className="text-sm" style={{ color: '#A1A1AA' }}>
            Settings
          </span>
        </button>
      </div>
    </aside>
  );
}

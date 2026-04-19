import { useState } from 'react';
import { X, Play, Volume2, Maximize, MessageCircle, BookOpen, Zap } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'videos' | 'faq' | 'release';

const faqItems = [
  {
    icon: MessageCircle,
    question: 'How to start a new conversation',
    answer: 'Click the "New Chat" button in the sidebar or use the window.ConversationFlow.conversations.create() API.',
  },
  {
    icon: BookOpen,
    question: 'Managing conversation history',
    answer: 'All conversations are listed in the sidebar. Hover over any conversation to access the delete option.',
  },
  {
    icon: Zap,
    question: 'Using the JavaScript API',
    answer: 'Open your browser console and use window.ConversationFlow.conversations to create, destroy, and manage chats programmatically.',
  },
  {
    icon: MessageCircle,
    question: 'Keyboard shortcuts',
    answer: 'Press Enter to send a message, Shift+Enter for a new line. Use Ctrl+N to quickly start a new conversation.',
  },
];

const releaseNotes = [
  { version: 'v2.1.0', date: '2026-04-15', note: 'Added JavaScript API for conversation management' },
  { version: 'v2.0.0', date: '2026-03-20', note: 'Redesigned UI with dark cyberpunk theme' },
  { version: 'v1.5.0', date: '2026-02-10', note: 'Multi-conversation support and sidebar navigation' },
];

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('videos');
  const [isPlaying, setIsPlaying] = useState(false);

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string }[] = [
    { id: 'videos', label: 'Video Tutorials' },
    { id: 'faq', label: 'FAQ' },
    { id: 'release', label: 'Release Notes' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in-up flex overflow-hidden"
        style={{
          width: 800,
          maxWidth: '90vw',
          height: 560,
          maxHeight: '90vh',
          backgroundColor: '#141414',
          borderRadius: 24,
          border: '1px solid #2A2A2A',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Navigation */}
        <div
          className="flex flex-col py-6 px-4"
          style={{
            width: 200,
            minWidth: 200,
            borderRight: '1px solid #2A2A2A',
          }}
        >
          <h2
            className="text-lg font-semibold px-3 mb-6"
            style={{ color: '#FFFFFF' }}
          >
            Help Center
          </h2>
          <nav className="space-y-1 flex-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center w-full px-3 py-2.5 rounded-lg text-sm transition-all duration-200"
                style={{
                  color: activeTab === tab.id ? '#FFFFFF' : '#A1A1AA',
                  backgroundColor: activeTab === tab.id ? '#1F1F1F' : 'transparent',
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-200 hover:bg-[#2A2A2A] self-end"
          >
            <X size={18} style={{ color: '#52525B' }} />
          </button>
        </div>

        {/* Right Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'videos' && (
            <div>
              {/* Video Player */}
              <div
                className="relative rounded-xl overflow-hidden mb-6 cursor-pointer group"
                style={{
                  aspectRatio: '16/9',
                  backgroundColor: '#000',
                }}
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {!isPlaying && (
                  <img
                    src="/video-thumbnail.jpg"
                    alt="Tutorial"
                    className="w-full h-full object-cover opacity-80"
                  />
                )}
                {isPlaying && (
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#0D0D0D' }}>
                    <div className="text-center">
                      <div
                        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{
                          background: 'linear-gradient(90deg, #5B4BD3, #8E7CF5)',
                          opacity: 0.9,
                        }}
                      >
                        <Play size={32} fill="white" color="white" className="ml-1" />
                      </div>
                      <p style={{ color: '#A1A1AA' }} className="text-sm">Video simulation playing...</p>
                    </div>
                  </div>
                )}
                {/* Play Overlay */}
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-all duration-200">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                      style={{
                        background: 'linear-gradient(90deg, #5B4BD3, #8E7CF5)',
                        opacity: 0.9,
                      }}
                    >
                      <Play size={28} fill="white" color="white" className="ml-1" />
                    </div>
                  </div>
                )}
                {/* Controls Bar */}
                <div
                  className="absolute bottom-0 left-0 right-0 px-4 py-3 flex items-center gap-3"
                  style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                >
                  <Play size={14} style={{ color: '#FFFFFF' }} />
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#2A2A2A' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: isPlaying ? '60%' : '0%',
                        backgroundColor: '#6C5CE7',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono" style={{ color: '#52525B' }}>
                    {isPlaying ? '03:24' : '00:00'}
                  </span>
                  <Volume2 size={14} style={{ color: '#52525B' }} />
                  <Maximize size={14} style={{ color: '#52525B' }} />
                </div>
              </div>
              <h3 className="text-base font-semibold mb-2" style={{ color: '#FFFFFF' }}>
                Getting Started with ConversationFlow
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#A1A1AA' }}>
                Learn the basics of creating conversations, managing your chat history, and using the JavaScript API to integrate ConversationFlow into your workflow.
              </p>
            </div>
          )}

          {activeTab === 'faq' && (
            <div>
              <h3 className="text-base font-semibold mb-4" style={{ color: '#FFFFFF' }}>
                Frequently Asked Questions
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {faqItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-xl transition-all duration-200 hover:border-[#6C5CE7] glow-purple"
                    style={{
                      backgroundColor: '#141414',
                      border: '1px solid #2A2A2A',
                    }}
                  >
                    <item.icon size={20} style={{ color: '#6C5CE7' }} className="mb-3" />
                    <h4 className="text-sm font-medium mb-2" style={{ color: '#FFFFFF' }}>
                      {item.question}
                    </h4>
                    <p className="text-xs leading-relaxed" style={{ color: '#A1A1AA' }}>
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'release' && (
            <div>
              <h3 className="text-base font-semibold mb-4" style={{ color: '#FFFFFF' }}>
                Release Notes
              </h3>
              <div className="space-y-3">
                {releaseNotes.map((note, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-4 p-4 rounded-xl"
                    style={{
                      backgroundColor: '#0D0D0D',
                      border: '1px solid #2A2A2A',
                    }}
                  >
                    <span
                      className="text-xs font-mono px-2 py-1 rounded-md flex-shrink-0"
                      style={{
                        backgroundColor: '#1F1F1F',
                        color: '#6C5CE7',
                      }}
                    >
                      {note.version}
                    </span>
                    <div>
                      <span className="text-xs font-mono block mb-1" style={{ color: '#52525B' }}>
                        {note.date}
                      </span>
                      <p className="text-sm" style={{ color: '#A1A1AA' }}>
                        {note.note}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

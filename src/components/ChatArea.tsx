import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Code, Palette, Layout, Sparkles } from 'lucide-react';
import type { Conversation } from '@/types/conversation';

interface ChatAreaProps {
  conversation: Conversation | null;
  onSendMessage: (content: string) => void;
}

const quickActions = [
  { icon: Palette, label: 'Analyze existing design', prompt: 'Analyze this design and suggest improvements for visual hierarchy and user experience.' },
  { icon: Code, label: 'Write code for animation', prompt: 'Write CSS animation code for a smooth fade-in effect with easing.' },
  { icon: Layout, label: 'Generate layout structure', prompt: 'Suggest a responsive grid layout for a dashboard with sidebar navigation.' },
];

const aiResponses: Record<string, { content: string; suggestions?: string[] }> = {
  default: {
    content: 'I understand. Let me analyze that for you.\n\nBased on your request, I can see several key points to consider:\n\n1. **Structure**: The overall architecture looks solid, but there are areas for optimization.\n2. **Performance**: Consider lazy loading for heavy components to improve initial render time.\n3. **Accessibility**: Ensure all interactive elements have proper focus states and ARIA labels.\n4. **Consistency**: Maintain a unified design language across all modules.\n\nWould you like me to dive deeper into any of these areas?',
    suggestions: ['Refine layout', 'Add spacing', 'Responsive check'],
  },
  'design': {
    content: 'I\'ve analyzed your design mockup. Here are my findings:\n\n**Visual Hierarchy**\nThe main CTA button stands out well with the purple gradient, but the secondary actions could use more differentiation. Consider using a lighter shade for inactive states.\n\n**Typography**\nThe heading hierarchy is clear. However, the body text line-height could be increased to 1.6 for better readability on dark backgrounds.\n\n**Color System**\nThe dark theme works well. The #6C5CE7 purple accent provides good contrast against #0D0D0D background (ratio: 5.2:1).\n\n**Spacing**\nThe 24px card padding feels comfortable. Consider adding 8px micro-gaps between related elements within cards.\n\nOverall: Strong foundation with minor refinements needed.',
    suggestions: ['Color audit', 'Spacing system', 'Typography scale'],
  },
  'code': {
    content: 'Here\'s the animation code you requested:\n\n```css\n@keyframes fadeInUp {\n  from {\n    opacity: 0;\n    transform: translateY(20px) scale(0.95);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0) scale(1);\n  }\n}\n\n.animate-fade-in-up {\n  animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;\n}\n```\n\nThis uses a custom cubic-bezier curve for a smooth, professional feel. The 20px vertical offset creates a subtle upward motion, while the 0.95 scale adds a slight "pop" effect.\n\n**Usage:**\n```html\n<div class="animate-fade-in-up">Content</div>\n```',
    suggestions: ['Easing variants', 'Stagger delays', 'Reduced motion'],
  },
  'layout': {
    content: 'Here\'s a responsive dashboard layout structure:\n\n```\n┌─────────────────────────────────────┐\n│  Sidebar │  Header (64px)           │\n│  (260px) ├──────────────────────────┤\n│          │  KPI Cards (3-col grid)  │\n│          ├──────────────────────────┤\n│          │  Main Chart  │  Breakdown │\n│          │  (2/3 width) │  (1/3)     │\n│          ├──────────────────────────┤\n│          │  Data Table              │\n└─────────────────────────────────────┘\n```\n\n**Grid Config:**\n- Desktop: `grid-template-columns: 260px 1fr`\n- Tablet (<1024px): Collapse sidebar to 64px icons-only\n- Mobile (<768px): Bottom tab bar, single column\n\n**Breakpoints:**\n- `sm`: 640px\n- `md`: 768px  \n- `lg`: 1024px\n- `xl`: 1280px',
    suggestions: ['Grid code', 'Breakpoint config', 'Dark mode toggle'],
  },
};

function getAIResponse(userMessage: string): { content: string; suggestions?: string[] } {
  const lower = userMessage.toLowerCase();
  if (lower.includes('design') || lower.includes('analyze') || lower.includes('visual')) {
    return aiResponses.design;
  }
  if (lower.includes('code') || lower.includes('animation') || lower.includes('css')) {
    return aiResponses.code;
  }
  if (lower.includes('layout') || lower.includes('grid') || lower.includes('responsive')) {
    return aiResponses.layout;
  }
  return aiResponses.default;
}

export function ChatArea({ conversation, onSendMessage }: ChatAreaProps) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages.length]);

  const handleSend = () => {
    const content = inputValue.trim();
    if (!content || !conversation) return;

    onSendMessage(content);
    setInputValue('');
    textareaRef.current?.focus();

    // Simulate AI response after a short delay
    setTimeout(() => {
      const response = getAIResponse(content);
      onSendMessage(response.content);
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (prompt: string) => {
    if (!conversation) return;
    onSendMessage(prompt);
    setTimeout(() => {
      const response = getAIResponse(prompt);
      onSendMessage(response.content);
    }, 800);
  };

  if (!conversation) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ backgroundColor: '#0D0D0D' }}
      >
        <p style={{ color: '#52525B' }}>Select or create a conversation to begin</p>
      </div>
    );
  }

  const isEmpty = conversation.messages.length === 0;

  return (
    <div
      className="flex flex-col h-full relative"
      style={{ backgroundColor: '#0D0D0D' }}
    >
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isEmpty ? (
          /* Welcome State */
          <div className="flex flex-col items-center justify-center h-full">
            <h1
              className="text-4xl md:text-5xl font-extrabold mb-10 gradient-text text-center"
            >
              Welcome back, Alex
            </h1>
            <div className="grid grid-cols-3 gap-4 max-w-3xl w-full">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickAction(action.prompt)}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl transition-all duration-300 hover:border-[#6C5CE7] hover:glow-purple group"
                  style={{
                    border: '1px solid #2A2A2A',
                    backgroundColor: '#141414',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: '#1F1F1F' }}
                  >
                    <action.icon size={20} style={{ color: '#6C5CE7' }} />
                  </div>
                  <span className="text-sm font-medium text-center" style={{ color: '#A1A1AA' }}>
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Chat Flow */
          <div className="space-y-6 max-w-4xl mx-auto">
            {conversation.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <img
                      src="/ai-avatar.png"
                      alt="AI"
                      className="w-10 h-10 rounded-lg"
                      style={{ boxShadow: '0 2px 8px rgba(108, 92, 231, 0.3)' }}
                    />
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div
                    className="inline-block text-left"
                    style={{
                      maxWidth: '85%',
                    }}
                  >
                    {msg.role === 'user' ? (
                      <div
                        className="px-5 py-3 rounded-2xl rounded-tr-md inline-block"
                        style={{
                          backgroundColor: 'transparent',
                          border: '1px solid rgba(108, 92, 231, 0.2)',
                        }}
                      >
                        <p className="text-sm leading-relaxed" style={{ color: '#FFFFFF' }}>
                          {msg.content}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div
                          className="px-5 py-4 rounded-2xl rounded-tl-md"
                          style={{ backgroundColor: '#141414' }}
                        >
                          <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#A1A1AA' }}>
                            {msg.content.split('```').map((part, partIdx) => {
                              if (partIdx % 2 === 1) {
                                // Code block
                                const lines = part.split('\n');
                                const lang = lines[0]?.trim();
                                const code = lines.slice(1).join('\n');
                                return (
                                  <div
                                    key={partIdx}
                                    className="my-3 rounded-lg overflow-hidden"
                                    style={{ backgroundColor: '#0D0D0D', border: '1px solid #2A2A2A' }}
                                  >
                                    {lang && (
                                      <div
                                        className="px-4 py-2 text-xs font-mono flex items-center justify-between"
                                        style={{ backgroundColor: '#1F1F1F', color: '#52525B' }}
                                      >
                                        <span>{lang}</span>
                                      </div>
                                    )}
                                    <pre className="p-4 overflow-x-auto">
                                      <code className="text-xs font-mono leading-relaxed" style={{ color: '#A1A1AA' }}>
                                        {code}
                                      </code>
                                    </pre>
                                  </div>
                                );
                              }
                              return (
                                <span key={partIdx}>
                                  {part.split('\n').map((line, lineIdx, arr) => (
                                    <span key={lineIdx}>
                                      {line}
                                      {lineIdx < arr.length - 1 && <br />}
                                    </span>
                                  ))}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        {/* Suggestion Pills */}
                        {msg.suggestions && msg.suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-2 pl-2">
                            {msg.suggestions.map((suggestion, sIdx) => (
                              <button
                                key={sIdx}
                                onClick={() => handleQuickAction(suggestion)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-200 hover:border-[#6C5CE7] hover:glow-purple"
                                style={{
                                  backgroundColor: '#1F1F1F',
                                  border: '1px solid #2A2A2A',
                                  color: '#A1A1AA',
                                }}
                              >
                                <Sparkles size={12} style={{ color: '#6C5CE7' }} />
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Timestamp */}
                  <div className={`mt-1 ${msg.role === 'user' ? 'text-right pr-2' : 'text-left pl-2'}`}>
                    <span className="text-xs font-mono" style={{ color: '#52525B' }}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div
        className="px-6 pb-6 pt-2"
        style={{ backgroundColor: '#0D0D0D' }}
      >
        {/* Floating toolbar */}
        <div className="flex items-center gap-2 mb-2 px-1">
          <button
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all duration-200 hover:bg-[#1F1F1F]"
            style={{ color: '#52525B' }}
          >
            <Code size={12} />
            Edit
          </button>
        </div>

        <div
          className="flex items-end gap-3 rounded-2xl transition-all duration-300"
          style={{
            backgroundColor: '#141414',
            border: isFocused ? '1px solid #6C5CE7' : '1px solid #2A2A2A',
            boxShadow: isFocused ? '0 0 15px rgba(108, 92, 231, 0.2)' : 'none',
            padding: '12px 16px',
          }}
        >
          <button
            className="flex-shrink-0 p-2 rounded-lg transition-colors duration-200 hover:bg-[#1F1F1F] mb-0.5"
            style={{ color: '#52525B' }}
          >
            <Paperclip size={18} />
          </button>
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Type your message..."
            className="flex-1 bg-transparent text-sm resize-none outline-none py-2 max-h-32"
            style={{
              color: '#FFFFFF',
              fontFamily: "'Inter', sans-serif",
            }}
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="flex-shrink-0 p-2.5 rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105"
            style={{
              background: inputValue.trim()
                ? 'linear-gradient(90deg, #5B4BD3, #8E7CF5)'
                : '#2A2A2A',
            }}
          >
            <Send size={16} color="white" />
          </button>
        </div>
        <p className="text-center mt-2 text-xs" style={{ color: '#52525B' }}>
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Code, Palette, Layout, Sparkles } from 'lucide-react';
import type { Conversation } from '@/types/conversation';
import { useRpcSocket } from '@/hooks/useRpcSocket';

interface ChatAreaProps {
  conversation: Conversation | null;
  onSendMessage: (content: string, role: 'user' | 'assistant') => void;
  onSetSessionId?: (conversationId: string, sessionId: string) => void;
}

const quickActions = [
  { icon: Palette, label: 'Analyze existing design', prompt: 'Analyze this design and suggest improvements for visual hierarchy and user experience.' },
  { icon: Code, label: 'Write code for animation', prompt: 'Write CSS animation code for a smooth fade-in effect with easing.' },
  { icon: Layout, label: 'Generate layout structure', prompt: 'Suggest a responsive grid layout for a dashboard with sidebar navigation.' },
];


export function ChatArea({ conversation, onSendMessage, onSetSessionId }: ChatAreaProps) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { readyState, sendRequest } = useRpcSocket('ws://127.0.0.1:8889');
  const sessionIdRef = useRef<string | null>(null);
  const openedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages.length, isProcessing]);

  // Sync sessionIdRef when parent provides sessionId
  useEffect(() => {
    if (conversation?.sessionId) {
      sessionIdRef.current = conversation.sessionId;
    }
  }, [conversation?.sessionId]);

  // Open session lazily on first focus of a conversation
  useEffect(() => {
    if (!conversation || readyState !== 'open') return;
    if (conversation.sessionId) return;
    if (openedRef.current.has(conversation.id)) return;

    openedRef.current.add(conversation.id);
    let cancelled = false;
    sendRequest('open_session', []).then((sid) => {
      if (!cancelled && typeof sid === 'string') {
        sessionIdRef.current = sid;
        onSetSessionId?.(conversation.id, sid);
      }
    });

    // Intentionally no cleanup: session stays open on unfocus
  }, [conversation?.id, readyState, sendRequest, onSetSessionId]);

  const pollForResponse = async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;

    let finished = false;

    while (!finished) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        const chunks = (await sendRequest('get_output_from_client', [sid])) as string[];
        if (Array.isArray(chunks)) {
          for (const chunk of chunks) {
            if (chunk) {
              onSendMessage(chunk, 'assistant');
            }
          }
        } else if (chunks) {
          onSendMessage(String(chunks), 'assistant');
        }
        finished = (await sendRequest('is_session_finished', [sid])) as boolean;
      } catch (e) {
        console.error('Polling error:', e);
        break;
      }
    }

    setIsProcessing(false);
  };

  const handleSend = (overrideContent?: string) => {
    const content = (overrideContent ?? inputValue).trim();
    if (!content || !conversation) return;

    const sid = sessionIdRef.current;
    if (!sid) return;

    onSendMessage(content, 'user');
    setInputValue('');
    textareaRef.current?.focus();

    setIsProcessing(true);
    sendRequest('input_from_client', [sid, content])
      .then((result) => {
        if (result === 'processing') {
          pollForResponse();
        } else {
          setIsProcessing(false);
          onSendMessage(String(result), 'assistant');
        }
      })
      .catch((err) => {
        setIsProcessing(false);
        console.error('RPC error:', err);
        onSendMessage(`Error: ${err.message}`, 'assistant');
      });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (prompt: string) => {
    if (!conversation) return;
    handleSend(prompt);
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
      <div className="relative flex-1 overflow-y-auto px-6 py-6">
        {/* Connection Status */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <div
            className={`w-2 h-2 rounded-full ${
              readyState === 'open'
                ? 'bg-green-500'
                : readyState === 'connecting'
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
          />
          <span className="text-xs" style={{ color: '#52525B' }}>
            {readyState === 'open'
              ? 'Connected'
              : readyState === 'connecting'
              ? 'Connecting...'
              : 'Disconnected'}
          </span>
        </div>
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
                          {/* TODO: Extract markdown rendering into a reusable component */}
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
            {isProcessing && (
              <div className="flex gap-4 flex-row">
                <div className="flex-shrink-0">
                  <img
                    src="/ai-avatar.png"
                    alt="AI"
                    className="w-10 h-10 rounded-lg"
                    style={{ boxShadow: '0 2px 8px rgba(108, 92, 231, 0.3)' }}
                  />
                </div>
                <div className="flex-1 text-left">
                  <div
                    className="inline-block px-5 py-3 rounded-2xl rounded-tl-md"
                    style={{ backgroundColor: '#141414' }}
                  >
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 rounded-full bg-[#6C5CE7] animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-[#6C5CE7] animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-[#6C5CE7] animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
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
          {/* TODO: Add auto-resize and file attachment support to textarea */}
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
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isProcessing || readyState !== 'open'}
            className="flex-shrink-0 p-2.5 rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105"
            style={{
              background: inputValue.trim() && !isProcessing && readyState === 'open'
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

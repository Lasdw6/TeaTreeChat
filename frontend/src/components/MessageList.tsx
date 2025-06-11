import React, { useRef, useEffect, useState, memo } from 'react';
import { Message as MessageType } from '@/types/chat';
import ReactMarkdown from 'react-markdown';
import { Box, Typography, CircularProgress, IconButton, Tooltip } from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ContentCopy as CopyIcon, Refresh as RefreshIcon, SwapHoriz as SwapIcon, ArrowBack as ArrowBackIcon, ArrowForward as ArrowForwardIcon } from '@mui/icons-material';

interface MessageProps {
  message: MessageType;
  isStreaming?: boolean;
  onRegenerate?: (messageId: string) => void;
  onSwitchRegeneration?: (messageId: string, regenerationId: string) => void;
}

const Message: React.FC<MessageProps> = memo(({ message, isStreaming = false, onRegenerate, onSwitchRegeneration }) => {
  const processedContent = message.content.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, language, code) => {
    return `\`\`\`${language || ''}\n${code.trim()}\n\`\`\``;
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate(message.id.toString());
    }
  };

  const handleSwitchRegeneration = () => {
    if (onSwitchRegeneration && message.regeneration_id) {
      onSwitchRegeneration(message.id, message.regeneration_id);
    }
  };

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex flex-col ${message.role === 'user' ? 'w-[95%]' : ''}`}>
        <div className={`max-w-[85%] ${message.role === 'user' ? 'bg-indigo-600 ml-auto' : 'bg-gray-800'} rounded-lg p-4 relative`}>
          <div className="prose prose-invert prose-sm max-w-none markdown-content">
            <ReactMarkdown components={{
              p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
              h1: ({ children }) => <h1 className="text-xl font-bold mt-6 mb-4">{children}</h1>,
              h2: ({ children }) => <h2 className="text-lg font-bold mt-5 mb-3">{children}</h2>,
              h3: ({ children }) => <h3 className="text-base font-bold mt-4 mb-2">{children}</h3>,
              ul: ({ children }) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-6 mb-4">{children}</ol>,
              code: ({ node, inline, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                return !inline ? (
                  <CodeBlockWithCopy language={match?.[1]}>
                    {String(children).replace(/\n$/, '')}
                  </CodeBlockWithCopy>
                ) : (
                  <code className="bg-gray-800 px-1.5 py-0.5 rounded text-sm" {...props}>
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => <>{children}</>,
            }}>
              {processedContent}
            </ReactMarkdown>
          </div>
          {message.role === 'assistant' && (
            <div className="flex justify-start mt-1 space-x-1">
              <Tooltip title="Copy message">
                <IconButton
                  onClick={handleCopy}
                  size="small"
                  sx={{
                    color: '#9ca3af',
                    '&:hover': {
                      color: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Regenerate response">
                <span>
                  <IconButton
                    onClick={handleRegenerate}
                    size="small"
                    disabled={isStreaming}
                    sx={{
                      color: '#9ca3af',
                      '&:hover': {
                        color: 'white',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                      '&.Mui-disabled': {
                        color: '#4b5563',
                      },
                    }}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              {message.regeneration_id && (
                <Tooltip title="Switch to another regeneration">
                  <IconButton
                    onClick={handleSwitchRegeneration}
                    size="small"
                    sx={{
                      color: '#9ca3af',
                      '&:hover': {
                        color: 'white',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    <SwapIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

interface MessageListProps {
  messages: MessageType[];
  loading?: boolean;
  streamingMessageId?: string;
  onRegenerate?: (messageId: string) => void;
  activeMessageGroups: Record<string, number>;
  onSwitchMessage: (groupIndex: number, direction: 'prev' | 'next') => void;
  messageGroups: MessageType[][];
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  loading, 
  streamingMessageId, 
  onRegenerate, 
  activeMessageGroups,
  onSwitchMessage,
  messageGroups
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const lastScrollHeightRef = useRef<number>(0);

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShouldAutoScroll(isAtBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Only auto-scroll for new messages, not streaming updates
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const currentScrollHeight = container.scrollHeight;
    const isNewMessage = currentScrollHeight > lastScrollHeightRef.current;
    lastScrollHeightRef.current = currentScrollHeight;

    if (shouldAutoScroll && isNewMessage && !streamingMessageId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldAutoScroll, streamingMessageId]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {messageGroups.map((group, groupIndex) => {
        if (group.length === 1 || group[0].role !== 'assistant') {
          return group.map(message => (
            <Message
              key={message.id}
              message={message}
              isStreaming={message.id === streamingMessageId}
              onRegenerate={onRegenerate}
            />
          ));
        }

        const activeIndex = activeMessageGroups[`group-${groupIndex}`] || group.length - 1;
        const activeMessage = group[activeIndex];

        return (
          <div key={`group-${groupIndex}`}>
            <Message
              message={activeMessage}
              isStreaming={activeMessage.id === streamingMessageId}
              onRegenerate={onRegenerate}
            />
            {group.length > 1 && (
              <div className="flex items-center justify-start ml-4 mt-1 space-x-2">
                <IconButton
                  onClick={() => onSwitchMessage(groupIndex, 'prev')}
                  disabled={activeIndex === 0}
                  size="small"
                  sx={{
                    color: '#9ca3af',
                    '&:hover': {
                      color: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    '&.Mui-disabled': {
                      color: '#4b5563',
                    },
                  }}
                >
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                  {activeIndex + 1} of {group.length}
                </Typography>
                <IconButton
                  onClick={() => onSwitchMessage(groupIndex, 'next')}
                  disabled={activeIndex === group.length - 1}
                  size="small"
                  sx={{
                    color: '#9ca3af',
                    '&:hover': {
                      color: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    '&.Mui-disabled': {
                      color: '#4b5563',
                    },
                  }}
                >
                  <ArrowForwardIcon fontSize="small" />
                </IconButton>
              </div>
            )}
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

const CodeBlockWithCopy: React.FC<{ children: string; language?: string }> = ({ children, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      try {
        const textArea = document.createElement('textarea');
        textArea.value = children;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed: ', fallbackErr);
      }
    }
  };

  return (
    <div className="relative group">
      <div className="flex items-center justify-between px-4 py-2 bg-[#2a2a2a] border-b border-gray-700 rounded-t-lg">
        <div className="text-xs text-gray-400 font-medium">
          {language ? language.toUpperCase() : 'TEXT'}
        </div>
        <button
          onClick={handleCopy}
          className="text-xs text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-1.5"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          borderRadius: '0 0 0.5rem 0.5rem',
          padding: '1rem',
          background: '#1a1a1a',
        }}
        showLineNumbers
        wrapLines
        wrapLongLines
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
};

export default MessageList; 
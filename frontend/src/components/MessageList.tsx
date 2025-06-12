import React, { useRef, useEffect, useState } from 'react';
import { Message as MessageType, Model } from '@/types/chat';
import ReactMarkdown from 'react-markdown';
import { Box, Typography, CircularProgress, IconButton, Tooltip, Menu, MenuItem } from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ContentCopy as CopyIcon, Refresh as RefreshIcon, Check as CheckIcon } from '@mui/icons-material';
import { getModels } from '@/lib/api';

interface MessageProps {
  message: MessageType;
  isStreaming?: boolean;
  onRegenerate?: (messageId: string, model?: string) => void;
  availableModels?: Model[];
  onFork?: (messageId: string) => void;
}

const Message: React.FC<MessageProps> = ({ message, isStreaming = false, onRegenerate, availableModels = [], onFork }) => {
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const processedContent = message.content.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, language, code) => {
    return `\`\`\`${language || ''}\n${code.trim()}\n\`\`\``;
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleRegenerate = (model?: string) => {
    if (onRegenerate) {
      setRegenerating(true);
      onRegenerate(message.id.toString(), model);
      setTimeout(() => setRegenerating(false), 2000);
    }
    setAnchorEl(null);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
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
              <Tooltip title={copied ? "Copied!" : "Copy message"}>
                <IconButton
                  onClick={handleCopy}
                  size="small"
                  sx={{
                    color: '#9ca3af',
                    '&:hover': {
                      color: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  {copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title={regenerating ? "Regenerating..." : "Regenerate response"}>
                <span>
                  <IconButton
                    onClick={handleMenuOpen}
                    size="small"
                    disabled={isStreaming || regenerating}
                    sx={{
                      color: '#9ca3af',
                      '&:hover': {
                        color: 'white',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                      '&.Mui-disabled': {
                        color: '#4b5563',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    <RefreshIcon 
                      fontSize="small" 
                      sx={{
                        animation: regenerating ? 'spin 1s linear infinite' : 'none',
                        '@keyframes spin': {
                          '0%': {
                            transform: 'rotate(0deg)',
                          },
                          '100%': {
                            transform: 'rotate(360deg)',
                          },
                        },
                      }}
                    />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Fork chat from here">
                <IconButton
                  onClick={() => onFork?.(message.id.toString())}
                  size="small"
                  sx={{
                    color: '#9ca3af',
                    '&:hover': {
                      color: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2v20M2 12h20" />
                  </svg>
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                PaperProps={{
                  elevation: 3,
                  sx: {
                    bgcolor: '#1f2937',
                    color: '#ffffff',
                    mt: 1,
                    minWidth: '200px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    '& .MuiMenuItem-root': {
                      fontSize: '0.875rem',
                      py: 1.5,
                      px: 2,
                      '&:hover': {
                        bgcolor: 'rgba(79, 70, 229, 0.1)',
                      },
                      '&:first-of-type': {
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        mb: 0.5,
                      },
                    },
                  },
                }}
              >
                <MenuItem onClick={() => handleRegenerate()}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <RefreshIcon fontSize="small" sx={{ color: '#ffffff' }} />
                    <Typography variant="body2" sx={{ color: '#ffffff' }}>Use current model</Typography>
                  </Box>
                </MenuItem>
                {availableModels.map((model) => (
                  <MenuItem key={model.id} onClick={() => handleRegenerate(model.id)}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#ffffff' }}>
                        {model.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#9ca3af', mt: 0.5 }}>
                        {model.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Menu>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface MessageListProps {
  messages: MessageType[];
  loading?: boolean;
  streamingMessageId?: string;
  onRegenerate?: (messageId: string, model?: string) => void;
  onFork?: (messageId: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  loading,
  streamingMessageId,
  onRegenerate,
  onFork,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const fetchModels = async () => {
      try {
        const modelsList = await getModels();
        setModels(modelsList);
      } catch (err) {
        console.error('Failed to load models:', err);
      }
    };

    fetchModels();
  }, [isMounted]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#4B5563 #1F2937' }}
    >
      {messages.map((message) => (
        <Message
          key={message.id}
          message={message}
          isStreaming={message.id === streamingMessageId}
          onRegenerate={onRegenerate}
          availableModels={models}
          onFork={onFork}
        />
      ))}
      {loading && !streamingMessageId && (
        <div className="flex justify-center">
          <CircularProgress size={24} sx={{ color: '#9ca3af' }} />
        </div>
      )}
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
import React, { useRef, useEffect, useState } from 'react';
import { Message as MessageType, Model } from '@/types/chat';
import ReactMarkdown from 'react-markdown';
import { Box, Typography, CircularProgress, IconButton, Tooltip, Menu, MenuItem } from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ContentCopy as CopyIcon, Refresh as RefreshIcon, Check as CheckIcon } from '@mui/icons-material';

interface CodeBlockWithCopyProps {
  children: string;
  language?: string;
}

const CodeBlockWithCopy: React.FC<CodeBlockWithCopyProps> = ({ children, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <Box sx={{ position: 'relative', my: 2, '&:hover .copy-button': { opacity: 1 } }}>
      <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
        <IconButton
          onClick={handleCopy}
          size="small"
          className="copy-button"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1,
            color: '#fff',
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: 0,
            transition: 'opacity 0.2s',
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.7)',
            },
          }}
        >
          {copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: '#1E1E1E',
          fontSize: '0.875rem',
          lineHeight: '1.5',
        }}
        codeTagProps={{
          style: {
            fontFamily: 'monospace',
          },
        }}
      >
        {children}
      </SyntaxHighlighter>
    </Box>
  );
};

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
    <div className={`flex justify-center mb-4`}>
      <div className={`flex flex-col w-[70%]`}>
        <div
          data-message-id={message.id}
          className={`max-w-full rounded-lg p-4 relative ${
            message.role === 'user'
              ? 'self-end mr-40'
              : message.role === 'system'
              ? 'self-center'
              : 'self-start ml-14 mr-32'
          }`}
          style={
            message.role === 'user'
              ? { background: '#D6BFA3', color: '#111' }
              : message.role === 'system'
              ? { background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#ef4444' }
              : { color: '#D6BFA3' }
          }
        >
          <div className="prose prose-invert prose-sm max-w-none markdown-content">
            {isStreaming && !message.content ? (
              <div className="flex items-center space-x-2 text-gray-400">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span>Thinking...</span>
              </div>
            ) : (
              <ReactMarkdown 
                children={processedContent}
                components={{
              p: ({ children }: any) => <p className="mb-4 last:mb-0">{children}</p>,
              h1: ({ children }: any) => <h1 className="text-xl font-bold mt-6 mb-4">{children}</h1>,
              h2: ({ children }: any) => <h2 className="text-lg font-bold mt-5 mb-3">{children}</h2>,
              h3: ({ children }: any) => <h3 className="text-base font-bold mt-4 mb-2">{children}</h3>,
              ul: ({ children }: any) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
              ol: ({ children }: any) => <ol className="list-decimal pl-6 mb-4">{children}</ol>,
              a: ({ href, children, ...props }: any) => (
                <a 
                  href={href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#4E342E' }}
                  {...props}
                >
                  {children}
                </a>
              ),
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
                }}
              />
            )}
          </div>
          {message.role === 'assistant' && !isStreaming && (
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
                    size="medium"
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
                      verticalAlign: 'middle',
                    }}
                  >
                    <RefreshIcon
                      fontSize="medium"
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
                    width="24"
                    height="24"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      fill="currentColor"
                      d="M5 3.25A1.75 1.75 0 1 0 5 6.75a1.75 1.75 0 0 0 0-3.5Zm0 1A.75.75 0 1 1 5 5.75a.75.75 0 0 1 0-1.5Zm6-1A1.75 1.75 0 1 0 11 6.75a1.75 1.75 0 0 0 0-3.5Zm0 1a.75.75 0 1 1 0 1.5a.75.75 0 0 1 0-1.5ZM5.75 7.5a.75.75 0 0 0-.75.75v1.19a2.75 2.75 0 0 0 2 2.65v1.16a.75.75 0 1 0 1.5 0v-1.16a2.75 2.75 0 0 0 2-2.65V8.25a.75.75 0 0 0-1.5 0v1.19a1.25 1.25 0 0 1-2.5 0V8.25a.75.75 0 0 0-.75-.75Z"
                    />
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
                    bgcolor: '#4E342E',
                    color: '#fff',
                    mt: 1,
                    minWidth: '200px',
                    border: '1px solid #D6BFA3',
                    '& .MuiMenuItem-root': {
                      fontSize: '0.875rem',
                      py: 1.5,
                      px: 2,
                      color: '#fff',
                      '&:hover': {
                        bgcolor: '#D6BFA3',
                        color: '#111',
                      },
                      '&:first-of-type': {
                        borderBottom: '1px solid #D6BFA3',
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
  availableModels?: Model[];
  onFork?: (messageId: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  loading,
  streamingMessageId,
  onRegenerate,
  onFork,
  availableModels = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);


  return (
    <Box
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
      style={{ 
        scrollbarWidth: 'thin', 
        scrollbarColor: '#D6BFA3 #4E342E',
      }}
      sx={{
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#4E342E',
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#D6BFA3',
          borderRadius: '3px',
          '&:hover': {
            background: '#bfae8c',
          },
        },
      }}
    >
      {messages.map((message) => (
        <Message
          key={message.id}
          message={message}
          isStreaming={message.id === streamingMessageId}
          onRegenerate={onRegenerate}
          availableModels={availableModels}
          onFork={onFork}
        />
      ))}
      {loading && !streamingMessageId && (
        <div className="flex justify-center">
          <CircularProgress size={24} sx={{ color: '#9ca3af' }} />
        </div>
      )}
    </Box>
  );
};

export default MessageList; 
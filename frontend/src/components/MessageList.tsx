import React, { useRef, useState, useLayoutEffect, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Message as MessageType, Model } from '@/types/chat';
import ReactMarkdown from 'react-markdown';
import { Box, Typography, CircularProgress, IconButton, Tooltip, Menu, MenuItem, Modal, Portal } from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ContentCopy as CopyIcon, Refresh as RefreshIcon, Check as CheckIcon, Attachment as AttachmentIcon, ChevronRight as ChevronRightIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon, Fullscreen as FullscreenIcon, FullscreenExit as FullscreenExitIcon, OpenInNew as OpenInNewIcon, Close as CloseIcon } from '@mui/icons-material';

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
  const [modalContent, setModalContent] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const processedContent = message.content.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, language, code) => {
    return `\`\`\`${language || ''}\n${code.trim()}\n\`\`\``;
  });

  const getCleanModelName = (modelName: string): string => {
    const lastDashIndex = modelName.lastIndexOf(' - ');
    if (lastDashIndex === -1) return modelName.trim();
    return modelName.substring(0, lastDashIndex).trim();
  };

  const getCleanDescription = (description: string): string => {
    // Remove model name and "with" from the beginning of descriptions
    // Pattern: "ModelName with context window and cost info"
    const withIndex = description.indexOf(' with ');
    if (withIndex !== -1) {
      return description.substring(withIndex + 6).trim(); // +6 to skip " with "
    }
    return description.trim();
  };

  const handleCopy = async () => {
    try {
      // Copy the entire message content (including embedded attachments)
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

  const handleOpenInNewTab = () => {
    if (!modalContent) return;
    
    // Create a new window/tab with the content
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Pasted Content</title>
            <style>
              body {
                font-family: monospace;
                line-height: 1.6;
                padding: 20px;
                margin: 0;
                background-color: #f5f5f5;
                color: #333;
              }
              pre {
                white-space: pre-wrap;
                word-break: break-word;
                background-color: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
            </style>
          </head>
          <body>
            <h1>Pasted Content</h1>
            <pre>${modalContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleCloseModal = () => {
    setModalContent(null);
    setIsFullscreen(false);
  };

  // Group models by provider
  const groupedModels = availableModels.reduce((groups, model) => {
    let provider = 'Others';
    
    if (model.id.includes('openai')) {
      provider = 'OpenAI';
    } else if (model.id.includes('anthropic')) {
      provider = 'Anthropic';
    } else if (model.id.includes('google')) {
      provider = 'Google';
    } else if (model.id.includes('meta')) {
      provider = 'Meta';
    } else if (model.id.includes('deepseek')) {
      provider = 'DeepSeek';
    } else if (model.id.includes('mistralai')) {
      provider = 'Mistral';
    }
    
    if (!groups[provider]) {
      groups[provider] = [];
    }
    groups[provider].push(model);
    return groups;
  }, {} as Record<string, Model[]>);

  const providerOrder = ['OpenAI', 'Anthropic', 'Google', 'Meta', 'DeepSeek', 'Mistral', 'Others'].filter(provider => groupedModels[provider]?.length > 0);

  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  
  // Create a single ref to store all menu item elements
  const menuItemRefs = useRef<Record<string, HTMLLIElement | null>>({});

  const toggleProvider = (provider: string) => {
    if (expandedProvider === provider) {
      setExpandedProvider(null);
    } else {
      setExpandedProvider(provider);
    }
  };



  return (
    <>
    <div className={`flex justify-center mb-4`}>
      <div className={`flex flex-col w-[70%]`}>
        <div
          data-message-id={message.id}
          className={`max-w-full rounded-lg p-4 relative ${
            message.role === 'user'
              ? 'self-end ml-28 mr-40'
              : message.role === 'system'
              ? 'self-center'
              : 'self-start ml-14 mr-48'
          }`}
          style={
            message.role === 'user'
              ? { background: '#D6BFA3', color: '#111' }
              : message.role === 'system'
              ? { background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#ef4444' }
              : { color: '#D6BFA3' }
          }
        >
            <div className="prose prose-invert prose-sm max-w-none markdown-content break-words">
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
                const language = match?.[1];
                
                // Handle attachment blocks specially
                if (!inline && language === 'attachment') {
                  const content = String(children).replace(/\n$/, '');
                  return (
                    <Box
                      onClick={() => setModalContent(content)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 1.5,
                        my: 1,
                        borderRadius: '6px',
                        background: '#4E342E',
                        color: '#D6BFA3',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        '&:hover': {
                          background: '#5a4e44'
                        }
                      }}
                    >
                      <AttachmentIcon sx={{ fontSize: 20 }} />
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'inherit' }}>
                        Pasted text <span style={{ opacity: 0.7 }}>({content.length} chars)</span>
                      </Typography>
                    </Box>
                  );
                }
                
                return !inline ? (
                  <CodeBlockWithCopy language={language}>
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
                  anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  BackdropProps={{
                    invisible: true,
                }}
                PaperProps={{
                  elevation: 3,
                  sx: {
                      bgcolor: '#D6BFA3 !important',
                      backgroundColor: '#D6BFA3 !important',
                      color: '#4E342E',
                    mt: 1,
                      width: '320px',
                      border: '4px solid #4E342E',
                      maxHeight: '60vh',
                      overflowY: 'auto',
                      overflow: 'visible',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#4E342E #D6BFA3',
                      '&::-webkit-scrollbar': {
                        width: '8px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: '#D6BFA3',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: '#4E342E',
                        borderRadius: '4px',
                        '&:hover': {
                          background: '#5a4e44',
                        },
                      },
                    '& .MuiMenuItem-root': {
                      fontSize: '0.875rem',
                        py: 1.25,
                      px: 2,
                        color: '#4E342E',
                      
                      },
                      '& .MuiList-root': {
                        backgroundColor: '#D6BFA3 !important',
                      },
                      '& .MuiMenuList-root': {
                        backgroundColor: '#D6BFA3 !important',
                      },
                      '& .MuiBox-root': {
                        backgroundColor: '#D6BFA3 !important',
                      },
                    },
                  }}
                  MenuListProps={{
                    sx: {
                      overflow: 'visible',
                      backgroundColor: '#D6BFA3 !important',
                      '& .MuiMenuItem-root': {
                        backgroundColor: 'transparent !important',
                      },
                      '& .MuiBox-root': {
                        backgroundColor: '#D6BFA3 !important',
                    },
                  },
                }}
              >
                  <MenuItem onClick={() => handleRegenerate()} sx={{ borderBottom: '1px solid #4E342E', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <RefreshIcon fontSize="small" />
                      <Typography variant="body2" sx={{ color: 'inherit' }}>Use current model</Typography>
                    </Box>
                  </MenuItem>
                  {providerOrder.map((provider, index) => {
                    return (
                    <Box key={provider} sx={{ position: 'relative' }}>
                      <MenuItem 
                        ref={(el) => { menuItemRefs.current[provider] = el; }}
                        onClick={() => toggleProvider(provider)}
                        sx={{ 
                          bgcolor: '#D6BFA3 !important',
                          backgroundColor: '#D6BFA3 !important',
                          borderBottom: index < providerOrder.length - 1 ? '1px solid #4E342E' : 'none',
                          zIndex: expandedProvider === provider ? 1000 : 1,

                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#4E342E' }}>{provider}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" sx={{ color: '#5a4e44' }}>
                              ({groupedModels[provider].length})
                            </Typography>
                            {expandedProvider === provider ? 
                              <span style={{ fontSize: '16px', color: '#4E342E' }}>▲</span> : 
                              <span style={{ fontSize: '16px', color: '#4E342E' }}>▼</span>
                            }
                          </Box>
                  </Box>
                </MenuItem>
                      {expandedProvider === provider && menuItemRefs.current[provider] && (
                        <Portal>
                          <Box
                            sx={{
                              position: 'fixed',
                              top: menuItemRefs.current[provider]?.getBoundingClientRect().top,
                              left: menuItemRefs.current[provider]?.getBoundingClientRect().right,
                              width: '320px',
                              bgcolor: '#4E342E',
                              border: '1px solid #D6BFA3',
                              zIndex: 9999,
                              maxHeight: '400px',
                              overflowY: 'auto',
                              scrollbarWidth: 'thin',
                              scrollbarColor: '#D6BFA3 #4E342E',
                              boxShadow: '4px 0 8px rgba(0, 0, 0, 0.3)',
                              '&::-webkit-scrollbar': {
                                width: '6px',
                              },
                              '&::-webkit-scrollbar-track': {
                                background: '#4E342E',
                              },
                              '&::-webkit-scrollbar-thumb': {
                                background: '#D6BFA3',
                                borderRadius: '3px',
                                '&:hover': {
                                  background: '#C5A882',
                                },
                              },
                            }}
                          >
                            {groupedModels[provider].map((model) => (
                              <MenuItem 
                                key={model.id} 
                                onClick={() => handleRegenerate(model.id)}
                                sx={{ 
                                  pl: 4,
                                  bgcolor: 'rgba(0, 0, 0, 0.2)',
                                  '&:hover': { 
                                    bgcolor: '#D6BFA3', 
                                    '& .MuiTypography-root': { color: '#111 !important' }
                                  }
                                }}
                              >
                                <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontWeight: 500, 
                                      color: '#D6BFA3',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {getCleanModelName(model.name)}
                      </Typography>
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      color: '#B8A082', 
                                      mt: 0.5, 
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      lineHeight: 1.2
                                    }}
                                  >
                                    {getCleanDescription(model.description)}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
                          </Box>
                        </Portal>
                      )}
                    </Box>
                    );
                  })}
              </Menu>
            </div>
          )}
        </div>
      </div>
    </div>
      <Modal
        open={modalContent !== null}
        onClose={handleCloseModal}
        sx={{
          '& .MuiBackdrop-root': {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
          },
        }}
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: isFullscreen ? '95vw' : '80%',
          height: isFullscreen ? '95vh' : 'auto',
          maxWidth: isFullscreen ? 'none' : 800,
          maxHeight: isFullscreen ? 'none' : '80vh',
          bgcolor: '#4E342E',
          color: '#D6BFA3',
          border: '2px solid #D6BFA3',
          boxShadow: 24,
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
        }}>
          {/* Header with title and action buttons */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            borderBottom: '1px solid #D6BFA3',
          }}>
            <Typography variant="h6" component="h2" sx={{ color: '#D6BFA3', fontWeight: 600 }}>
              Pasted Content
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Open in New Tab">
                <IconButton
                  onClick={handleOpenInNewTab}
                  size="small"
                  sx={{
                    color: '#D6BFA3',
                    '&:hover': {
                      backgroundColor: 'rgba(214, 191, 163, 0.1)',
                    },
                  }}
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                <IconButton
                  onClick={handleToggleFullscreen}
                  size="small"
                  sx={{
                    color: '#D6BFA3',
                    '&:hover': {
                      backgroundColor: 'rgba(214, 191, 163, 0.1)',
                    },
                  }}
                >
                  {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Close">
                <IconButton
                  onClick={handleCloseModal}
                  size="small"
                  sx={{
                    color: '#D6BFA3',
                    '&:hover': {
                      backgroundColor: 'rgba(214, 191, 163, 0.1)',
                    },
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          {/* Content area */}
          <Box sx={{
            bgcolor: '#D6BFA3',
            color: '#111',
            m: 2,
            p: 3,
            borderRadius: 1,
            overflowY: 'auto',
            flex: 1,
            minHeight: isFullscreen ? '85vh' : '300px',
            scrollbarWidth: 'thin', 
            scrollbarColor: '#4E342E #D6BFA3',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#D6BFA3',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#4E342E',
              borderRadius: '4px',
              '&:hover': {
                background: '#5a4e44',
              },
            },
          }}>
            <Typography 
              component="pre" 
              sx={{ 
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-word', 
                fontFamily: 'monospace',
                fontSize: isFullscreen ? '0.9rem' : '0.875rem',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {modalContent}
            </Typography>
          </Box>
        </Box>
      </Modal>
    </>
  );
};



interface MessageListProps {
  messages: MessageType[];
  loading?: boolean;
  streamingMessageId?: string;
  onRegenerate?: (messageId: string, model?: string) => void;
  availableModels?: Model[];
  onFork?: (messageId: string) => void;
  onScrollPositionChange?: (isAtBottom: boolean) => void;
}

export interface MessageListRef {
  scrollToBottom: () => void;
  checkScrollPosition: () => void;
}

const MessageList = forwardRef<MessageListRef, MessageListProps>(({
  messages,
  loading,
  streamingMessageId,
  onRegenerate,
  onFork,
  availableModels = [],
  onScrollPositionChange,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);
  const [spacerHeight, setSpacerHeight] = useState(0);
  const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(null);
  const prevStreamingMessageIdRef = useRef<string | undefined>(undefined);

  useImperativeHandle(ref, () => ({
    scrollToBottom: () => {
    if (containerRef.current) {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    },
    checkScrollPosition: () => {
      if (onScrollPositionChange) {
        const container = containerRef.current;
        if (container) {
          const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 300;
          onScrollPositionChange(isAtBottom);
        }
      }
    }
  }));

  const handleScroll = () => {
    if (onScrollPositionChange) {
      const container = containerRef.current;
      if (container) {
        const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 300;
        onScrollPositionChange(isAtBottom);
      }
    }
  };

  useLayoutEffect(() => {
    const prevLength = prevMessagesLengthRef.current;
    const container = containerRef.current;

    if (container) {
      const isInitialLoad = prevLength === 0 && messages.length > 0;

      if (isInitialLoad) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'instant' });
      } else if (messages.length > prevLength) {
        const addedMessages = messages.slice(prevLength);
        const lastAddedUserMessage = addedMessages.filter(m => m.role === 'user').pop();

        if (lastAddedUserMessage) {
          setSpacerHeight(container.clientHeight / 2);
          setScrollToMessageId(lastAddedUserMessage.id);
        }
      }
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  useLayoutEffect(() => {
    if (spacerHeight > 0 && scrollToMessageId) {
      const container = containerRef.current;
      const messageElement = container?.querySelector(`[data-message-id="${scrollToMessageId}"]`);
      
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Reset the message ID to prevent re-scrolling, but keep the spacer.
        setScrollToMessageId(null);
      }
    }
  }, [spacerHeight, scrollToMessageId]);

  useEffect(() => {
    const wasStreaming = !!prevStreamingMessageIdRef.current;
    const isNowStreaming = !!streamingMessageId;

    if (wasStreaming && !isNowStreaming) {
      // Streaming has just finished
      setSpacerHeight(0);
    }

    prevStreamingMessageIdRef.current = streamingMessageId;
  }, [streamingMessageId]);

  return (
    <Box
      ref={containerRef}
      onScroll={handleScroll}
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
      <div style={{ height: spacerHeight, flexShrink: 0 }} />
      {loading && !streamingMessageId && (
        <div className="flex justify-center">
          <CircularProgress size={24} sx={{ color: '#9ca3af' }} />
        </div>
      )}
    </Box>
  );
});

export default MessageList; 
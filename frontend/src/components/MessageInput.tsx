import React, { useState, useRef, useEffect } from 'react';
import ModelSelector from './ModelSelector';
import { Send as SendIcon, Close as CloseIcon, Attachment as AttachmentIcon, Edit as EditIcon, Fullscreen as FullscreenIcon, FullscreenExit as FullscreenExitIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import TeaTreeLogo from './TeaTreeLogo';
import { Modal, Box, Typography, IconButton, Button, TextareaAutosize, Tooltip } from '@mui/material';

interface MessageInputProps {
  onSendMessage: (message: { content: string; attachments: string[] }) => void;
  disabled?: boolean;
  placeholder?: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
  forceUpward?: boolean;
}

const PASTE_THRESHOLD = 200; // characters

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = 'Type a message...',
  selectedModel,
  onModelChange,
  forceUpward = false,
}) => {
  const [message, setMessage] = useState('');
  const [pastedContents, setPastedContents] = useState<string[]>([]);
  const [modalState, setModalState] = useState<{ content: string; index: number } | null>(null);
  const [isEditingPasted, setIsEditingPasted] = useState(false);
  const [editedPastedContent, setEditedPastedContent] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-resize the textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const messageData = {
      content: message,
      attachments: pastedContents,
    };
    
    if (!disabled && (messageData.content.trim() || messageData.attachments.length > 0)) {
      onSendMessage(messageData);
      setMessage('');
      setPastedContents([]);
      
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.length > PASTE_THRESHOLD) {
      e.preventDefault();
      setPastedContents(prev => [...prev, pastedText]);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleRemovePastedContent = (index: number) => {
    setPastedContents(prev => prev.filter((_, i) => i !== index));
  };

  const handleOpenModal = (content: string, index: number) => {
    setModalState({ content, index });
    setEditedPastedContent(content);
    setIsEditingPasted(false);
  };

  const handleCloseModal = () => {
    setModalState(null);
    setIsFullscreen(false);
    setIsEditingPasted(false);
  };

  const handleOpenInNewTab = () => {
    if (!modalState?.content) return;
    
    // Create a new window/tab with the content
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Pasted Text #${(modalState.index ?? 0) + 1}</title>
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
            <h1>Pasted Text #${(modalState.index ?? 0) + 1}</h1>
            <pre>${modalState.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleSavePastedEdit = () => {
    if (!modalState) return;

    const { index } = modalState;
    const newContents = [...pastedContents];
    newContents[index] = editedPastedContent;
    setPastedContents(newContents);

    setModalState({ content: editedPastedContent, index });
    setIsEditingPasted(false);
  };
  
  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto" style={{ width: '100%' }}>
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700 rounded-2xl shadow-lg" style={{ background: '#4E342E', width: '100%' }}>
        {/* Pasted content chips container with themed scrollbar */}
        {pastedContents.length > 0 && (
          <div 
            style={{
              maxHeight: '200px',
              overflowY: 'auto',
              marginBottom: '12px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#D6BFA3 #5a4e44',
            }}
            className="pasted-chips-container"
          >
            <style jsx>{`
              .pasted-chips-container::-webkit-scrollbar {
                width: 8px;
              }
              .pasted-chips-container::-webkit-scrollbar-track {
                background: #5a4e44;
                border-radius: 4px;
              }
              .pasted-chips-container::-webkit-scrollbar-thumb {
                background: #D6BFA3;
                border-radius: 4px;
              }
              .pasted-chips-container::-webkit-scrollbar-thumb:hover {
                background: #c7b396;
              }
            `}</style>
            {pastedContents.map((content, index) => (
              <Box
                  key={index}
                  sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      marginBottom: '12px',
                      border: '1px solid #D6BFA3',
                      borderRadius: '8px',
                      background: '#5a4e44',
                      color: '#D6BFA3',
                      userSelect: 'none',
                  }}
              >
                  <Box
                      onClick={() => handleOpenModal(content, index)}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', flex: 1 }}
                  >
                      <AttachmentIcon />
                      <Typography variant="body2" sx={{ color: 'inherit' }}>Pasted text #{index + 1} ({content.length} chars)</Typography>
                  </Box>
                  <IconButton
                      size="small"
                      onClick={() => handleRemovePastedContent(index)}
                      sx={{ color: '#D6BFA3' }}
                  >
                      <CloseIcon fontSize="small" />
                  </IconButton>
              </Box>
            ))}
          </div>
        )}
        <div className="flex items-start space-x-3 w-full">
          <TeaTreeLogo size={48} />
          <div className="flex-1 flex flex-col">
            <div 
              className="flex items-end bg-[#D6BFA3] rounded-lg p-2 space-x-2"
            >
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={onModelChange}
                disabled={disabled}
                className="flex-shrink-0"
                forceUpward={forceUpward}
                compact={true}
              />
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={pastedContents.length > 0 ? "Add to your pasted content..." : placeholder}
                  disabled={disabled}
                  className="w-full min-h-[2.5rem] max-h-32 py-1 px-2 resize-none bg-transparent border-none rounded-lg placeholder-gray-600 focus:outline-none focus:ring-0 transition-all overflow-y-auto whitespace-pre-wrap break-words themed-scrollbar"
                  style={{ 
                    color: '#111',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#4E342E #D6BFA3'
                  }}
                  rows={1}
                />
                <style jsx>{`
                  .themed-scrollbar::-webkit-scrollbar {
                    width: 6px;
                  }
                  .themed-scrollbar::-webkit-scrollbar-track {
                    background: #D6BFA3;
                    border-radius: 3px;
                  }
                  .themed-scrollbar::-webkit-scrollbar-thumb {
                    background: #4E342E;
                    border-radius: 3px;
                  }
                  .themed-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #5a4e44;
                  }
                `}</style>
              </div>
              <button
                type="submit"
                disabled={(!message.trim() && pastedContents.length === 0) || disabled}
                className="self-stretch flex items-center justify-center px-4 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#5B6F56] transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                style={{ background: '#4E342E', color: '#fff' }}
              >
                <SendIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </form>
       <Modal
        open={!!modalState}
        onClose={handleCloseModal}
        aria-labelledby="pasted-text-title"
        aria-describedby="pasted-text-content"
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
            <Typography id="pasted-text-title" variant="h6" component="h2" sx={{ color: '#D6BFA3', fontWeight: 600 }}>
              {isEditingPasted ? `Edit Pasted Text #${(modalState?.index ?? 0) + 1}` : `Pasted Text #${(modalState?.index ?? 0) + 1}`}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {isEditingPasted ? (
                // Show Save and Cancel buttons when editing
                <>
                  <Button 
                    onClick={handleSavePastedEdit} 
                    variant="contained" 
                    size="small"
                    sx={{ 
                      background: '#D6BFA3', 
                      color: '#4E342E', 
                      '&:hover': { background: '#c7b396' },
                      minWidth: '60px'
                    }}
                  >
                    Save
                  </Button>
                  <Button 
                    onClick={() => setIsEditingPasted(false)} 
                    variant="outlined"
                    size="small"
                    sx={{ 
                      color: '#D6BFA3', 
                      borderColor: '#D6BFA3',
                      '&:hover': { 
                        borderColor: '#c7b396',
                        backgroundColor: 'rgba(214, 191, 163, 0.1)'
                      },
                      minWidth: '60px'
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                // Show action buttons when not editing
                <>
                  <Tooltip title="Edit">
                    <IconButton 
                      onClick={() => setIsEditingPasted(true)} 
                      size="small"
                      sx={{ 
                        color: '#D6BFA3',
                        '&:hover': {
                          backgroundColor: 'rgba(214, 191, 163, 0.1)',
                        },
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
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
                </>
              )}
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
            {isEditingPasted ? (
              <TextareaAutosize
                value={editedPastedContent}
                onChange={(e) => setEditedPastedContent(e.target.value)}
                minRows={isFullscreen ? 25 : 10}
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: '#111',
                  border: 'none',
                  padding: '0',
                  fontSize: isFullscreen ? '0.9rem' : 'inherit',
                  fontFamily: 'monospace',
                  resize: 'none',
                  outline: 'none',
                  lineHeight: 1.5,
                }}
              />
            ) : (
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
                {modalState?.content}
              </Typography>
            )}
          </Box>
        </Box>
      </Modal>
    </div>
  );
};

export default MessageInput; 
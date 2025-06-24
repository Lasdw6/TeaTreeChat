import React, { useState, useRef, useEffect } from 'react';
import ModelSelector from './ModelSelector';
import { Send as SendIcon, Close as CloseIcon, Attachment as AttachmentIcon, Edit as EditIcon, Fullscreen as FullscreenIcon, FullscreenExit as FullscreenExitIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import TeaTreeLogo from './TeaTreeLogo';
import { Modal, Box, Typography, IconButton, Button, TextareaAutosize, Tooltip } from '@mui/material';
import useMediaQuery from '@/hooks/useMediaQuery';
import { Fade } from '@mui/material';

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
  const isMobile = useMediaQuery('(max-width: 768px)');
  
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
    <div className="flex flex-col w-full max-w-6xl mx-auto" style={{ width: '100%' }}>
      <form onSubmit={handleSubmit} className="px-4 pt-4 pb-2 border-t border-gray-700 rounded-2xl shadow-lg" style={{ background: '#4E342E', width: '100%' }}>
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
        {isMobile ? (
          // Mobile layout: Compact, unified bar
          <div className="w-full flex-1 bg-[#D6BFA3] rounded-lg p-2 flex flex-col space-y-2">
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={onModelChange}
              disabled={disabled}
              className="w-full"
              forceUpward={forceUpward}
              compact={false}
            />
            <div className="flex items-end space-x-2 w-full">
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
                  style={{ color: '#111', scrollbarWidth: 'thin', scrollbarColor: '#4E342E #D6BFA3' }}
                  rows={1}
                />
              </div>
              <button type="submit" disabled={disabled || (!message.trim() && pastedContents.length === 0)} className="self-end p-2 rounded-full text-white disabled:opacity-50 transition-colors" style={{ background: '#5B6F56', color: '#D6BFA3' }}>
                <SendIcon />
              </button>
            </div>
          </div>
        ) : (
          // Desktop layout: Original format
          <div className="flex items-start w-full space-x-3">
            <TeaTreeLogo size={48} />
            <div className="flex-1 bg-[#D6BFA3] rounded-lg flex items-center p-1 space-x-2">
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={onModelChange}
                disabled={disabled}
                forceUpward={forceUpward}
                compact={true}
                className="flex-shrink-0"
              />
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={pastedContents.length > 0 ? "Add to your pasted content..." : placeholder}
                disabled={disabled}
                className="flex-1 min-h-[2.5rem] max-h-32 py-1 px-2 resize-none bg-transparent border-none rounded-lg placeholder-gray-600 focus:outline-none focus:ring-0 transition-all overflow-y-auto whitespace-pre-wrap break-words themed-scrollbar"
                style={{ color: '#111', scrollbarWidth: 'thin', scrollbarColor: '#4E342E #D6BFA3' }}
                rows={1}
              />
              <button type="submit" disabled={disabled || (!message.trim() && pastedContents.length === 0)} className="p-2 rounded-full text-white disabled:opacity-50 transition-colors" style={{ background: '#5B6F56', color: '#D6BFA3' }}>
                <SendIcon />
              </button>
            </div>
          </div>
        )}
      </form>
      {modalState && (
        <Modal
          open={true}
          onClose={handleCloseModal}
          aria-labelledby="pasted-content-modal-title"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Fade in={true}>
            <Box
              sx={{
                position: 'relative',
                bgcolor: 'background.paper',
                border: '2px solid #000',
                boxShadow: 24,
                p: 4,
                width: isFullscreen ? '100vw' : '80vw',
                height: isFullscreen ? '100vh' : '80vh',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.3s, height 0.3s',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                <Typography id="pasted-content-modal-title" variant="h6" component="h2">
                  {isEditingPasted ? 'Edit' : 'View'} Pasted Text #{modalState.index + 1}
                </Typography>
                <Box>
                  <Tooltip title={isEditingPasted ? 'Save' : 'Edit'}>
                    <IconButton onClick={isEditingPasted ? handleSavePastedEdit : () => setIsEditingPasted(true)}>
                      {isEditingPasted ? <SendIcon /> : <EditIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Open in new tab">
                    <IconButton onClick={handleOpenInNewTab}>
                      <OpenInNewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
                    <IconButton onClick={handleToggleFullscreen}>
                      {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Close">
                    <IconButton onClick={handleCloseModal}>
                      <CloseIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <Box sx={{ flex: 1, overflow: 'auto', border: '1px solid #ddd', p: 2, borderRadius: 1 }}>
                {isEditingPasted ? (
                  <TextareaAutosize
                    value={editedPastedContent}
                    onChange={(e) => setEditedPastedContent(e.target.value)}
                    style={{ width: '100%', height: '100%', resize: 'none', border: 'none', outline: 'none' }}
                  />
                ) : (
                  <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                    {modalState.content}
                  </pre>
                )}
              </Box>
            </Box>
          </Fade>
        </Modal>
      )}
    </div>
  );
};

export default MessageInput;

// Helper function to determine if the message input should be forced upward
function shouldForceUpward(forceUpward: boolean | undefined, isMobile: boolean): boolean {
  return forceUpward || isMobile;
} 
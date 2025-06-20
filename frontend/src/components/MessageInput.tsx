import React, { useState, useRef, useEffect } from 'react';
import ModelSelector from './ModelSelector';
import { Send as SendIcon, Close as CloseIcon, Attachment as AttachmentIcon, Edit as EditIcon } from '@mui/icons-material';
import TeaTreeLogo from './TeaTreeLogo';
import { Modal, Box, Typography, IconButton, Button, TextareaAutosize } from '@mui/material';

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
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={pastedContents.length > 0 ? "Add to your pasted content..." : placeholder}
                disabled={disabled}
                className="flex-1 min-h-[2.5rem] max-h-32 py-1 px-2 resize-none bg-transparent border-none rounded-lg placeholder-gray-600 focus:outline-none focus:ring-0 transition-all overflow-hidden whitespace-pre-wrap break-words"
                style={{ color: '#111' }}
                rows={1}
              />
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
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80%',
          maxWidth: 800,
          maxHeight: '80vh',
          bgcolor: '#4E342E',
          color: '#D6BFA3',
          border: '2px solid #D6BFA3',
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography id="pasted-text-title" variant="h6" component="h2">
              {isEditingPasted ? `Edit Pasted Text #${(modalState?.index ?? 0) + 1}` : `Pasted Text #${(modalState?.index ?? 0) + 1}`}
            </Typography>
            {!isEditingPasted && (
              <IconButton onClick={() => setIsEditingPasted(true)} sx={{ color: '#D6BFA3' }}>
                <EditIcon />
              </IconButton>
            )}
          </Box>
          <Box sx={{
            bgcolor: '#D6BFA3',
            color: '#111',
            p: 2,
            borderRadius: 1,
            overflowY: 'auto',
            flex: 1,
            minHeight: 0,
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
                minRows={10}
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: '#111',
                  border: 'none',
                  padding: '0',
                  fontSize: 'inherit',
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none',
                }}
              />
            ) : (
              <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit' }}>
                {modalState?.content}
              </Typography>
            )}
          </Box>
          {isEditingPasted && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
              <Button onClick={() => setIsEditingPasted(false)} sx={{ color: '#D6BFA3', borderColor: '#D6BFA3' }} variant="outlined">Cancel</Button>
              <Button onClick={handleSavePastedEdit} variant="contained" sx={{ 
                background: '#D6BFA3', 
                color: '#4E342E', 
                '&:hover': { background: '#c7b396' }
              }}>Save</Button>
            </Box>
          )}
        </Box>
      </Modal>
    </div>
  );
};

export default MessageInput; 
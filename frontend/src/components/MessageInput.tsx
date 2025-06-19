import React, { useState, useRef, useEffect } from 'react';
import ModelSelector from './ModelSelector';
import { Send as SendIcon } from '@mui/icons-material';
import TeaTreeLogo from './TeaTreeLogo';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
  forceUpward?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = 'Type a message...',
  selectedModel,
  onModelChange,
  forceUpward = false,
}) => {
  const [message, setMessage] = useState('');
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
    
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto" style={{ width: '100%' }}>
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700 rounded-2xl shadow-lg" style={{ background: '#4E342E', width: '100%' }}>
        <div className="flex items-end space-x-3 w-full">
          <TeaTreeLogo size={48} />
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={onModelChange}
              disabled={disabled}
              className="w-40 flex-shrink-0"
              forceUpward={forceUpward}
              compact={true}
            />
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
            className="flex-1 min-h-[2.5rem] max-h-32 py-3 px-4 resize-none border border-gray-600 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#5B6F56] focus:border-transparent transition-all overflow-hidden whitespace-pre-wrap break-words"
            style={{ minWidth: '250px', background: '#D6BFA3', color: '#111' }}
              rows={1}
            />
          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className="flex items-center justify-center px-4 py-3 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#5B6F56] focus:ring-offset-2 transition-all hover:scale-105 active:scale-95 flex-shrink-0"
            style={{ background: '#D6BFA3', color: '#111' }}
          >
            <SendIcon className="w-5 h-5 mr-2" />
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageInput; 
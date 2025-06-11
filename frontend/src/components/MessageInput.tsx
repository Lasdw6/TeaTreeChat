import React, { useState, useRef, useEffect } from 'react';
import ModelSelector from './ModelSelector';
import { Send as SendIcon } from '@mui/icons-material';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = 'Type a message...',
  selectedModel,
  onModelChange,
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
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700 bg-gray-800">
      <div className="flex items-end space-x-2">
        <div className="flex-1 flex items-end space-x-2">
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            disabled={disabled}
            className="w-48"
          />
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 min-h-[2.5rem] max-h-32 py-3 px-4 resize-none bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all overflow-hidden whitespace-pre-wrap break-words"
            style={{ width: '50%', minWidth: '200px' }}
            rows={1}
          />
        </div>
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className="flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
        >
          <SendIcon className="w-5 h-5 mr-2" />
          Send
        </button>
      </div>
    </form>
  );
};

export default MessageInput; 
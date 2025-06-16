import React from 'react';
import { CircularProgress, IconButton, Typography } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';

interface MessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
  };
  isStreaming?: boolean;
  onRegenerate?: (messageId: string) => void;
}

const Message: React.FC<MessageProps> = ({ message, isStreaming, onRegenerate }) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] rounded-lg p-4`}
        style={isUser
          ? { background: '#D6BFA3', color: '#111' }
          : isAssistant
            ? { background: 'transparent', color: '#111' }
            : { background: '#4E342E', color: '#fff' }
        }
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <ReactMarkdown className="prose prose-invert max-w-none">
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <CircularProgress size={16} className="text-gray-400" />
              )}
            </div>
          </div>
          {isAssistant && onRegenerate && (
            <IconButton
              onClick={() => onRegenerate(message.id)}
              disabled={isStreaming}
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
              <RefreshIcon fontSize="small" />
            </IconButton>
          )}
        </div>
        <Typography variant="caption" className="text-gray-400 mt-2 block">
          {new Date(message.created_at).toLocaleTimeString()}
        </Typography>
      </div>
    </div>
  );
};

export default Message; 
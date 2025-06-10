import React, { useRef, useEffect, useState } from 'react';
import { Message as MessageType } from '@/types/chat';
import ReactMarkdown from 'react-markdown';

interface MessageProps {
  message: MessageType;
}

// Helper function to remove all duplicated patterns (common in LLM outputs)
const removeDuplicatedPatterns = (text: string): string => {
  // Store original length for comparison
  const originalLength = text.length;
  
  // First check if there's meaningful duplicate content to fix
  if (text.length < 50) return text;
  
  // Remove duplicated header patterns like "Puzzle 1Puzzle 1"
  let result = text.replace(/(\b\w+\s+\d+)(\1)/g, '$1');
  
  // Remove "word word" duplications with optional separators
  result = result.replace(/(\b\w+\b)[\s\n]*(\1\b)/g, '$1');
  
  // Handle duplicated phrases with line breaks between them
  result = result.replace(/(\b\w+\b[ \t]*\n[ \t]*\1\b)/g, '$1');
  
  // Handle direct duplication of phrases (3+ words) 
  const phrasePattern = /(\b\w+\s+\w+\s+\w+(?:\s+\w+){0,3})\s+\1\b/g;
  result = result.replace(phrasePattern, '$1');
  
  // Fix punctuation spacing
  result = result.replace(/([.!?])([A-Z])/g, '$1 $2');
  
  // Remove duplicate sections with code blocks
  result = result.replace(/(```(?:python|javascript|typescript|html|css)[\s\S]+?```)\s+(```(?:python|javascript|typescript|html|css)[\s\S]+?```)/g, 
    (match, p1, p2) => {
      // If they're very similar, keep only one
      if (p1.length > 20 && p2.length > 20 && (p1.includes(p2) || p2.includes(p1))) {
        return p1.length >= p2.length ? p1 : p2;
      }
      return match; // Otherwise keep both
    }
  );
  
  // Remove specific patterns seen in examples like "Day 2 Day 2"
  result = result.replace(/(\bDay\s+\d+)(\s+\1)/g, '$1');
  
  // Remove duplicated phrases at beginning of paragraphs
  result = result.replace(/\n([A-Z][a-z]+[\s\n]+)\1/g, '\n$1');
  
  // Fix common double-word patterns seen in the example
  const patterns = [
    /(\brock\s+)(\1)/gi,
    /(\bpaper\s+)(\1)/gi,
    /(\bscissors\s+)(\1)/gi,
    /(\bpuzzle\s+)(\1)/gi,
    /(\bpassword\s+)(\1)/gi,
    /(\bplayer\s+)(\1)/gi,
    /(\bpoint\s+)(\1)/gi,
    /(\bpoints\s+)(\1)/gi,
    /(\binvolves\s+)(\1)/gi,
    /(\bsolving\s+)(\1)/gi,
    /(\brelated\s+to\s+)(\1)/gi,
    /(\bpuzzles\s+)(\1)/gi,
  ];
  
  patterns.forEach(pattern => {
    result = result.replace(pattern, '$1');
  });
  
  // Log if we made significant changes
  if (originalLength - result.length > 50) {
    console.log(`Removed ${originalLength - result.length} characters of duplicated content`);
  }
  
  return result;
};

const Message: React.FC<MessageProps> = ({ message }) => {
  const { role, content } = message;
  
  // Preprocess content to fix formatting issues
  const processedContent = React.useMemo(() => {
    if (!content) return '';
    
    // Replace sequences of multiple newlines with just two newlines
    let processed = content;
    processed = processed.replace(/\n{3,}/g, '\n\n');
    
    // Apply more aggressive duplicate pattern removal for assistant messages
    if (role === 'assistant') {
      processed = removeDuplicatedPatterns(processed);
    }
    
    return processed;
  }, [content, role]);
  
  return (
    <div className={`chat-bubble-${role}`}>
      <div className="font-semibold text-sm mb-1">
        {role === 'user' ? 'You' : role === 'assistant' ? 'Assistant' : 'System'}
      </div>
      <div className="prose prose-invert prose-sm max-w-none markdown-content">
        <ReactMarkdown components={{
          // Ensure paragraphs render with proper spacing
          p: ({ children }) => <p className="mb-4">{children}</p>,
          // Add proper styling for headings
          h1: ({ children }) => <h1 className="text-xl font-bold mt-6 mb-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mt-5 mb-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold mt-4 mb-2">{children}</h3>,
          // Add styling for lists
          ul: ({ children }) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-4">{children}</ol>,
          // Style code blocks
          code: ({ children }) => <code className="bg-gray-700 px-1 py-0.5 rounded">{children}</code>,
          pre: ({ children }) => <pre className="bg-gray-700 p-3 rounded my-4 overflow-x-auto">{children}</pre>,
        }}>
          {processedContent}
        </ReactMarkdown>
      </div>
    </div>
  );
};

interface MessageListProps {
  messages: MessageType[];
  loading?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, loading = false }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  // Mark when component is mounted
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Scroll to bottom when messages change, but only after component is mounted
  useEffect(() => {
    if (isMounted && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMounted]);
  
  return (
    <div className="flex flex-col overflow-y-auto p-4 space-y-4 flex-grow bg-gray-900">
      {messages.length === 0 && !loading && (
        <div className="text-center text-gray-400 my-auto">
          <p className="text-lg">No messages yet</p>
          <p className="text-sm">Start a conversation by typing a message below</p>
        </div>
      )}
      
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}
      
      {loading && (
        <div className="chat-bubble-assistant">
          <div className="font-semibold text-sm mb-1">Assistant</div>
          <div className="flex space-x-2">
            <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList; 
import React, { useRef, useEffect, useState, memo } from 'react';
import { Message as MessageType } from '@/types/chat';
import ReactMarkdown from 'react-markdown';

interface MessageProps {
  message: MessageType;
}

const Message: React.FC<MessageProps & { isStreaming?: boolean }> = memo(({ message, isStreaming = false }) => {
  const { role, content } = message;
  
  // Preprocess content to fix formatting issues
  const processedContent = React.useMemo(() => {
    if (!content) return '';
    // Replace sequences of multiple newlines with just two newlines
    let processed = content;
    processed = processed.replace(/\n{3,}/g, '\n\n');
    return processed;
  }, [content, role]);
  
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`chat-bubble-${role} ${isStreaming ? 'ring-2 ring-indigo-400' : ''} ${role === 'user' ? 'self-end' : 'self-start'}`}>
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
    </div>
  );
});

interface MessageListProps {
  messages: MessageType[];
  loading?: boolean;
  streamingMessageId?: string;
}

const MessageList: React.FC<MessageListProps> = ({ messages, loading = false, streamingMessageId }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollRef = useRef<boolean>(true);

  // Helper to check if user is near the bottom
  const isUserNearBottom = () => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    // If user is at (or near) the bottom, anchor to bottom as new content arrives
    if (isUserNearBottom()) {
      el.scrollTop = el.scrollHeight;
    } else {
      // If not at bottom, preserve scroll position relative to top
      const prevScrollHeight = el.scrollHeight;
      setTimeout(() => {
        const newScrollHeight = el.scrollHeight;
        el.scrollTop += newScrollHeight - prevScrollHeight;
      }, 0);
    }
  }, [messages, streamingMessageId]);

  // MutationObserver to catch DOM changes (e.g., images, code blocks, markdown rendering)
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const observer = new MutationObserver(() => {
      if (isAutoScrollRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    });
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={scrollContainerRef}
      className="flex flex-col overflow-y-auto p-4 space-y-4 flex-grow bg-gray-900"
    >
      {messages.length === 0 && !loading && (
        <div className="text-center text-gray-400 my-auto">
          <p className="text-lg">No messages yet</p>
          <p className="text-sm">Start a conversation by typing a message below</p>
        </div>
      )}
      {messages.map((message) => (
        <Message key={message.id} message={message} isStreaming={streamingMessageId === message.id} />
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
    </div>
  );
};

export default MessageList; 
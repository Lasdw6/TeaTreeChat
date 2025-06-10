'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, StreamingChunk } from '@/types/chat';
import MessageList from '@/components/MessageList';
import MessageInput from '@/components/MessageInput';
import ModelSelector from '@/components/ModelSelector';
import { sendMessage } from '@/lib/api';

// Helper function to clean up text from streaming responses
const cleanupStreamingText = (text: string): string => {
  if (!text || text.trim().length === 0) {
    console.warn("Received empty text for cleanup");
    return "";
  }
  
  console.log("Original text length before cleanup:", text.length);
  
  // Remove excessive newlines (3 or more) but preserve paragraph breaks
  let cleaned = text.replace(/\n{4,}/g, '\n\n\n');
  
  // Only fix obvious duplicate words across line breaks, being careful not to remove valid repetition
  cleaned = cleaned.replace(/(\b\w{3,}\b)[ \t]*\n[ \t]*\1\b/g, '$1');
  
  // Add proper spacing after periods if missing
  cleaned = cleaned.replace(/([.!?])([A-Z])/g, '$1 $2');
  
  console.log("Cleaned text length after cleanup:", cleaned.length);
  
  return cleaned;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('meta-llama/llama-3.3-8b-instruct:free');
  const [loading, setLoading] = useState<boolean>(false);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  // Use a ref to track the content of the streaming message to avoid state closure issues
  const streamingContentRef = useRef<string>('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const prevChunkRef = useRef<string>('');
  
  // Mark when component is mounted on the client
  useEffect(() => {
    setIsClient(true);
    setDebugInfo('Client initialized');
  }, []);
  
  // Add a welcome message when the component mounts on the client
  useEffect(() => {
    if (!isClient) return;
    
    const welcomeMessage: Message = {
      id: uuidv4(),
      role: 'system',
      content: 'Welcome to T3 Chat Clone! You are now chatting with Meta\'s Llama 3.3 8B Instruct model. Type a message below to get started.',
      createdAt: new Date(),
    };
    
    if (messages.length === 0) {
      setMessages([welcomeMessage]);
      setDebugInfo(prev => prev + '\nWelcome message added');
    }
  }, [isClient, messages.length]);
  
  // Function to add a new user message
  // To skip printing duplicates, you need to check if the new chunk's content is already at the end of the current streaming content.
  // If it is, don't append it. Otherwise, append only the new part.
  // This avoids skipping valid partial completions, but prevents repeated tokens from being appended.

  const handleSendMessage = useCallback(async (content: string) => {
    if (loading || !content.trim() || !isClient) return;

    setDebugInfo(prev => prev + `\nSending message: ${content.substring(0, 20)}...`);

    // Create a new user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: content.trim(),
      createdAt: new Date(),
    };

    // Add the user message to the list
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    // Reset streaming content ref
    streamingContentRef.current = '';

    // Create an empty assistant message for streaming
    const assistantMessageId = uuidv4();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    };

    setStreamingMessage(assistantMessage);
    setLoading(true);

    try {
      setDebugInfo(prev => prev + `\nCalling API with model: ${selectedModel}`);

      await sendMessage(
        [...messages, userMessage],
        selectedModel,
        (chunk: StreamingChunk) => {
          // Log chunks for debugging
          console.log('Received chunk:', chunk);

          setStreamingMessage((prev) => {
            if (!prev) {
              setDebugInfo(d => d + '\nNo previous streaming message found');
              return prev;
            }

            let content = '';
            try {
              if (
                chunk.choices &&
                Array.isArray(chunk.choices) &&
                chunk.choices.length > 0 &&
                chunk.choices[0].delta
              ) {
                content = chunk.choices[0].delta.content || '';
                if (content) {
                  // Enhanced debug output for chunk comparison
                  const charCodes = (str: string) => str.split('').map(c => c.charCodeAt(0)).join(',');
                  setDebugInfo(d => d +
                    `\nChunk content: [${content}] (len=${content.length}) codes: [${charCodes(content)}]` +
                    `\nPrev chunk: [${prevChunkRef.current}] (len=${prevChunkRef.current.length}) codes: [${charCodes(prevChunkRef.current)}]`
                  );

                  // Efficient duplicate skipping: skip if exactly equal to previous chunk
                  if (content.length === prevChunkRef.current.length && content === prevChunkRef.current) {
                    setDebugInfo(d => d + `\nSkipping duplicate chunk: ${content}`);
                  } else {
                    // Find the largest overlap between current and content
                    
                    streamingContentRef.current += content;
                  }
                  prevChunkRef.current = content;
                }
              }
            } catch (err) {
              console.error('Error processing chunk:', err);
              setDebugInfo(d => d + `\nError processing chunk: ${err}`);
            }

            // Always update the visible content to match the ref
            return {
              ...prev,
              content: streamingContentRef.current,
            };
          });
        }
      );
      
      setDebugInfo(prev => prev + '\nAPI call completed');
      
      // After streaming is complete, add the final assistant message using the ref content
      const finalContent = cleanupStreamingText(streamingContentRef.current);
      setDebugInfo(prev => prev + `\nFinal content length: ${finalContent.length}`);
      
      if (finalContent.length > 0) {
        const finalMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          content: finalContent,
          createdAt: new Date(),
        };
        
        setDebugInfo(prev => prev + `\nAdding final message with content: ${finalContent.substring(0, 20)}...`);
        setMessages(prevMessages => [...prevMessages, finalMessage]);
      } else {
        setDebugInfo(prev => prev + '\nNo content to add');
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      setDebugInfo(prev => prev + `\nAPI Error: ${error}`);
      
      // Show error in the UI
      const errorMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: 'Error: Failed to get a response from the assistant.',
        createdAt: new Date(),
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      // In finally block, always append the last received chunk if it was skipped
      if (prevChunkRef.current && !streamingContentRef.current.endsWith(prevChunkRef.current)) {
        streamingContentRef.current += prevChunkRef.current;
      }
      // Force a final update to the streaming message before clearing it
      setStreamingMessage((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          content: streamingContentRef.current,
        };
      });
      // Wait for the next animation frame to ensure React has rendered the last chunk
      requestAnimationFrame(() => {
        setStreamingMessage(null);
        setLoading(false);
        setDebugInfo(prev => prev + '\nRequest finished');
      });
    }
  }, [messages, selectedModel, loading, isClient]);
  
  // Combine messages with streaming message for display
  const displayMessages = [...messages];
  // Do NOT push the streaming message to displayMessages here
  // Instead, pass its id to MessageList for targeted update
  const streamingMessageId = streamingMessage ? streamingMessage.id : undefined;
  
  if (!isClient) {
    return (
      <div className="flex flex-col h-screen bg-gray-900">
        <header className="bg-indigo-800 text-white p-4 shadow-md">
          <h1 className="text-xl font-bold">T3 Chat Clone</h1>
        </header>
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <header className="bg-indigo-800 text-white p-4 shadow-md">
        <h1 className="text-xl font-bold">T3 Chat Clone</h1>
      </header>
      
      <div className="flex flex-col flex-grow overflow-hidden">
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          disabled={loading}
        />
        
        <div className="flex-grow overflow-hidden flex flex-col">
          <MessageList
            messages={
              streamingMessage && !displayMessages.some(m => m.id === streamingMessage.id)
                ? [...displayMessages, streamingMessage]
                : displayMessages
            }
            loading={loading && !streamingMessage}
            streamingMessageId={streamingMessageId}
          />
          <div ref={messagesEndRef} />
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={loading}
            placeholder="Type your message..."
          />
          {/* Debug information - remove in production */}
          <div className="p-2 text-xs text-gray-400 font-mono bg-gray-800 border-t border-gray-700 overflow-auto max-h-40 opacity-90">
            <div>Debug Info:</div>
            <pre>{debugInfo}</pre>
          </div>
        </div>
      </div>
    </div>
  );
} 
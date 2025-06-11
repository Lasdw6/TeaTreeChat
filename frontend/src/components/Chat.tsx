import React, { useState, useEffect, useRef } from 'react';
import ChatList from './ChatList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const DEFAULT_USER_ID = 1;
const DEFAULT_MODEL = "meta-llama/llama-3.3-8b-instruct:free";

interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

interface Chat {
  id: number;
  title: string;
  created_at: string;
  message_count: number;
  last_message: string | null;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [shouldRefreshChats, setShouldRefreshChats] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);

  useEffect(() => {
    if (selectedChatId) {
      fetchChatMessages(selectedChatId);
    } else {
      setMessages([]);
    }
  }, [selectedChatId]);

  const fetchChatMessages = async (chatId: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch chat messages');
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (message: string) => {
    if (!message.trim() || !selectedChatId) return;

    try {
      setIsLoading(true);
      
      // Add user message
      const userMessage = {
        id: Date.now().toString(),
        role: "user",
        content: message,
        created_at: new Date().toISOString(),
      };

      // Add user message to chat
      const userResponse = await fetch(
        `${API_BASE_URL}/chats/${selectedChatId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: "user",
            content: message,
          }),
        }
      );

      if (!userResponse.ok) {
        throw new Error("Failed to add user message");
      }

      // Optimistically add user message to UI
      setMessages(prev => [...prev, userMessage]);

      // Create a temporary message for streaming
      const tempMessageId = Date.now().toString();
      setStreamingMessageId(tempMessageId);
      setMessages(prev => [...prev, {
        id: tempMessageId,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
      }]);

      // Get AI response with streaming
      const aiResponse = await fetch(`${API_BASE_URL}/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          stream: true,
          temperature: 0.7,
          max_tokens: 1000
        }),
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json().catch(() => ({}));
        console.error("AI Response Error:", errorData);
        throw new Error(errorData.detail || "Failed to get AI response");
      }

      const reader = aiResponse.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get response reader");
      }

      let accumulatedContent = "";
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulatedContent += parsed.content;
                setMessages(prev => prev.map(msg => 
                  msg.id === tempMessageId 
                    ? { ...msg, content: accumulatedContent }
                    : msg
                ));
              }
            } catch (e) {
              console.error("Error parsing chunk:", e);
            }
          }
        }
      }

      // Update the existing message instead of creating a new one
      const assistantResponse = await fetch(
        `${API_BASE_URL}/chats/${selectedChatId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: tempMessageId,  // Use the same ID
            role: "assistant",
            content: accumulatedContent,
          }),
        }
      );

      if (!assistantResponse.ok) {
        throw new Error("Failed to add AI message");
      }

      // Clear streaming state
      setStreamingMessageId(null);
      
      // Refresh chat list
      setShouldRefreshChats(true);
    } catch (error) {
      console.error("Error in chat:", error);
      // Remove the temporary message if there was an error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
      setStreamingMessageId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const onChatListRefresh = () => {
    setShouldRefreshChats(false);
  };

  return (
    <div className="flex h-screen bg-gray-900">
      <ChatList 
        onSelectChat={setSelectedChatId} 
        selectedChatId={selectedChatId} 
        shouldRefresh={shouldRefreshChats}
        onRefresh={onChatListRefresh}
      />
      
      <div className="flex-1 flex flex-col">
        {!selectedChatId ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Welcome to the Chat App</h2>
              <p>Select a chat from the sidebar or create a new one to start messaging</p>
            </div>
          </div>
        ) : (
          <>
            <MessageList 
              messages={messages}
              loading={isLoading}
              streamingMessageId={streamingMessageId}
            />
            <MessageInput
              onSendMessage={handleSend}
              disabled={isLoading}
              placeholder="Type your message..."
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />
          </>
        )}
      </div>
    </div>
  );
} 
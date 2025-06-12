import React, { useState, useEffect, useRef, useMemo } from 'react';
import ChatList from './ChatList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const DEFAULT_USER_ID = 1;
const DEFAULT_MODEL = "meta-llama/llama-3.3-8b-instruct:free";

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  chat_id: number;
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
  const [streamingMessageId, setStreamingMessageId] = useState<string | undefined>(undefined);
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
      
      // Sort messages by created_at
      data.sort((a: Message, b: Message) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      setMessages(data);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (message: string) => {
    if (!message.trim() || !selectedChatId) return;

    let tempMessageId: string | undefined = undefined;
    setIsLoading(true);

    try {
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: message,
        created_at: new Date().toISOString(),
        chat_id: selectedChatId
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
      tempMessageId = Date.now().toString();
      setStreamingMessageId(tempMessageId);
      const tempMessage: Message = {
        id: tempMessageId,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
        chat_id: selectedChatId
      };
      setMessages(prev => [...prev, tempMessage]);

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
      let lastChunkTimeout: NodeJS.Timeout | undefined;

      const updateMessage = (content: string) => {
        setMessages(prevMessages => {
          const updatedMessages = prevMessages.map(msg => {
            if (msg.id.toString() === tempMessageId) {
              return { ...msg, content };
            }
            return msg;
          });
          return updatedMessages;
        });
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                // Clear any existing timeout
                if (lastChunkTimeout) {
                  clearTimeout(lastChunkTimeout);
                }
                // Set a timeout to ensure we get any delayed chunks
                lastChunkTimeout = setTimeout(() => {
                  updateMessage(accumulatedContent);
                }, 500);
                break;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  accumulatedContent += parsed.content;
                  updateMessage(accumulatedContent);
                }
              } catch (e) {
                console.error("Error parsing chunk:", e);
              }
            }
          }

          if (done) {
            // Clear any existing timeout
            if (lastChunkTimeout) {
              clearTimeout(lastChunkTimeout);
            }
            // Final update to ensure we have the complete content
            updateMessage(accumulatedContent);
            break;
          }
        }
      } finally {
        // Clean up timeout
        if (lastChunkTimeout) {
          clearTimeout(lastChunkTimeout);
        }
        // One final update to ensure we have everything
        updateMessage(accumulatedContent);
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
            id: parseInt(tempMessageId),  // Use the same ID
            role: "assistant",
            content: accumulatedContent,
          }),
        }
      );

      if (!assistantResponse.ok) {
        throw new Error("Failed to add AI message");
      }

      // Clear streaming state
      setStreamingMessageId(undefined);
      
      // Refresh chat list
      setShouldRefreshChats(true);
    } catch (error) {
      console.error("Error in chat:", error);
      // Remove the temporary message if there was an error
      if (tempMessageId) {
        setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
      }
      setStreamingMessageId(undefined);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async (messageId: string, model?: string) => {
    if (!selectedChatId) return;

    setIsLoading(true);

    // Find the message to regenerate and all messages before it
    const messageIndex = messages.findIndex(msg => msg.id.toString() === messageId);
    if (messageIndex === -1) return;
    
    // Keep only messages before the one being regenerated
    const messagesToKeep = messages.slice(0, messageIndex);
    const lastUserMessage = messagesToKeep.reverse().find(msg => msg.role === 'user');
    
    if (!lastUserMessage) return;

    try {
      // Start deletion in parallel with streaming
      const deletePromise = fetch(
        `${API_BASE_URL}/chats/${selectedChatId}/messages/regenerate/${messageId}`,
        {
          method: "DELETE",
        }
      );

      // Update UI immediately to remove the current message and all messages after it
      setMessages(messagesToKeep);

      // Set streaming state
      setStreamingMessageId(messageId);

      // Create a temporary message for streaming
      const tempMessage: Message = {
        id: messageId,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
        chat_id: selectedChatId
      };
      setMessages(prev => [...prev, tempMessage]);

      // Start streaming in parallel with deletion
      const aiResponse = await fetch(`${API_BASE_URL}/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model || selectedModel,
          messages: [...messagesToKeep, lastUserMessage].map(msg => ({
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

      // Wait for deletion to complete
      const deleteResponse = await deletePromise;
      if (!deleteResponse.ok) {
        throw new Error("Failed to delete messages");
      }

      const reader = aiResponse.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get response reader");
      }

      let accumulatedContent = "";
      const decoder = new TextDecoder();
      let lastChunkTimeout: NodeJS.Timeout | undefined;

      const updateMessage = (content: string) => {
        setMessages(prevMessages => {
          // Keep all messages up to the regeneration point
          const messagesUpToRegeneration = prevMessages.slice(0, messageIndex);
          // Add the streaming message
          return [...messagesUpToRegeneration, {
            id: messageId,
            role: "assistant",
            content: content,
            created_at: new Date().toISOString(),
            chat_id: selectedChatId
          }];
        });
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                // Clear any existing timeout
                if (lastChunkTimeout) {
                  clearTimeout(lastChunkTimeout);
                }
                // Set a timeout to ensure we get any delayed chunks
                lastChunkTimeout = setTimeout(() => {
                  updateMessage(accumulatedContent);
                }, 500);
                break;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  accumulatedContent += parsed.content;
                  updateMessage(accumulatedContent);
                }
              } catch (e) {
                console.error("Error parsing chunk:", e);
              }
            }
          }

          if (done) {
            // Clear any existing timeout
            if (lastChunkTimeout) {
              clearTimeout(lastChunkTimeout);
            }
            // Final update to ensure we have the complete content
            updateMessage(accumulatedContent);
            break;
          }
        }
      } finally {
        // Clean up timeout
        if (lastChunkTimeout) {
          clearTimeout(lastChunkTimeout);
        }
        // One final update to ensure we have everything
        updateMessage(accumulatedContent);
      }

      // Update the message in the database
      const assistantResponse = await fetch(
        `${API_BASE_URL}/chats/${selectedChatId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: parseInt(messageId),
            role: "assistant",
            content: accumulatedContent,
            regeneration_id: model || selectedModel,
            chat_id: selectedChatId
          }),
        }
      );

      if (!assistantResponse.ok) {
        throw new Error("Failed to update AI message");
      }

      // Clear streaming state
      setStreamingMessageId(undefined);
      
      // Refresh chat list
      setShouldRefreshChats(true);
    } catch (error) {
      console.error("Error in regeneration:", error);
      setStreamingMessageId(undefined);
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
              onRegenerate={handleRegenerate}
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
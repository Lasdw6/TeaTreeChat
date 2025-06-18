import React, { useState, useEffect, useRef, useMemo } from 'react';
import ChatList from './ChatList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useRouter } from 'next/navigation';
import { Menu as MenuIcon, ChevronLeft as ChevronLeftIcon } from '@mui/icons-material';
import { useAuth } from '@/app/AuthProvider';
import { useTheme } from '@mui/material/styles';
import { Snackbar, Alert } from '@mui/material';
import chatCache from '@/lib/chatCache';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const DEFAULT_USER_ID = 1;
const DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  chat_id: number;
  model?: string;
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
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [shouldRefreshChats, setShouldRefreshChats] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | undefined>(undefined);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();
  const { user, token } = useAuth();
  const theme = useTheme();
  const [errorText, setErrorText] = useState<string | null>(null);
  const idCounter = useRef(0);
  const [apiKey, setApiKey] = useState<string | null>(null);

  function getUniqueId() {
    idCounter.current += 1;
    return `msg_${idCounter.current}`;
  }

  // Function to get the last used model from messages
  const getLastUsedModel = (messages: Message[]): string => {
    console.log('Getting last used model from messages:', messages.map(m => ({ id: m.id, role: m.role, model: m.model })));
    // Look for the most recent message with a model (going backwards)
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].model) {
        console.log(`Found last used model: ${messages[i].model}`);
        return messages[i].model!;
      }
    }
    // If no model found in messages, return default
    console.log(`No model found in messages, using default: ${DEFAULT_MODEL}`);
    return DEFAULT_MODEL;
  };

  useEffect(() => {
    if (selectedChatId) {
      fetchChatMessages(selectedChatId);
    } else {
      setMessages([]);
      // Reset to default model when no chat is selected
      setSelectedModel(DEFAULT_MODEL);
    }
  }, [selectedChatId]);

  // Update selected model based on last message when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const lastUsedModel = getLastUsedModel(messages);
      if (lastUsedModel !== selectedModel) {
        setSelectedModel(lastUsedModel);
      }
    } else if (selectedChatId) {
      // If chat is selected but no messages, use default
      setSelectedModel(DEFAULT_MODEL);
    }
  }, [messages, selectedChatId]);

  // On mount and when localStorage changes, update apiKey from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setApiKey(localStorage.getItem('apiKey'));
      const handleStorage = (e: StorageEvent) => {
        if (e.key === 'apiKey') setApiKey(e.newValue);
      };
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    }
  }, []);

  const fetchChatMessages = async (chatId: number) => {
    try {
      setIsLoading(true);
      
      // First, try to load from cache for instant display
      const cachedChat = chatCache.getCachedChatWithMessages(chatId);
      if (cachedChat?.messages) {
        console.log(`Loading messages for chat ${chatId} from cache`);
        setMessages(cachedChat.messages);
        setSelectedChat({
          id: cachedChat.id,
          title: cachedChat.title,
          created_at: cachedChat.created_at,
          message_count: cachedChat.message_count || 0,
          last_message: cachedChat.last_message || null
        });
      }
      
      // Then fetch fresh data
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      if (!response.ok) throw new Error('Failed to fetch chat messages');
      const data = await response.json();
      
      // Cache the messages for quick access later
      chatCache.cacheMessages(chatId, data);
      setMessages(data);

      // Fetch chat details
      const chatResponse = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      if (chatResponse.ok) {
        const chatData = await chatResponse.json();
        setSelectedChat(chatData);
      }
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      // If we have cached messages and API fails, keep using them
      const cachedChat = chatCache.getCachedChatWithMessages(chatId);
      if (cachedChat?.messages && messages.length === 0) {
        console.log('API failed, using cached messages');
        setMessages(cachedChat.messages);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (message: string) => {
    if (!message.trim() || !selectedChatId) return;

    // Check if user has API key set in their account
    if (!user?.has_api_key) {
      const errMsg = 'No API key detected. Please set your OpenRouter API key in Settings.';
      const userMessage: Message = {
        id: getUniqueId(),
        role: 'user',
        content: message,
        created_at: new Date().toISOString(),
        chat_id: selectedChatId,
        model: selectedModel
      };
      setMessages(prev => [...prev, userMessage, {
        id: getUniqueId(),
        role: 'assistant',
        content: errMsg,
        created_at: new Date().toISOString(),
        chat_id: selectedChatId,
        model: selectedModel
      }]);
      setErrorText(errMsg);
      return;
    }

    let tempMessageId: string | undefined = undefined;
    setIsLoading(true);

    try {
      // Add user message
      const userMessage: Message = {
        id: getUniqueId(),
        role: "user",
        content: message,
        created_at: new Date().toISOString(),
        chat_id: selectedChatId,
        model: selectedModel
      };

      // Add user message to chat
      const userResponse = await fetch(
        `${API_BASE_URL}/chats/${selectedChatId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            role: "user",
            content: message,
            model: selectedModel
          }),
        }
      );

      if (!userResponse.ok) {
        const errData = await userResponse.json().catch(() => ({}));
        const errMsg = errData.detail || "Failed to add user message";
        // Surface error to the UI as a system message
        const newSystemMsg: Message = {
          id: getUniqueId(),
          role: "assistant",
          content: errMsg,
          created_at: new Date().toISOString(),
          chat_id: selectedChatId,
          model: selectedModel
        };
        setMessages(prev => [...prev, userMessage, newSystemMsg]);
        setErrorText(errMsg);
        throw new Error(errMsg);
      }

      // Optimistically add user message to UI
      setMessages(prev => [...prev, userMessage]);

      // Create a temporary message for streaming
      tempMessageId = getUniqueId();
      setStreamingMessageId(tempMessageId);
      const tempMessage: Message = {
        id: tempMessageId,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
        chat_id: selectedChatId,
        model: selectedModel
      };
      setMessages(prev => [...prev, tempMessage]);

      // Get AI response with streaming
      const aiResponse = await fetch(`${API_BASE_URL}/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
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
        const errMsg = errorData.detail || "Failed to get AI response.";
        console.error("AI Response Error:", errorData);
        // Show in UI
        setMessages(prev => [
          ...prev.filter(msg => msg.id !== tempMessageId),
          {
            id: getUniqueId(),
            role: "assistant",
            content: errMsg,
            created_at: new Date().toISOString(),
            chat_id: selectedChatId,
            model: selectedModel
          }
        ]);
        setErrorText(errMsg);
        throw new Error(errMsg);
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
              if (parsed.detail) {
                const errMsg: string = parsed.detail;
                accumulatedContent = errMsg;
                updateMessage(errMsg);
                setErrorText(errMsg);
                setStreamingMessageId(undefined);
                // Cancel further reading
                reader?.cancel().catch(() => {});
                break;
              }
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
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            role: "assistant",
            content: accumulatedContent,
            model: selectedModel
          }),
        }
      );

      if (!assistantResponse.ok) {
        throw new Error("Failed to add AI message");
      }

      // Get the database ID and update the message
      const savedMessage = await assistantResponse.json();
      console.log('Saved message response (handleSend):', savedMessage, 'tempMessageId:', tempMessageId);
      if (savedMessage.id) {
        setMessages(prev => {
          const updated = prev.map(msg => {
            if (msg.id === tempMessageId) {
              console.log('Updating message ID from', msg.id, 'to', savedMessage.id.toString());
              return { ...msg, id: savedMessage.id.toString() };
            }
            return msg;
          });
          return updated;
        });
      }

      // Clear streaming state
      setStreamingMessageId(undefined);
      
      // Refresh chat list
      setShouldRefreshChats(true);
    } catch (error) {
      console.error("Error in chat:", error);
      // Remove the temporary message if there was an error and it is still empty (not replaced by error)
      if (tempMessageId) {
        setMessages(prev => prev.filter(msg => {
          if (msg.id !== tempMessageId) return true;
          // Only remove if content is still empty (was not replaced by error)
          return !!msg.content;
        }));
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
    
    const messageToRegenerate = messages[messageIndex];
    
    // Only allow regeneration of messages that have database IDs (numeric)
    if (typeof messageToRegenerate.id === 'string' && messageToRegenerate.id.startsWith('msg_')) {
      console.error('Cannot regenerate temporary message:', messageToRegenerate.id);
      setErrorText('Cannot regenerate a message that is still being processed. Please wait for it to complete.');
      setIsLoading(false);
      return;
    }
    
    // Keep only messages before the one being regenerated
    const messagesToKeep = messages.slice(0, messageIndex);
    const lastUserMessage = [...messagesToKeep].reverse().find(msg => msg.role === 'user');
    
    if (!lastUserMessage) return;

    try {
      // Use the database ID for deletion
      const dbMessageId = messageToRegenerate.id;
      
      // Start deletion in parallel with streaming
      const deletePromise = fetch(
        `${API_BASE_URL}/chats/${selectedChatId}/messages/regenerate/${dbMessageId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }
      );

      // Update UI immediately to remove the current message and all messages after it
      setMessages(messagesToKeep);

      // Create a temporary message for streaming
      const tempMessageId = getUniqueId();
      const tempMessage: Message = {
        id: tempMessageId,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
        chat_id: selectedChatId
      };
      setMessages(prev => [...prev, tempMessage]);

      // Set streaming state with the temp message ID
      setStreamingMessageId(tempMessageId);

      // Start streaming in parallel with deletion
      const aiResponse = await fetch(`${API_BASE_URL}/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
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
        const errMsg = errorData.detail || "Failed to get AI response";
        console.error("AI Response Error:", errorData);
        // Show in UI
        setMessages(prev => 
          prev.map(msg => {
            if (msg.id === tempMessageId) {
              return { ...msg, content: errMsg };
            }
            return msg;
          })
        );
        setErrorText(errMsg);
        throw new Error(errMsg);
      }

      // Wait for deletion to complete
      const deleteResponse = await deletePromise;
      if (!deleteResponse.ok) {
        let errorData: any = {};
        let errorText = '';
        try {
          errorText = await deleteResponse.text();
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { rawError: errorText };
        }
        
        console.error("Delete response error:", {
          status: deleteResponse.status,
          statusText: deleteResponse.statusText,
          errorData,
          rawErrorText: errorText
        });
        
        const errorMsg = errorData.detail || errorData.message || deleteResponse.statusText || 'Unknown error';
        throw new Error(`Failed to delete messages: ${errorMsg}`);
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
          return prevMessages.map(msg => {
            if (msg.id === tempMessageId) {
              return { ...msg, content };
            }
            return msg;
          });
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
                if (parsed.detail) {
                  const errMsg:string = parsed.detail;
                  accumulatedContent = errMsg;
                  updateMessage(errMsg);
                  setErrorText(errMsg);
                  // Cancel further reading
                  reader?.cancel().catch(()=>{});
                  break;
                }
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
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            role: "assistant",
            content: accumulatedContent,
            model: model || selectedModel
          }),
        }
      );

      if (!assistantResponse.ok) {
        throw new Error("Failed to update AI message");
      }

      // Get the database ID and update the message
      const savedMessage = await assistantResponse.json();
      if (savedMessage.id) {
        setMessages(prev => 
          prev.map(msg => {
            if (msg.id === tempMessageId) {
              return { ...msg, id: savedMessage.id.toString() };
            }
            return msg;
          })
        );
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

  const handleFork = async (messageId: string) => {
    if (!selectedChatId || !user || !token) return;

    try {
      // Create a new chat
      const newChatResponse = await fetch(`${API_BASE_URL}/chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: `Fork of ${selectedChat?.title || 'Chat'}`,
          model: selectedModel,
          user_id: user.id
        }),
      });

      if (!newChatResponse.ok) {
        const errorData = await newChatResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to create new chat");
      }

      const newChat = await newChatResponse.json();

      // Get all messages up to the fork point
      const messagesToCopy = messages.slice(0, messages.findIndex(msg => msg.id.toString() === messageId) + 1);

      // Copy messages to the new chat
      for (const message of messagesToCopy) {
        const messageResponse = await fetch(`${API_BASE_URL}/chats/${newChat.id}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            role: message.role,
            content: message.content,
            model: message.model || selectedModel
          }),
        });

        if (!messageResponse.ok) {
          throw new Error("Failed to copy message to new chat");
        }
      }

      // Add to cache and select the new chat
      chatCache.addNewChat(newChat);
      setSelectedChatId(newChat.id);
      // Refresh chat list
      setShouldRefreshChats(true);
    } catch (error) {
      console.error("Error forking chat:", error);
    }
  };

  const onChatListRefresh = () => {
    setShouldRefreshChats(false);
  };

  return (
    <div className="flex h-screen" style={{ background: 'transparent' }}>
      {/* Collapsible Sidebar */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-12'} flex flex-col`} style={{ background: '#D6BFA3', paddingRight: '4px', paddingTop: '4px' }}>
        <button
          className="p-2 w-full text-left focus:outline-none hover:text-white cursor-pointer"
          style={{ 
            color: '#4E342E', 
            backgroundColor: '#D6BFA3',
            transition: 'all 0.2s ease',
            border: 'none',
            zIndex: 10,
            position: 'relative'
          }}
          onClick={() => setSidebarOpen((open) => !open)}
        >
          {sidebarOpen ? <ChevronLeftIcon /> : <MenuIcon />}
        </button>
        {sidebarOpen && (
      <ChatList 
        onSelectChat={setSelectedChatId} 
        selectedChatId={selectedChatId} 
        shouldRefresh={shouldRefreshChats}
        onRefresh={onChatListRefresh}
      />
        )}
      </div>
      <div className="flex-1 flex flex-col" style={{ background: 'transparent' }}>
        {!selectedChatId ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Welcome to TeaTree Chat</h2>
              <p>Select a chat from the sidebar or create a new one to start messaging</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-0 py-8">
            <div className="w-full max-w-2xl rounded-2xl shadow-lg bg-gray-800" style={{ marginTop: '20vh' }}>
              <MessageInput
                onSendMessage={handleSend}
                disabled={isLoading}
                placeholder="Type your message..."
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
              />
            </div>
          </div>
        ) : (
          <>
            <MessageList 
              messages={messages}
              loading={isLoading}
              streamingMessageId={streamingMessageId}
              onRegenerate={handleRegenerate}
              onFork={handleFork}
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
      <Snackbar open={!!errorText} autoHideDuration={6000} onClose={()=>setErrorText(null)} anchorOrigin={{vertical:'bottom',horizontal:'center'}}>
        <Alert severity="error" sx={{bgcolor:'#4E342E',color:'#ef4444',border:'1px solid #ef4444'}}>{errorText}</Alert>
      </Snackbar>
    </div>
  );
} 
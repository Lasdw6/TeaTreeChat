import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatList from './ChatList';
import MessageList, { MessageListRef } from './MessageList';
import MessageInput from './MessageInput';
import { useRouter, usePathname } from 'next/navigation';
import { Menu as MenuIcon, ChevronLeft as ChevronLeftIcon, ArrowDownward as ArrowDownwardIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { useUser, useAuth } from '@clerk/nextjs';
import { useTheme } from '@mui/material/styles';
import { Box, Fade, Fab, Typography, Drawer, IconButton } from '@mui/material';
import TeaTreeLogo from './TeaTreeLogo';
import chatCache from '@/lib/chatCache';
import { getModels, pingServer } from '@/lib/api';
import { Model } from '@/types/chat';
import { DEFAULT_MODEL, APP_NAME } from '@/lib/constants';
import useMediaQuery from '@/hooks/useMediaQuery';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
console.log('DEFAULT_MODEL defined as:', DEFAULT_MODEL);

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: string[];
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
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const theme = useTheme();
  const idCounter = useRef(0);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const messageListRef = useRef<MessageListRef>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isSettingsPage = pathname === '/settings';
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  function getUniqueId() {
    idCounter.current += 1;
    return `msg_${Date.now()}_${idCounter.current}`;
  }

  // Function to get the last used model from messages
  const getLastUsedModel = (messages: Message[]): string => {
    console.log('Getting last used model from messages:', messages.map(m => ({ id: m.id, role: m.role, model: m.model })));
    // Look for the most recent message with a model (going backwards)
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].model && messages[i].model !== null && messages[i].model !== undefined) {
        console.log(`Found last used model: ${messages[i].model}`);
        return messages[i].model!;
      }
    }
    // If no model found in messages, return default
    console.log(`No model found in messages, using default: ${DEFAULT_MODEL}`);
    return DEFAULT_MODEL;
  };

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setIsInitializing(true);
        await pingServer();
        const models = await getModels();
        setAvailableModels(models);
      } catch (error) {
        console.error('Error fetching models:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    fetchModels();
  }, []);

  useEffect(() => {
    if (selectedChatId) {
      fetchChatMessages(selectedChatId);
      idCounter.current = 0; // Reset counter when chat changes
    } else {
      setMessages([]);
      // Reset to default model when no chat is selected
      setSelectedModel(DEFAULT_MODEL);
    }
  }, [selectedChatId]);

  useEffect(() => {
    if (!streamingMessageId) {
      setTimeout(() => {
        messageListRef.current?.checkScrollPosition();
      }, 100);
    }
  }, [streamingMessageId]);

  // Update selected model based on last message when messages change
  // Only run this if we don't have a selectedChatId (for new chats)
  useEffect(() => {
    console.log('Model selection effect triggered:', { 
      messagesLength: messages.length, 
      selectedChatId, 
      currentSelectedModel: selectedModel 
    });
    
    // Only update model automatically if we don't have a selected chat
    // For selected chats, the model is set directly in fetchChatMessages
    if (!selectedChatId && messages.length === 0) {
      console.log('No chat selected, using default model');
      setSelectedModel(DEFAULT_MODEL);
    }
  }, [messages.length, selectedChatId]);

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
      // Check if we have fresh cached data
      const cachedChat = chatCache.getCachedChatWithMessages(chatId);
      const shouldRefresh = chatCache.shouldRefreshChat(chatId);
      
      if (cachedChat?.messages && !shouldRefresh) {
        // Use cached data without API call - it's fresh enough
        console.log(`Using fresh cached data for chat ${chatId}, skipping API call`);
        setMessages(cachedChat.messages);
        setSelectedChat({
          id: cachedChat.id,
          title: cachedChat.title,
          created_at: cachedChat.created_at,
          message_count: cachedChat.message_count || 0,
          last_message: cachedChat.last_message || null
        });
        
        // Update model based on cached messages
        const lastUsedModel = getLastUsedModel(cachedChat.messages);
        console.log(`Setting model from cached messages: ${lastUsedModel}`);
        setSelectedModel(lastUsedModel);
        
        // Mark as accessed to update the cache timestamp
        chatCache.markAsAccessed(chatId);
        return; // Exit early - no API call needed
      }
      
      setIsChatLoading(true);
      
      // If we have cached data but it's stale, show it immediately while fetching fresh data
      if (cachedChat?.messages) {
        console.log(`Loading stale cached data for chat ${chatId} while fetching fresh data`);
        setMessages(cachedChat.messages);
        setSelectedChat({
          id: cachedChat.id,
          title: cachedChat.title,
          created_at: cachedChat.created_at,
          message_count: cachedChat.message_count || 0,
          last_message: cachedChat.last_message || null
        });
        
        // Update model based on cached messages
        const lastUsedModel = getLastUsedModel(cachedChat.messages);
        console.log(`Setting model from cached messages: ${lastUsedModel}`);
        setSelectedModel(lastUsedModel);
        setIsChatLoading(false); // Stop loading UI since we have something to show
      }
      
      // If no signed-in user, do not attempt API fetch
      if (!clerkUser) {
        setIsChatLoading(false);
        return;
      }

      // Fetch fresh data from API
      const token = await getToken();
      console.log(`[Chat] Fetching fresh data for chat ${chatId} from API`, { API_BASE_URL, token: token ? 'present' : 'missing' });
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Chat] Failed to fetch messages. Status: ${response.status}`, errorText);
        throw new Error(`Failed to fetch messages: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      console.log('Fetched fresh messages from API:', data);
      
      // Cache the fresh messages
      chatCache.cacheMessages(chatId, data);
      setMessages(data);
      
      // Update model based on fresh data
      const lastUsedModel = getLastUsedModel(data);
      console.log(`Setting model from fresh messages: ${lastUsedModel}`);
      setSelectedModel(lastUsedModel);

      // Fetch chat details if we don't have them cached or they're stale
      if (!cachedChat || shouldRefresh) {
        try {
          const chatResponse = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (chatResponse.ok) {
            const chatData = await chatResponse.json();
            setSelectedChat(chatData);
          } else {
            console.warn(`[Chat] Failed to fetch chat details. Status: ${chatResponse.status}`);
          }
        } catch (chatError) {
          console.error('[Chat] Error fetching chat details:', chatError);
          // Continue with messages even if chat details fail
        }
      }
    } catch (error) {
      console.error('[Chat] Error fetching chat messages:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('[Chat] Network error - is the backend running?', API_BASE_URL);
      }
      // If we have cached messages and API fails, keep using them
      const cachedChat = chatCache.getCachedChatWithMessages(chatId);
      if (cachedChat?.messages && messages.length === 0) {
        console.log('API failed, using cached messages as fallback');
        setMessages(cachedChat.messages);
        setSelectedChat({
          id: cachedChat.id,
          title: cachedChat.title,
          created_at: cachedChat.created_at,
          message_count: cachedChat.message_count || 0,
          last_message: cachedChat.last_message || null
        });
        // Update model based on cached messages
        const lastUsedModel = getLastUsedModel(cachedChat.messages);
        console.log(`Setting model from fallback cached messages: ${lastUsedModel}`);
        setSelectedModel(lastUsedModel);
      }
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSend = async (messageData: { content: string, attachments: string[] }) => {
    const { content, attachments } = messageData;
    
    // Embed attachments in content using markdown code blocks
    let combinedContent = '';
    if (attachments.length > 0) {
      const attachmentBlocks = attachments.map((attachment) => 
        `\`\`\`attachment\n${attachment}\n\`\`\``
      ).join('\n\n');
      combinedContent = attachmentBlocks + (content.trim() ? '\n\n' + content : '');
    } else {
      combinedContent = content;
    }

    if (!combinedContent.trim()) {
      console.warn("[Chat] Cannot send empty message");
      return;
    }
    
    if (!selectedChatId) {
      console.error("[Chat] No chat selected. Cannot send message.");
      // Create a new chat if none is selected
      // This will be handled by ChatList component, but show error for now
      alert("Please select a chat or create a new one to send messages.");
      return;
    }

    let tempMessageId: string | undefined = undefined;
    setIsLoading(true);

    try {
      // Add user message (store in the new embedded format for UI)
      const userMessage: Message = {
        id: getUniqueId(),
        role: "user",
        content: combinedContent, // This now includes embedded attachments
        attachments: [], // Clear attachments since they're now embedded
        created_at: new Date().toISOString(),
        chat_id: selectedChatId,
        model: selectedModel
      };

      // Get token for authenticated requests
      const token = clerkUser ? await getToken() : null;

      // Persist user message only when logged in
      if (clerkUser && token) {
        const userResponse = await fetch(
          `${API_BASE_URL}/chats/${selectedChatId}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              role: "user",
              content: combinedContent,
              model: selectedModel,
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
            model: selectedModel,
          };
          setMessages((prev) => [...prev, userMessage, newSystemMsg]);
          setStreamingMessageId(undefined);
          throw new Error(errMsg);
        }
      }

      // Optimistically add user message to UI
      setMessages(prev => [...prev, userMessage]);

      // Optimistically move the chat to the top
      if (selectedChatId) {
        chatCache.moveChatToTop(selectedChatId);
        setShouldRefreshChats(true); // Trigger a refresh in the chat list
      }

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

      // Determine the correct completions endpoint based on auth state
      const completionsPath = clerkUser && token ? "/completions" : "/guest/completions";

      // Get AI response with streaming
      const aiResponse = await fetch(`${API_BASE_URL}${completionsPath}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(clerkUser && token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [...messages, { ...userMessage, content: combinedContent }].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          stream: true,
          temperature: 0.7,
          max_tokens: 1000
        }),
      });

      if (!aiResponse.ok) {
        let errorData: any = {};
        try {
          const text = await aiResponse.text();
          errorData = text ? JSON.parse(text) : {};
        } catch (e) {
          console.error("Failed to parse error response:", e);
        }
        let errMsg = errorData.detail || errorData.message || `Failed to get AI response (${aiResponse.status}).`;
        
        // Provide helpful error messages for common errors
        if (aiResponse.status === 400 && errMsg.includes("API key")) {
          errMsg = "API key not set. Please go to Settings and add your OpenRouter API key to use AI responses.";
        } else if (aiResponse.status === 429) {
          errMsg = "Rate limit exceeded. Please try again later.";
        }
        
        console.error("AI Response Error:", { status: aiResponse.status, errorData, errMsg });
        
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
        setStreamingMessageId(undefined);
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
          // Also update the cache
          if (selectedChatId) {
            chatCache.cacheMessages(selectedChatId, updatedMessages);
          }
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
                  console.log("Stream finished (timeout).");
                  reader.cancel();
                  // Final cache update and refresh
                  if (selectedChatId) {
                    setMessages(currentMessages => {
                      chatCache.cacheMessages(selectedChatId, currentMessages);
                      return currentMessages;
                    });
                    setShouldRefreshChats(true);
                  }
                }, 2000);
                break;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.detail) {
                  const errMsg: string = parsed.detail;
                  accumulatedContent = errMsg;
                  updateMessage(errMsg);
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
            // Clear streaming state since we're done
            setStreamingMessageId(undefined);
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
        // Always clear streaming state in finally to ensure input is re-enabled
        setStreamingMessageId(undefined);
      }

      // Update the existing message instead of creating a new one
      if (clerkUser && token && selectedChatId && selectedChatId > 0) {
        const assistantResponse = await fetch(
          `${API_BASE_URL}/chats/${selectedChatId}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              role: "assistant",
              content: accumulatedContent,
              model: selectedModel
            }),
          }
        );

        if (!assistantResponse.ok) {
          const errData = await assistantResponse.json().catch(() => ({}));
          console.error("Failed to save assistant message:", errData);
        }
      }

      // Update cache with new messages
      if (selectedChatId) {
        setMessages(currentMessages => {
          chatCache.cacheMessages(selectedChatId, currentMessages);
          return currentMessages;
        });
      }
      
      // Refresh chat list again to get final data
      if (selectedChatId) {
        setShouldRefreshChats(true);
      }
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
      setIsLoading(false);
      return;
    }
    
    // Keep only messages before the one being regenerated
    const messagesToKeep = messages.slice(0, messageIndex);
    const lastUserMessage = [...messagesToKeep].reverse().find(msg => msg.role === 'user');
    
    if (!lastUserMessage) return;

    try {
      const token = clerkUser ? await getToken() : null;
      
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
        setStreamingMessageId(undefined);
        throw new Error(errMsg);
      }

      // Wait for deletion to complete
      const deleteResponse = await deletePromise;
      if (!deleteResponse.ok) {
        try {
          const text = await deleteResponse.text();
          console.warn('Non-blocking delete failure:', deleteResponse.status, deleteResponse.statusText, text);
        } catch (_) {
          console.warn('Non-blocking delete failure:', deleteResponse.status, deleteResponse.statusText);
        }
        // Continue regeneration even if cleanup fails
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
                  console.log("Stream finished (timeout).");
                  reader.cancel();
                  // Final cache update and refresh
                  if (selectedChatId) {
                    setMessages(currentMessages => {
                      chatCache.cacheMessages(selectedChatId, currentMessages);
                      return currentMessages;
                    });
                    setShouldRefreshChats(true);
                  }
                }, 2000);
                break;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.detail) {
                  const errMsg: string = parsed.detail;
                  accumulatedContent = errMsg;
                  updateMessage(errMsg);
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

      // Store the new assistant message
      if (clerkUser && token && selectedChatId && selectedChatId > 0) {
        const assistantResponse = await fetch(
          `${API_BASE_URL}/chats/${selectedChatId}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              role: "assistant",
              content: accumulatedContent,
              model: model || selectedModel
            }),
          }
        );

        if (!assistantResponse.ok) {
          const errData = await assistantResponse.json().catch(() => ({}));
          console.error("Failed to save regenerated message:", errData);
        }
      }

      // Update cache with new messages
      if (selectedChatId) {
        setMessages(currentMessages => {
          chatCache.cacheMessages(selectedChatId, currentMessages);
          return currentMessages;
        });
        setShouldRefreshChats(true);
      }
    } catch (error) {
      console.error("Error in regeneration:", error);
    } finally {
      setIsLoading(false);
      setStreamingMessageId(undefined);
    }
  };

  const handleFork = async (messageId: string) => {
    const token = clerkUser ? await getToken() : null;
    if (!selectedChatId || !clerkUser || !token) return;

    try {
      // Create a new chat
      const newChatResponse = await fetch(`${API_BASE_URL}/chats/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: `Fork of ${selectedChat?.title || 'Chat'}`,
          model: selectedModel,
          user_id: clerkUser.id
        }),
      });

      if (!newChatResponse.ok) {
        throw new Error("Failed to create new chat");
      }

      const newChat = await newChatResponse.json();

      // Find the index of the message to fork from
      const messageIndex = messages.findIndex(msg => msg.id.toString() === messageId);
      if (messageIndex === -1) return;

      // Copy messages up to and including the selected message
      const messagesToCopy = messages.slice(0, messageIndex + 1);

      // Add messages to the new chat
      for (const message of messagesToCopy) {
        await fetch(`${API_BASE_URL}/chats/${newChat.id}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            role: message.role,
            content: message.content,
            model: message.model || selectedModel
          }),
        });
      }

      // Navigate to the new chat
      setSelectedChatId(newChat.id);
      setShouldRefreshChats(true);
    } catch (error) {
      console.error("Error forking chat:", error);
    }
  };

  const onChatListRefresh = () => {
    setShouldRefreshChats(false);
  };

  const handleSelectChat = (chatId: number | null) => {
    setSelectedChatId(chatId);
    setMessages([]);
    if (chatId) {
      fetchChatMessages(chatId);
    }
    if (isMobile) {
      setMobileSidebarOpen(false);
    }
  };

  const sidebarContent = (
    <ChatList 
      onSelectChat={handleSelectChat} 
      selectedChatId={selectedChatId} 
      shouldRefresh={shouldRefreshChats}
      onRefresh={onChatListRefresh}
    />
  );

  return (
    <div className="flex h-screen" style={{ background: 'transparent' }}>
      {isMobile ? (
        <Drawer
          open={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          variant="temporary"
          sx={{
            '& .MuiDrawer-paper': {
              width: 260,
              backgroundColor: '#4E342E',
              color: '#D6BFA3',
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      ) : (
        <div className={`transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-12'} flex flex-col relative`} style={{ background: '#4E342E', paddingRight: '4px', paddingTop: '4px' }}>
          <button
            className="p-2 w-full text-left focus:outline-none hover:text-white cursor-pointer flex items-center justify-center"
            style={{ 
              color: '#D6BFA3', 
              backgroundColor: '#4E342E',
              transition: 'all 0.2s ease',
              border: 'none',
              zIndex: 10,
              position: 'relative',
              minHeight: '48px'
            }}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? (
              <ChevronLeftIcon />
            ) : (
              <div className="flex flex-col items-center">
                <TeaTreeLogo size={24} />
              </div>
            )}
          </button>
          {sidebarOpen && sidebarContent}
          {/* API Key indicator dot at bottom of collapsed sidebar */}
          {!sidebarOpen && (
            <div 
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#D6BFA3',
                padding: '6px',
                borderRadius: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              title={clerkUser ? (apiKey ? 'API Key Set' : 'No API Key Set') : (apiKey ? 'API Key Set' : 'Guest Mode - No API Key Required')}
            >
              <div 
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: clerkUser ? (apiKey ? '#5B6F56' : '#ef4444') : (apiKey ? '#5B6F56' : '#ef4444'),
                  border: '1px solid #4E342E',
                }}
              />
            </div>
          )}
        </div>
      )}
      <div className="flex-1 flex flex-col" style={{ background: 'transparent' }}>
        {isMobile && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 16px',
            borderBottom: `1px solid ${theme.palette.divider}`,
            position: 'sticky',
            top: 0,
            background: '#4E342E',
            zIndex: 1100,
          }}>
            <IconButton
              onClick={() => setMobileSidebarOpen(true)}
              edge="start"
              sx={{ color: '#D6BFA3', flexShrink: 0 }}
            >
              <MenuIcon />
            </IconButton>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TeaTreeLogo size={28} />
              <Typography variant="h6" sx={{ color: '#D6BFA3' }}>
                {APP_NAME}
              </Typography>
            </div>
            <IconButton
              onClick={() => router.push('/settings')}
              edge="end"
              sx={{ color: '#D6BFA3', visibility: isSettingsPage ? 'hidden' : 'visible' }}
            >
              <SettingsIcon />
            </IconButton>
          </div>
        )}
        {(isInitializing || isChatLoading) && (
          <div className="flex-1 flex items-center justify-center">
            <Box sx={{ 
              textAlign: 'center', 
              maxWidth: 500, 
              px: 4,
              py: 6,
              bgcolor: 'rgba(78, 52, 46, 0.1)',
              borderRadius: 4,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(214, 191, 163, 0.2)',
              animation: 'fadeIn 0.3s ease-in-out'
            }}>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
                <TeaTreeLogo size={80} />
              </Box>
              <Typography variant="h4" sx={{ 
                color: '#D6BFA3', 
                fontWeight: 700, 
                mb: 2, 
                letterSpacing: 1 
              }}>
                TeaTree Chat
              </Typography>
              <Typography variant="body1" sx={{ 
                color: 'rgba(255, 255, 255, 0.8)', 
                fontSize: 16,
                lineHeight: 1.6 
              }}>
                {isChatLoading ? 'Loading chat...' : 'Initializing...'}
              </Typography>
            </Box>
          </div>
        )}
        {!isInitializing && !isChatLoading && !selectedChatId && (
          <div className="flex-1 flex items-center justify-center">
            <Box sx={{ 
              textAlign: 'center', 
              maxWidth: 500, 
              px: 4,
              py: 6,
              bgcolor: 'rgba(78, 52, 46, 0.1)',
              borderRadius: 4,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(214, 191, 163, 0.2)',
              animation: 'fadeIn 0.3s ease-in-out'
            }}>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
                <TeaTreeLogo size={80} />
              </Box>
              <Typography variant="h4" sx={{ 
                color: '#D6BFA3', 
                fontWeight: 700, 
                mb: 2, 
                letterSpacing: 1 
              }}>
                Welcome to TeaTree Chat
              </Typography>
              <Typography variant="h6" sx={{ 
                color: '#D6BFA3', 
                fontWeight: 400, 
                mb: 3,
                opacity: 0.9 
              }}>
                BYOK AI Chat Platform
              </Typography>
              <Typography variant="body1" sx={{ 
                color: 'rgba(255, 255, 255, 0.8)', 
                fontSize: 16,
                lineHeight: 1.6 
              }}>
                Select a chat from the sidebar or create a new one to start messaging with your favorite AI models
              </Typography>
            </Box>
          </div>
        )}
        {!isInitializing && !isChatLoading && selectedChatId && messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center min-h-0 py-4 md:py-8">
            <div className="w-full max-w-2xl rounded-2xl shadow-lg bg-gray-800" style={{ marginTop: '20vh' }}>
              <MessageInput
                onSendMessage={handleSend}
                disabled={isLoading}
                placeholder="Type your message..."
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                forceUpward={true}
              />
            </div>
          </div>
        )}
        {!isInitializing && !isChatLoading && selectedChatId && messages.length > 0 && (
          <>
            <MessageList 
              key={selectedChatId}
              ref={messageListRef}
              messages={messages}
              loading={isLoading && messages.length === 0}
              streamingMessageId={streamingMessageId}
              onRegenerate={handleRegenerate}
              onFork={handleFork}
              availableModels={availableModels}
              onScrollPositionChange={setIsAtBottom}
            />
            <Box sx={{ position: 'relative', width: '100%', maxWidth: '48rem', mx: 'auto', px: { xs: 1, sm: 2 } }}>
              <MessageInput
                onSendMessage={handleSend}
                disabled={streamingMessageId !== undefined}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
              />
              <Fab
                variant="extended"
                size="medium"
                aria-label="scroll to bottom"
                onClick={() => messageListRef.current?.scrollToBottom()}
                sx={{
                  position: 'absolute',
                  bottom: 'calc(100% + 16px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#4E342E',
                  color: '#D6BFA3',
                  borderRadius: '16px',
                  height: '32px',
                  padding: '0 12px',
                  fontSize: '0.8rem',
                  transition: 'opacity 0.3s ease-in-out, visibility 0.3s ease-in-out',
                  opacity: (!isAtBottom && !streamingMessageId) ? 0.6 : 0,
                  visibility: (!isAtBottom && !streamingMessageId) ? 'visible' : 'hidden',
                  '&:hover': {
                    backgroundColor: '#5a4e44',
                    opacity: 1,
                  },
                }}
              >
                <ArrowDownwardIcon sx={{ mr: 1, fontSize: '1.1rem' }} />
                Scroll to Bottom
              </Fab>
            </Box>
          </>
        )}
      </div>
    </div>
  );
} 
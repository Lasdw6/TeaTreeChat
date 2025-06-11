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
  regeneration_id?: string;
}

interface RegeneratedMessageGroup {
  originalId: string;
  messages: Message[];
  currentIndex: number;
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
  const [regeneratedGroups, setRegeneratedGroups] = useState<Record<string, RegeneratedMessageGroup>>({});
  const [messageGroups, setMessageGroups] = useState<Message[][]>([]);
  const [activeMessageGroups, setActiveMessageGroups] = useState<Record<string, number>>({});

  // Group consecutive assistant messages
  useEffect(() => {
    const groups = messages.reduce((groups: Message[][], message, index) => {
      if (index === 0 || message.role !== 'assistant' || messages[index - 1].role !== 'assistant') {
        groups.push([message]);
      } else {
        groups[groups.length - 1].push(message);
      }
      return groups;
    }, []);

    // Only update if the groups have actually changed
    if (JSON.stringify(groups) !== JSON.stringify(messageGroups)) {
      setMessageGroups(groups);
      
      // Initialize active message indices for each group
      const newActiveGroups: Record<string, number> = {};
      groups.forEach((group, groupIndex) => {
        if (group.length > 1 && group[0].role === 'assistant') {
          newActiveGroups[`group-${groupIndex}`] = group.length - 1; // Start with the latest message
        }
      });
      setActiveMessageGroups(newActiveGroups);
    }
  }, [messages]);

  const handleSwitchMessage = (groupIndex: number, direction: 'prev' | 'next') => {
    console.log('Switching message:', { groupIndex, direction });
    console.log('Current messageGroups:', messageGroups);
    
    const group = messageGroups[groupIndex];
    console.log('Selected group:', group);
    
    if (!group || group.length <= 1) {
      console.log('No group or single message, returning');
      return;
    }

    const originalMessage = group[0];
    console.log('Original message:', originalMessage);
    
    // Create a regeneration_id for this group if it doesn't exist
    const regenerationId = originalMessage.regeneration_id || `group-${groupIndex}`;
    console.log('Regeneration ID:', regenerationId);
    
    // Get or create the regenerated group
    let regeneratedGroup = regeneratedGroups[regenerationId];
    if (!regeneratedGroup) {
      regeneratedGroup = {
        originalId: regenerationId,
        messages: group,
        currentIndex: group.length - 1
      };
      setRegeneratedGroups(prev => ({
        ...prev,
        [regenerationId]: regeneratedGroup
      }));
    }
    
    console.log('Regenerated group:', regeneratedGroup);

    const newIndex = direction === 'prev' 
      ? Math.max(0, regeneratedGroup.currentIndex - 1)
      : Math.min(regeneratedGroup.messages.length - 1, regeneratedGroup.currentIndex + 1);
    
    console.log('New index:', newIndex);

    // Update the regenerated group's current index
    setRegeneratedGroups(prev => {
      const updated = {
        ...prev,
        [regenerationId]: {
          ...regeneratedGroup,
          currentIndex: newIndex
        }
      };
      console.log('Updated regenerated groups:', updated);
      return updated;
    });

    // Update the visible message
    setMessages(prev => {
      const updated = prev.map(msg => {
        if (msg.id === originalMessage.id) {
          const newMessage = regeneratedGroup.messages[newIndex];
          console.log('Switching to message:', newMessage);
          return {
            ...msg,
            content: newMessage.content,
            created_at: newMessage.created_at
          };
        }
        return msg;
      });
      console.log('Updated messages:', updated);
      return updated;
    });
  };

  useEffect(() => {
    if (selectedChatId) {
      fetchChatMessages(selectedChatId);
    } else {
      setMessages([]);
      setRegeneratedGroups({});
    }
  }, [selectedChatId]);

  const fetchChatMessages = async (chatId: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch chat messages');
      const data = await response.json();
      
      // Group messages by regeneration_id
      const messageGroups = data.reduce((groups: Record<string, Message[]>, msg: Message) => {
        if (msg.regeneration_id) {
          if (!groups[msg.regeneration_id]) {
            groups[msg.regeneration_id] = [];
          }
          groups[msg.regeneration_id].push(msg);
        } else {
          // Messages without regeneration_id are shown as is
          if (!groups['no_regeneration']) {
            groups['no_regeneration'] = [];
          }
          groups['no_regeneration'].push(msg);
        }
        return groups;
      }, {});

      // For each group, only show the latest message initially
      const visibleMessages = Object.values(messageGroups as Record<string, Message[]>).flatMap((group) => {
        if (group[0]?.regeneration_id) {
          // Sort by created_at to get the latest message
          const sortedGroup = [...group].sort((a: Message, b: Message) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          return [sortedGroup[0]];
        }
        return group;
      });

      // Sort all messages by created_at
      visibleMessages.sort((a: Message, b: Message) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      setMessages(visibleMessages);
      
      // Initialize regenerated groups with all versions of each message
      const initialRegeneratedGroups: Record<string, RegeneratedMessageGroup> = {};
      
      // First, add groups with regeneration_id
      Object.entries(messageGroups as Record<string, Message[]>).forEach(([regId, group]) => {
        if (regId !== 'no_regeneration') {
          // Sort messages by created_at
          const sortedMessages = [...group].sort((a: Message, b: Message) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          
          initialRegeneratedGroups[regId] = {
            originalId: regId,
            messages: sortedMessages,
            currentIndex: sortedMessages.length - 1 // Start with the latest message
          };
        }
      });

      // Then, create groups for consecutive assistant messages without regeneration_id
      const assistantGroups = visibleMessages.reduce((groups: Message[][], message, index) => {
        if (index === 0 || message.role !== 'assistant' || visibleMessages[index - 1].role !== 'assistant') {
          groups.push([message]);
        } else {
          groups[groups.length - 1].push(message);
        }
        return groups;
      }, []);

      // Add groups with multiple assistant messages
      assistantGroups.forEach((group, index) => {
        if (group.length > 1 && group[0].role === 'assistant') {
          const groupId = `group-${index}`;
          initialRegeneratedGroups[groupId] = {
            originalId: groupId,
            messages: group,
            currentIndex: group.length - 1
          };
        }
      });
      
      console.log('Initializing regenerated groups:', initialRegeneratedGroups);
      setRegeneratedGroups(initialRegeneratedGroups);
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
        created_at: new Date().toISOString()
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
        created_at: new Date().toISOString()
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

  const handleRegenerate = async (messageId: string) => {
    if (!selectedChatId) return;

    setIsLoading(true);
    let newMessageId: string;

    // Find the message to regenerate and all messages before it
    const messageIndex = messages.findIndex(msg => msg.id.toString() === messageId);
    if (messageIndex === -1) return;
    
    // Keep only messages before the one being regenerated
    const messagesToKeep = messages.slice(0, messageIndex);
    const lastUserMessage = messagesToKeep.reverse().find(msg => msg.role === 'user');
    
    if (!lastUserMessage) return;

    // Get the original message to regenerate
    const originalMessage = messages[messageIndex];

    try {
      // Create a new message for regeneration
      newMessageId = Date.now().toString();
      const newMessage: Message = {
        id: newMessageId,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString()
      };

      // Add the new message to the messages array
      setMessages(prev => {
        const updated = [...prev];
        updated[messageIndex] = newMessage;
        return updated;
      });

      // Set streaming state
      setStreamingMessageId(newMessageId);

      // Get AI response with streaming
      const aiResponse = await fetch(`${API_BASE_URL}/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
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
                console.log('Streaming content:', accumulatedContent);
                // Update the message content in real-time
                setMessages(prev => prev.map(msg => 
                  msg.id === newMessageId 
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

      // Update the regenerated groups
      setRegeneratedGroups(prev => {
        const existingGroup = prev[messageId] || {
          originalId: messageId,
          messages: [originalMessage],
          currentIndex: 0
        };

        return {
          ...prev,
          [messageId]: {
            ...existingGroup,
            messages: [...existingGroup.messages, { ...newMessage, content: accumulatedContent }],
            currentIndex: existingGroup.messages.length
          }
        };
      });

      // Update the message in the database
      const assistantResponse = await fetch(
        `${API_BASE_URL}/chats/${selectedChatId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: parseInt(newMessageId),
            role: "assistant",
            content: accumulatedContent
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
      // Restore the original message if there was an error
      setMessages(prev => prev.map(msg => 
        msg.id === newMessageId 
          ? originalMessage
          : msg
      ));
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
              activeMessageGroups={activeMessageGroups}
              onSwitchMessage={handleSwitchMessage}
              messageGroups={messageGroups}
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
import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Avatar,
  Paper,
  Divider,
  Chip,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { Chat } from '@/types/chat';
import { useUser, useAuth, SignedIn, SignedOut, useClerk } from '@clerk/nextjs';
import chatCache from '@/lib/chatCache';
import { DEFAULT_MODEL } from '@/lib/constants';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const DEFAULT_USER_ID = 1;

interface User {
  id: number;
  name: string;
  email: string;
}

interface ChatListProps {
  onSelectChat: (chatId: number | null) => void;
  selectedChatId: number | null;
  shouldRefresh?: boolean;
  onRefresh?: () => void;
}

const FIXED_WELCOME_DATE = '2024-01-01T00:00:00.000Z';

const createWelcomeChat = (): import('@/types/chat').Chat => ({
  id: -1,
  title: 'Welcome',
  created_at: FIXED_WELCOME_DATE,
  message_count: WELCOME_MESSAGES.length,
  last_message: WELCOME_MESSAGES[WELCOME_MESSAGES.length - 1].content,
  last_message_at: FIXED_WELCOME_DATE,
});

const WELCOME_MESSAGES: import('@/types/chat').Message[] = [
  {
    id: 'welcome_1',
    role: 'assistant',
    content: '👋 Welcome to TeaTree Chat!\n\nTo get started, you can chat as a guest and try out the app with up to 8 messages per day. Your chats are stored locally and will be saved to your account if you sign up.',
    createdAt: new Date(FIXED_WELCOME_DATE),
  },
  {
    id: 'welcome_2',
    role: 'user',
    content: 'What happens if I create an account?',
    createdAt: new Date(FIXED_WELCOME_DATE),
  },
  {
    id: 'welcome_3',
    role: 'assistant',
    content: 'Great question! When you create an account, your chats and history will be saved securely to your account, and you can chat without daily limits. You can also add your own API key for more models and higher usage.',
    createdAt: new Date(FIXED_WELCOME_DATE),
  },
  {
    id: 'welcome_4',
    role: 'user',
    content: 'Can I migrate my guest chats if I sign up later?',
    createdAt: new Date(FIXED_WELCOME_DATE),
  },
  {
    id: 'welcome_5',
    role: 'assistant',
    content: 'Yes! When you sign up or log in, your guest chats will be automatically imported into your new account so you never lose your conversation history.',
    createdAt: new Date(FIXED_WELCOME_DATE),
  },
];

export default function ChatList({ onSelectChat, selectedChatId, shouldRefresh = false, onRefresh }: ChatListProps) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { openSignIn, openSignUp } = useClerk();
  const [chats, setChats] = useState<Chat[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Debug: Log when chats state changes to detect duplicates
  useEffect(() => {
    const duplicateIds = chats
      .map(chat => chat.id)
      .filter((id, index, array) => array.indexOf(id) !== index);
    
    if (duplicateIds.length > 0) {
      console.warn('Duplicate chat IDs detected:', duplicateIds);
      console.warn('Full chats array:', chats);
    }
  }, [chats]);
  const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [isRenameChatDialogOpen, setIsRenameChatDialogOpen] = useState(false);
  const [renameChatId, setRenameChatId] = useState<number | null>(null);
  const [renameChatTitle, setRenameChatTitle] = useState('');
  const hasKey = !!(typeof window !== 'undefined' && localStorage.getItem('apiKey'));

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  useEffect(() => {
    if (chats.length > 0 && !selectedChatId) {
      // Add a small delay to prevent jarring transitions
      const timer = setTimeout(() => {
        onSelectChat(chats[0].id);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [chats, selectedChatId, onSelectChat]);

  // Handle refresh requests from parent component
  useEffect(() => {
    if (shouldRefresh && onRefresh) {
      console.log('Refreshing chat list due to shouldRefresh=true');
      // Clear cached chat list to force fresh API fetch
      chatCache.clearCache();
      fetchChats().then(() => {
        onRefresh();
      });
    }
  }, [shouldRefresh, onRefresh]);

  // On mount: if no user (guest) and no cached chats, create welcome chat
  useEffect(() => {
    if (!user) {
      const cached = chatCache.getCachedChats();
      if (cached.length === 0) {
        console.log('[ChatList] Creating local welcome chat for guest');
        const welcomeChat = createWelcomeChat();
        chatCache.addNewChat(welcomeChat);
        chatCache.cacheMessages(welcomeChat.id, WELCOME_MESSAGES as any);
        setChats([welcomeChat]);
        onSelectChat(welcomeChat.id);
      } else {
        setChats(cached);
      }
    }
  }, [user]);

  // When user logs in, migrate local guest chats to backend
  useEffect(() => {
    const migrateGuestChats = async () => {
      if (!user) return;
      const token = await getToken();
      if (!token) return;

      const cachedChats = chatCache.getCachedChats();
      const guestChats = cachedChats.filter(c => c.id < 0);
      if (guestChats.length === 0) return;

      console.log(`[ChatList] Migrating ${guestChats.length} guest chat(s) to backend`);

      for (const guestChat of guestChats) {
        try {
          // Create chat in backend
          const createResp = await fetch(`${API_BASE_URL}/chats/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: guestChat.title,
              user_id: user.id,
              model: DEFAULT_MODEL,
            }),
          });
          if (!createResp.ok) throw new Error('Failed to create chat');
          const newChat = await createResp.json();

          // Migrate messages
          const cached = chatCache.getCachedChatWithMessages(guestChat.id);
          if (cached?.messages) {
            for (const msg of cached.messages) {
              await fetch(`${API_BASE_URL}/chats/${newChat.id}/messages`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  role: msg.role,
                  content: msg.content,
                  model: DEFAULT_MODEL,
                }),
              });
            }
          }

          // Replace local chat id with backend id in cache
          chatCache.removeChat(guestChat.id);
          chatCache.addNewChat({ ...newChat });
          if (cached?.messages) chatCache.cacheMessages(newChat.id, cached.messages);
        } catch (err) {
          console.error('Error migrating guest chat', err);
        }
      }

      // Refresh chats from API after migration
      fetchChats();
    };

    migrateGuestChats();
  }, [user]);

  // Helper function to deduplicate chats by ID
  const deduplicateChats = (chats: Chat[]): Chat[] => {
    const seen = new Set<number>();
    return chats.filter(chat => {
      if (seen.has(chat.id)) {
        console.warn(`Duplicate chat found with ID: ${chat.id}`);
        return false;
      }
      seen.add(chat.id);
      return true;
    });
  };

  const fetchChats = async () => {
    if (!user) return;
    
    const token = await getToken();
    
    // First, load from cache for instant display
    const cachedChats = chatCache.getCachedChats();
    if (cachedChats.length > 0) {
      console.log('Loading chats from cache');
      const deduplicatedCachedChats = deduplicateChats(cachedChats);
      deduplicatedCachedChats.sort((a: Chat, b: Chat) => {
        const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : new Date(a.created_at).getTime();
        const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : new Date(b.created_at).getTime();
        return dateB - dateA;
      });
      setChats(deduplicatedCachedChats);
      if (error) setError(null);
    }
    
    // Check if we should refresh from API
    if (chatCache.hasCachedData()) {
      console.log('Using cached chat data, skipping API call');
      return;
    }
    
    try {
      console.log('Fetching fresh chat data from API');
      const response = await fetch(`${API_BASE_URL}/chats?user_id=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch chats');
      const data = await response.json();
      
      // Debug: log raw response data
      console.log('[ChatList] /chats API response:', data);
      
      // Deduplicate and sort the data by last_message_at (fallback to created_at)
      const deduplicatedData = deduplicateChats(data);
      deduplicatedData.sort((a: Chat, b: Chat) => {
        const dateA_str = a.last_message_at || a.created_at;
        const dateB_str = b.last_message_at || b.created_at;
        const dateA = new Date(dateA_str).getTime();
        const dateB = new Date(dateB_str).getTime();
        if(isNaN(dateA) || isNaN(dateB)) {
            console.warn('[ChatList] Invalid date detected during sort:', { a: a.id, dateA_str }, { b: b.id, dateB_str });
        }
        return dateB - dateA;
      });
      console.log('[ChatList] Sorted chats (should be most recent first):', deduplicatedData.map(c => ({id: c.id, title: c.title, last_message_at: c.last_message_at})));
      
      // Update cache with fresh data
      chatCache.updateChats(deduplicatedData);
      setChats(deduplicatedData);
      if (error) setError(null);
    } catch (err) {
      setError('Failed to load chats. Please try again later.');
      console.error(err);
      // If API fails but we have cached data, keep using it
      if (cachedChats.length > 0) {
        console.log('API failed, keeping cached chat data');
        setError(null);
      }
    }
  };

  const handleCreateChat = async () => {
    if (!newChatTitle.trim() || !user) return;
    
    const token = await getToken();
    if (!token) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/chats/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title: newChatTitle,
          user_id: user.id,
          model: DEFAULT_MODEL
        }),
      });
      if (!response.ok) throw new Error('Failed to create chat');
      const newChat = await response.json();
      setChats(prev => {
        // Check if chat already exists to prevent duplicates
        const exists = prev.some(chat => chat.id === newChat.id);
        if (exists) {
          console.warn(`Chat with ID ${newChat.id} already exists, not adding duplicate`);
          return prev;
        }
        return [newChat, ...prev];
      });
      chatCache.addNewChat(newChat); // Update cache
      setIsNewChatDialogOpen(false);
      setNewChatTitle('');
      onSelectChat(newChat.id);
    } catch (error) {
      console.error('Error creating chat:', error);
      setError(error instanceof Error ? error.message : 'Failed to create chat');
    }
  };

  const handleDeleteChat = async (chatId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const token = await getToken();
    if (!token) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete chat');
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      chatCache.removeChat(chatId); // Update cache
      if (selectedChatId === chatId) {
        onSelectChat(null);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete chat');
    }
  };

  const handleRenameChat = async (chatId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setRenameChatId(chatId);
      setRenameChatTitle(chat.title || '');
      setIsRenameChatDialogOpen(true);
    }
  };

  const handleConfirmRename = async () => {
    if (!renameChatTitle.trim() || !renameChatId) return;
    
    const token = await getToken();
    if (!token) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${renameChatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: renameChatTitle }),
      });
      if (!response.ok) throw new Error('Failed to rename chat');
      const updatedChat = await response.json();
      setChats(prev => prev.map(chat => 
        chat.id === renameChatId ? { ...chat, title: updatedChat.title } : chat
      ));
      chatCache.updateChatTitle(renameChatId, updatedChat.title); // Update cache
      setIsRenameChatDialogOpen(false);
      setRenameChatId(null);
      setRenameChatTitle('');
    } catch (error) {
      console.error('Error renaming chat:', error);
      setError(error instanceof Error ? error.message : 'Failed to rename chat');
    }
  };

  const handleChatSelect = (chatId: number) => {
    onSelectChat(chatId);
  };

  return (
    <Box sx={{
      width: '100%',
      bgcolor: '#4E342E',
      borderRight: 1,
      borderColor: '#333',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      color: '#fff',
      boxShadow: '4px 0 16px 0 rgba(0,0,0,0.10)',
      overflow: 'hidden',
      position: 'relative',
      '::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        background: 'transparent',
        pointerEvents: 'none',
      },
    }}>
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: 1,
        borderColor: '#333'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Typography variant="h6" sx={{ color: '#D6BFA3', fontWeight: 600 }}>Chats</Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsNewChatDialogOpen(true)}
          size="small"
          sx={{
            bgcolor: '#5B6F56',
            color: '#D6BFA3',
            '&:hover': {
              bgcolor: '#466146',
            },
          }}
        >
          New Chat
        </Button>
      </Box>

      {error && (
        <Typography 
          color="error" 
          sx={{ 
            margin: '16px',
            bgcolor: 'rgba(239, 68, 68, 0.1)',
            p: 1,
            borderRadius: 1,
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}
        >
          {error}
        </Typography>
      )}

      <List sx={{ 
        overflow: 'auto', 
        flex: 1,
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#4E342E',
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#D6BFA3',
          borderRadius: '3px',
          '&:hover': {
            background: '#bfae8c',
          },
        },
        scrollbarWidth: 'thin',
        scrollbarColor: '#D6BFA3 #4E342E',
        '& .MuiListItem-root': {
          px: 1
        }
      }}>
        <AnimatePresence>
          {chats.map((chat) => (
            <motion.div
              key={chat.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <ListItem
                disablePadding
                sx={{
                  mb: 0.5,
                  '&:hover .action-buttons': {
                    opacity: 1,
                  },
                }}
                secondaryAction={
                  <Box className="action-buttons" sx={{ 
                    display: 'flex', 
                    opacity: 0, 
                    transition: 'opacity 0.2s',
                    gap: 0.5
                  }}>
                    <IconButton
                      size="small"
                      aria-label="rename"
                      onClick={(e) => handleRenameChat(chat.id, e)}
                      sx={{
                        color: selectedChatId === chat.id ? '#4E342E' : '#D6BFA3',
                        '&:hover': {
                          bgcolor: selectedChatId === chat.id ? 'rgba(78, 52, 46, 0.1)' : 'rgba(214, 191, 163, 0.1)'
                        }
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  <IconButton
                      size="small"
                    aria-label="delete"
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    sx={{
                      color: '#ef4444',
                      '&:hover': {
                        bgcolor: 'rgba(239, 68, 68, 0.1)'
                      }
                    }}
                  >
                      <DeleteIcon fontSize="small" />
                  </IconButton>
                  </Box>
                }
              >
                <ListItemButton
                  selected={selectedChatId === chat.id}
                  onClick={() => handleChatSelect(chat.id)}
                  sx={{
                    borderRadius: 2,
                    bgcolor: selectedChatId === chat.id ? '#D6BFA3' : 'transparent',
                    color: selectedChatId === chat.id ? '#5B6F56' : '#D6BFA3',
                    fontWeight: 700,
                    fontSize: '1.08rem',
                    transition: 'background 0.2s, color 0.2s, box-shadow 0.2s, transform 0.2s',
                    boxShadow: selectedChatId === chat.id ? '0 2px 8px 0 rgba(91,111,86,0.10)' : 'none',
                    transform: selectedChatId === chat.id ? 'scale(1.04)' : 'scale(1)',
                    '&.Mui-selected': {
                      bgcolor: '#D6BFA3',
                      color: '#5B6F56',
                      '&:hover': {
                        bgcolor: '#bfae8c',
                        color: '#5B6F56',
                        boxShadow: '0 4px 16px 0 rgba(91,111,86,0.13)',
                        transform: 'scale(1.06)',
                      },
                    },
                    '&:hover': {
                      bgcolor: 'rgba(91,111,86,0.1)',
                      color: '#5B6F56',
                      boxShadow: '0 4px 16px 0 rgba(91,111,86,0.13)',
                      transform: 'scale(1.03)',
                    },
                    my: 0.5,
                    mx: 0.5,
                    py: 1.2,
                    px: 2,
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography
                        variant="body1"
                        sx={{
                          color: selectedChatId === chat.id ? '#5B6F56' : '#D6BFA3',
                          fontWeight: 500,
                          fontSize: '0.95rem',
                          transition: 'color 0.2s',
                          '.MuiListItemButton-root:hover &': {
                            color: '#5B6F56',
                          },
                        }}
                      >
                        {chat.title || 'New Chat'}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            </motion.div>
          ))}
        </AnimatePresence>
      </List>

      <Paper
        elevation={1}
        sx={{
          p: 1.2,
          border: '1.5px solid #D6BFA3',
          borderTop: 1,
          borderColor: '#D6BFA3',
          mt: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
          bgcolor: '#4E342E',
          borderRadius: 3,
          boxShadow: '0 1px 4px 0 rgba(91,111,86,0.10)',
          zIndex: 1,
          position: 'relative',
          minWidth: 0,
          maxWidth: '100%',
        }}
      >
        <SignedIn>
          <Avatar
            sx={{
              bgcolor: '#D6BFA3',
              color: '#4E342E',
              width: 32,
              height: 32,
              fontSize: '1rem',
              border: '1.5px solid #D6BFA3',
              boxShadow: '0 1px 2px 0 rgba(91,111,86,0.10)',
              mb: 0.6,
            }}
          >
            {user && user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
          </Avatar>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: '#5B6F56',
              fontSize: '0.95rem',
              mb: 0.2,
            }}
          >
            {user && user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
              color: '#D6BFA3',
              fontSize: '0.83rem',
              mb: 0.2,
            }}
          >
            {user && user.primaryEmailAddress ? user.primaryEmailAddress.emailAddress : ''}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.2 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              bgcolor: '#D6BFA3',
              px: 1.5,
              py: 0.5,
              borderRadius: 1.5,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: (hasKey ? '#5B6F56' : '#ef4444'), mr: 0.7 }} />
              <Typography variant="caption" sx={{ color: '#4E342E', fontWeight: 600, fontSize: '0.75rem' }}>
              {hasKey ? 'API Key Set' : 'No API Key'}
            </Typography>
            </Box>
          </Box>
        </SignedIn>
        <SignedOut>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, width: '100%' }}>
            <Button variant="contained" fullWidth sx={{ bgcolor: '#5B6F56', color: '#D6BFA3', textTransform: 'none', fontWeight: 700 }} onClick={() => openSignIn()}>
              Sign In
            </Button>
            <Button variant="outlined" fullWidth sx={{ borderColor: '#D6BFA3', color: '#D6BFA3', textTransform: 'none', fontWeight: 700 }} onClick={() => openSignUp()}>
              Sign Up
            </Button>
          </Box>
        </SignedOut>
      </Paper>

      <Dialog 
        open={isNewChatDialogOpen} 
        onClose={() => setIsNewChatDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#4E342E',
            color: '#D6BFA3',
            borderRadius: 3,
            boxShadow: '0 4px 16px 0 rgba(91,111,86,0.25)'
          }
        }}
      >
        <DialogTitle sx={{ color: '#D6BFA3', fontWeight: 700 }}>Create New Chat</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Chat Title"
            fullWidth
            variant="outlined"
            value={newChatTitle}
            onChange={(e) => setNewChatTitle(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                background: '#4E342E',
                color: '#fff',
                '& fieldset': {
                  borderColor: '#333',
                },
                '&:hover fieldset': {
                  borderColor: '#D6BFA3',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#D6BFA3',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#D6BFA3',
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#D6BFA3',
              },
            }}
          />
          <Typography variant="body2" sx={{ color: '#9ca3af', mt: 2, fontStyle: 'italic' }}>
            New chats will automatically use the free Llama 3.3 70B model
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setIsNewChatDialogOpen(false)}
            sx={{ color: '#9ca3af' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateChat} 
            variant="contained"
            sx={{
              bgcolor: '#5B6F56',
              color: '#D6BFA3',
              fontWeight: 700,
              '&:hover': {
                bgcolor: '#466146'
              }
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Chat Dialog */}
      <Dialog 
        open={isRenameChatDialogOpen} 
        onClose={() => setIsRenameChatDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#4E342E',
            color: '#D6BFA3',
            borderRadius: 3,
            boxShadow: '0 4px 16px 0 rgba(91,111,86,0.25)'
          }
        }}
      >
        <DialogTitle sx={{ color: '#D6BFA3', fontWeight: 700 }}>Rename Chat</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Chat Title"
            fullWidth
            variant="outlined"
            value={renameChatTitle}
            onChange={(e) => setRenameChatTitle(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                background: '#4E342E',
                color: '#fff',
                '& fieldset': {
                  borderColor: '#333',
                },
                '&:hover fieldset': {
                  borderColor: '#D6BFA3',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#D6BFA3',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#D6BFA3',
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#D6BFA3',
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setIsRenameChatDialogOpen(false)}
            sx={{ color: '#9ca3af' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmRename} 
            variant="contained"
            sx={{
              bgcolor: '#5B6F56',
              color: '#D6BFA3',
              fontWeight: 700,
              '&:hover': {
                bgcolor: '#466146'
              }
            }}
          >
            Rename
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 
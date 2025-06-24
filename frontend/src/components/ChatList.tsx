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
import { Chat } from '@/types/chat';
import { useAuth } from '@/app/AuthProvider';
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

export default function ChatList({ onSelectChat, selectedChatId, shouldRefresh = false, onRefresh }: ChatListProps) {
  const { user, token, refreshUser, apiKey } = useAuth();
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
  const [isLoading, setIsLoading] = useState(false);
  const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [isRenameChatDialogOpen, setIsRenameChatDialogOpen] = useState(false);
  const [renameChatId, setRenameChatId] = useState<number | null>(null);
  const [renameChatTitle, setRenameChatTitle] = useState('');
  const hasKey = !!(user?.has_api_key || apiKey || (typeof window !== 'undefined' && localStorage.getItem('apiKey')));

  useEffect(() => {
    if (user && token) {
      fetchChats();
    }
  }, [user, token]);

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
    if (!user || !token) return;
    
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
      setIsLoading(true);
      console.log('Fetching fresh chat data from API');
      const response = await fetch(`${API_BASE_URL}/chats?user_id=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch chats');
      const data = await response.json();
      
      // Deduplicate and sort the data by last_message_at (fallback to created_at)
      const deduplicatedData = deduplicateChats(data);
      deduplicatedData.sort((a: Chat, b: Chat) => {
        const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : new Date(a.created_at).getTime();
        const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : new Date(b.created_at).getTime();
        return dateB - dateA;
      });
      
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateChat = async () => {
    if (!newChatTitle.trim() || !user || !token) return;
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
    if (!renameChatTitle.trim() || !renameChatId || !token) return;
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
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} sx={{ color: '#D6BFA3' }} />
          </Box>
        ) : chats.map((chat, index) => (
          <ListItem
            key={`${chat.id}-${index}`}
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
        ))}
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
          mb: 1.5,
          zIndex: 1,
          position: 'relative',
          minWidth: 0,
          maxWidth: '100%',
        }}
      >
        <Avatar
          sx={{
            bgcolor: '#D6BFA3',
            color: '#4E342E',
            width: 32,
            height: 32,
            fontSize: '1rem',
            border: '1.5px solid #D6BFA3',
            boxShadow: '0 1px 2px 0 rgba(91,111,86,0.10)',
            mb: 0.2,
          }}
        >
          {user && user.name ? user.name.charAt(0).toUpperCase() : 'U'}
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
            mb: 0.1,
          }}
        >
          {user && user.name ? user.name : user && user.id ? `User ${user.id}` : 'User'}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
            color: '#D6BFA3',
            fontSize: '0.85rem',
            mb: 0.1,
          }}
        >
          {user && user.email ? user.email : 'No email available'}
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
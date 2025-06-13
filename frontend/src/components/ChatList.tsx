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
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Chat } from '../types/chat';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const MAX_CACHED_CHATS = 10;
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
  const [chats, setChats] = useState<Chat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [user, setUser] = useState<User>({ id: DEFAULT_USER_ID, name: 'Loading...', email: 'Loading...' });

  useEffect(() => {
    fetchChats();
    fetchUserData();
  }, []);

  useEffect(() => {
    if (shouldRefresh) {
      fetchChats();
      onRefresh?.();
    }
  }, [shouldRefresh, onRefresh]);

  // Effect to select the most recent chat when chats are loaded
  useEffect(() => {
    if (chats.length > 0 && !selectedChatId) {
      onSelectChat(chats[0].id);
    }
  }, [chats, selectedChatId, onSelectChat]);

  const fetchUserData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${DEFAULT_USER_ID}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUser({ id: DEFAULT_USER_ID, name: 'Error loading user', email: 'Error loading email' });
    }
  };

  const fetchChats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chats?user_id=${DEFAULT_USER_ID}`);
      if (!response.ok) throw new Error('Failed to fetch chats');
      const data = await response.json();

      // Sort chats by creation date (newest first)
      data.sort((a: Chat, b: Chat) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setChats(data);
      if (error) setError(null);
    } catch (err) {
      setError('Failed to load chats. Please try again later.');
      console.error(err);
    }
  };

  const handleCreateChat = async () => {
    if (!newChatTitle.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/chats/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: newChatTitle,
          user_id: DEFAULT_USER_ID
        }),
      });

      if (!response.ok) throw new Error('Failed to create chat');
      
      const newChat = await response.json();
      setChats(prev => [...prev, newChat]);
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

    try {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete chat');

      setChats(prev => prev.filter(chat => chat.id !== chatId));
      if (selectedChatId === chatId) {
        onSelectChat(null);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete chat');
    }
  };

  return (
    <Box sx={{ 
      width: '100%', 
      bgcolor: '#1a1a1a',
      borderRight: 1, 
      borderColor: '#333',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      color: '#fff'
    }}>
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: 1,
        borderColor: '#333'
      }}>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>Chats</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsNewChatDialogOpen(true)}
          size="small"
          sx={{
            bgcolor: '#6366f1',
            '&:hover': {
              bgcolor: '#4f46e5'
            }
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
        '& .MuiListItem-root': {
          px: 1
        }
      }}>
        {chats.map((chat) => (
          <ListItem
            key={chat.id}
            disablePadding
            sx={{
              mb: 0.5,
              '&:hover .delete-button': {
                opacity: 1,
              },
            }}
            secondaryAction={
              <IconButton
                edge="end"
                aria-label="delete"
                onClick={(e) => handleDeleteChat(chat.id, e)}
                className="delete-button"
                sx={{
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  color: '#ef4444',
                  '&:hover': {
                    bgcolor: 'rgba(239, 68, 68, 0.1)'
                  }
                }}
              >
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemButton
              selected={selectedChatId === chat.id}
              onClick={() => onSelectChat(chat.id)}
              sx={{
                borderRadius: 1,
                '&.Mui-selected': {
                  bgcolor: '#6366f1',
                  '&:hover': {
                    bgcolor: '#4f46e5'
                  }
                },
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.05)'
                }
              }}
            >
              <ListItemText
                primary={
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: selectedChatId === chat.id ? '#fff' : '#e5e7eb',
                      fontWeight: 500,
                      fontSize: '0.95rem'
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
        elevation={0}
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: '#333',
          mt: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          bgcolor: '#1a1a1a'
        }}
      >
        <Avatar 
          sx={{ 
            bgcolor: '#6366f1',
            width: 40,
            height: 40,
            fontSize: '1.2rem'
          }}
        >
          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: '#fff'
            }}
          >
            {user.name || `User ${user.id}`}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
              color: '#9ca3af'
            }}
          >
            {user.email || 'No email available'}
          </Typography>
        </Box>
      </Paper>

      <Dialog 
        open={isNewChatDialogOpen} 
        onClose={() => setIsNewChatDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            color: '#fff'
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff' }}>Create New Chat</DialogTitle>
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
                color: '#fff',
                '& fieldset': {
                  borderColor: '#333',
                },
                '&:hover fieldset': {
                  borderColor: '#6366f1',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#6366f1',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#9ca3af',
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#6366f1',
              },
            }}
          />
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
              bgcolor: '#6366f1',
              '&:hover': {
                bgcolor: '#4f46e5'
              }
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 
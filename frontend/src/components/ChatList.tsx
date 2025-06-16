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
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Chat } from '../types/chat';
import { useAuth } from '../app/AuthProvider';

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
  const { user, token, refreshUser, apiKey } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [hasKey, setHasKey] = useState<boolean>(false);

  useEffect(() => {
    setHasKey(!!(apiKey || (typeof window !== 'undefined' && localStorage.getItem('apiKey'))));
  }, [apiKey]);

  useEffect(() => {
    if (user && token) {
      fetchChats();
    }
  }, [user, token]);

  useEffect(() => {
    if (chats.length > 0 && !selectedChatId) {
      onSelectChat(chats[0].id);
    }
  }, [chats, selectedChatId, onSelectChat]);

  const fetchChats = async () => {
    if (!user || !token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/chats?user_id=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch chats');
      const data = await response.json();
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
          user_id: user.id
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
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
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
      bgcolor: '#4E342E',
      borderRight: 1,
      borderColor: '#333',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      color: '#fff',
      boxShadow: '4px 0 16px 0 rgba(0,0,0,0.10)',
      borderTopRightRadius: 16,
      borderBottomRightRadius: 16,
      overflow: 'hidden',
      position: 'relative',
      '::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        background: 'linear-gradient(135deg, rgba(214,191,163,0.08) 0%, rgba(91,111,86,0.12) 100%)',
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
        <Typography variant="h6" sx={{ color: '#D6BFA3', fontWeight: 600 }}>Chats</Typography>
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
                  bgcolor: '#D6BFA3',
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

      <Divider sx={{ my: 3, bgcolor: '#D6BFA3', opacity: 0.5, borderRadius: 2 }} />
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
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: (hasKey ? '#5B6F56' : '#ef4444'), mr: 0.7 }} />
          <Typography variant="caption" sx={{ color: hasKey ? '#5B6F56' : '#ef4444', fontWeight: 600, fontSize: '0.82rem' }}>
            {hasKey ? 'API Key Set' : 'No API Key'}
          </Typography>
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
    </Box>
  );
} 
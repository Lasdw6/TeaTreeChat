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
      width: 300, 
      bgcolor: 'background.paper', 
      borderRight: 1, 
      borderColor: 'divider',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh'
    }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Chats</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsNewChatDialogOpen(true)}
          size="small"
        >
          New Chat
        </Button>
      </Box>

      {error && (
        <Typography color="error" style={{ margin: '16px' }}>
          {error}
        </Typography>
      )}

      <List sx={{ overflow: 'auto', flex: 1 }}>
        {chats.map((chat) => (
          <ListItem
            key={chat.id}
            disablePadding
            sx={{
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
                }}
              >
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemButton
              selected={selectedChatId === chat.id}
              onClick={() => onSelectChat(chat.id)}
            >
              <ListItemText
                primary={chat.title}
                secondary={
                  <>
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {chat.last_message || 'No messages yet'}
                    </Typography>
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                    >
                      {new Date(chat.created_at).toLocaleDateString()}
                    </Typography>
                  </>
                }
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* User Profile Box */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          mt: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Avatar 
          sx={{ 
            bgcolor: 'primary.main',
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
              whiteSpace: 'nowrap'
            }}
          >
            {user.name || `User ${user.id}`}
          </Typography>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block'
            }}
          >
            {user.email || 'No email available'}
          </Typography>
        </Box>
      </Paper>

      <Dialog open={isNewChatDialogOpen} onClose={() => setIsNewChatDialogOpen(false)}>
        <DialogTitle>Create New Chat</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Chat Title"
            fullWidth
            variant="outlined"
            value={newChatTitle}
            onChange={(e) => setNewChatTitle(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsNewChatDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateChat} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 
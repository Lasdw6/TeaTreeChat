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
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { Chat } from '@/types/chat';
import { useAuth } from '@/app/AuthProvider';
import ModelSelector from './ModelSelector';

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
  const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [newChatModel, setNewChatModel] = useState('meta-llama/llama-3.3-70b-instruct:free');
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
      onSelectChat(chats[0].id);
    }
  }, [chats, selectedChatId, onSelectChat]);

  // Handle refresh requests from parent component
  useEffect(() => {
    if (shouldRefresh && onRefresh) {
      console.log('Refreshing chat list due to shouldRefresh=true');
      fetchChats().then(() => {
        onRefresh();
      });
    }
  }, [shouldRefresh, onRefresh]);

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
          user_id: user.id,
          model: newChatModel
        }),
      });
      if (!response.ok) throw new Error('Failed to create chat');
      const newChat = await response.json();
      setChats(prev => [newChat, ...prev]);
      setIsNewChatDialogOpen(false);
      setNewChatTitle('');
      setNewChatModel('meta-llama/llama-3.3-70b-instruct:free');
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
        {chats.map((chat) => (
          <ListItem
            key={chat.id}
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
          <ModelSelector
            selectedModel={newChatModel}
            onModelChange={(model) => setNewChatModel(model)}
            forceUpward={true}
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
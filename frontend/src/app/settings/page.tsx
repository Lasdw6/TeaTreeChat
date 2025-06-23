"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/app/AuthProvider";
import { Box, Paper, Typography, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, Divider, Alert, Snackbar } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TeaTreeLogo from '@/components/TeaTreeLogo';

export default function SettingsPage() {
  const { apiKey, setApiKey, deleteAccount, logout, user, refreshUser } = useAuth();
  const [keyInput, setKeyInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const theme = useTheme();
  const router = useRouter();

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Show "..." if user has API key set, otherwise empty
    setKeyInput(user?.has_api_key ? "••••••••••••••••••••••••••••••••" : "");
  }, [user]);

  const handleSaveKey = async () => {
    // Don't save if the input is just the placeholder dots
    if (keyInput.trim() === "••••••••••••••••••••••••••••••••" || keyInput.trim() === "") {
      return;
    }

    setSaving(true);
    try {
      await setApiKey(keyInput.trim());
      await refreshUser();
      setSnackbarOpen(true);
      // Reset to placeholder if user has a key
      if (user?.has_api_key) {
        setKeyInput("••••••••••••••••••••••••••••••••");
      }
    } catch (error) {
      console.error('Error saving API key:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    console.log('handleDelete called');
    setDeleting(true);
    await deleteAccount();
    setDeleting(false);
    setDialogOpen(false);
    router.push('/chat');
  };

  const handleLogout = () => {
    logout();
    router.push('/chat');
  };

  // Calculate hasKey in a hydration-safe way
  const hasKey = !!(user?.has_api_key || apiKey || (isClient && localStorage.getItem('apiKey')));

  const handleSnackbarClose = (_?: any, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#5B6F56', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 2 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        variant="outlined"
        sx={{ mb: 3, borderColor: '#D6BFA3', color: '#D6BFA3', fontWeight: 600, borderRadius: 2, minWidth: 0, px: 2, py: 0.5, alignSelf: 'center', '&:hover': { bgcolor: 'rgba(214,191,163,0.08)', borderColor: '#D6BFA3' } }}
        onClick={() => router.push('/chat')}
      >
        Back
      </Button>
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 5 }, bgcolor: '#4E342E', color: '#fff', minWidth: 320, borderRadius: 4, maxWidth: 500, width: '100%', boxShadow: 'none', position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <TeaTreeLogo size={56} />
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#D6BFA3', flexGrow: 1, letterSpacing: 1, ml: 2 }}>Settings</Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            ml: 2,
            bgcolor: '#D6BFA3',
            px: 2,
            py: 1,
            borderRadius: 2,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: hasKey ? '#5B6F56' : '#ef4444', mr: 1 }} />
            <Typography variant="subtitle2" sx={{ color: '#4E342E', fontWeight: 700, fontSize: '0.9rem' }}>
              {hasKey ? 'API Key Set' : 'No API Key'}
            </Typography>
          </Box>
        </Box>
        <Typography variant="h6" sx={{ mb: 1, color: '#D6BFA3', fontWeight: 600 }}>OpenRouter API Key</Typography>
        <Typography variant="body2" sx={{ mb: 2, color: '#fff', opacity: 0.8 }}>
          Don't have an API key? {' '}
          <a 
            href="https://openrouter.ai/keys" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              color: '#D6BFA3', 
              textDecoration: 'underline',
              fontWeight: 600
            }}
          >
            Create for free here
          </a>
        </Typography>
        <TextField
          label="OpenRouter API Key"
          type="password"
          value={keyInput}
          onChange={e => setKeyInput(e.target.value)}
          fullWidth
          margin="normal"
          placeholder={user?.has_api_key ? "API key is set" : "sk-or-..."}
          InputLabelProps={{ style: { color: theme.palette.text.secondary } }}
          InputProps={{ style: { color: theme.palette.primary.contrastText, background: 'rgba(255,255,255,0.06)', borderRadius: 2 } }}
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          sx={{ fontWeight: 700, bgcolor: '#D6BFA3', color: '#4E342E', borderRadius: 2, boxShadow: '0 2px 8px 0 rgba(91,111,86,0.10)', '&:hover': { bgcolor: '#bfae8c' }, mb: 3 }}
          onClick={handleSaveKey}
          disabled={saving || keyInput.trim() === "••••••••••••••••••••••••••••••••" || keyInput.trim() === ""}
          fullWidth
        >
          {saving ? 'Saving...' : 'Save Key'}
        </Button>
        
        {/* Success Snackbar */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity="success"
            variant="filled"
            sx={{ 
              bgcolor: '#5B6F56', 
              color: '#D6BFA3', 
              fontWeight: 600, 
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              border: '2px solid #4E342E' ,
            }}
            icon={<CheckCircleIcon />}
          >
            API key saved successfully!
          </Alert>
        </Snackbar>

        <Divider sx={{ my: 4, bgcolor: '#D6BFA3', opacity: 0.18, borderRadius: 2 }} />
        <Typography variant="h6" sx={{ mb: 2, color: '#ef4444', fontWeight: 700 }}>Danger Zone</Typography>
        <Button
          variant="outlined"
          color="error"
          sx={{ fontWeight: 700, mb: 2, borderRadius: 2, borderColor: '#ef4444', color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.08)', borderColor: '#ef4444' } }}
          onClick={handleLogout}
          disabled={!user}
          fullWidth
        >
          Logout
        </Button>
        <Button
          variant="outlined"
          color="error"
          sx={{ fontWeight: 700, borderRadius: 2, borderColor: '#ef4444', color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.08)', borderColor: '#ef4444' } }}
          onClick={() => setDialogOpen(true)}
          disabled={!user}
          fullWidth
        >
          Delete Account
        </Button>
        <Dialog 
          open={dialogOpen} 
          onClose={() => setDialogOpen(false)}
          PaperProps={{
            style: {
              backgroundColor: '#D6BFA3',
              color: '#4E342E',
              borderRadius: '16px'
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 'bold' }}>Delete Account</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete your account? This action cannot be undone.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={deleting} sx={{ color: '#4E342E' }}>Cancel</Button>
            <Button onClick={handleDelete} color="error" disabled={deleting} sx={{ color: '#ef4444' }}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
} 
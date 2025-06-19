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
  const [showSuccess, setShowSuccess] = useState(false);
  const theme = useTheme();
  const router = useRouter();

  useEffect(() => {
    // Show "..." if user has API key set, otherwise empty
    setKeyInput(user?.has_api_key ? "••••••••••••••••••••••••••••••••" : "");
  }, [user]);

  const handleSaveKey = async () => {
    setSaving(true);
    try {
    await setApiKey(keyInput.trim());
    await refreshUser();
      setShowSuccess(true);
      // Auto-hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
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

  const hasKey = !!(user?.has_api_key || apiKey || (typeof window !== 'undefined' && localStorage.getItem('apiKey')));

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
      <Paper elevation={4} sx={{ p: { xs: 2, sm: 5 }, bgcolor: '#4E342E', color: '#fff', minWidth: 320, borderRadius: 4, maxWidth: 500, width: '100%', boxShadow: '0 8px 32px 0 rgba(91,111,86,0.18)', position: 'relative' }}>
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
          disabled={saving}
          fullWidth
        >
          {saving ? 'Saving...' : 'Save Key'}
        </Button>
        
        {showSuccess && (
          <Alert 
            severity="success" 
            icon={<CheckCircleIcon />}
            sx={{ 
              mb: 3, 
              bgcolor: 'rgba(91, 111, 86, 0.1)', 
              color: '#5B6F56',
              border: '1px solid rgba(91, 111, 86, 0.3)',
              '& .MuiAlert-icon': {
                color: '#5B6F56'
              }
            }}
          >
            API key saved successfully!
          </Alert>
        )}

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
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
          <DialogTitle>Delete Account</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete your account? This action cannot be undone.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={deleting}>Cancel</Button>
            <Button onClick={handleDelete} color="error" disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
} 
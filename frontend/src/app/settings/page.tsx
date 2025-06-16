"use client";
import { useState } from "react";
import { useAuth } from "../AuthProvider";
import { Box, Paper, Typography, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

export default function SettingsPage() {
  const { apiKey, setApiKey, deleteAccount, logout, user } = useAuth();
  const [keyInput, setKeyInput] = useState(apiKey || "");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSaveKey = async () => {
    await setApiKey(keyInput.trim());
  };

  const handleDelete = async () => {
    setDeleting(true);
    await deleteAccount();
    setDeleting(false);
    setDialogOpen(false);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={3} sx={{ p: 5, bgcolor: '#23272f', color: '#fff', minWidth: 350, borderRadius: 2, maxWidth: 400 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: '#fff' }}>Settings</Typography>
        <Typography variant="h6" sx={{ mb: 2, color: '#9ca3af' }}>Bring Your Own Key</Typography>
        <TextField
          label="API Key"
          type="password"
          value={keyInput}
          onChange={e => setKeyInput(e.target.value)}
          fullWidth
          margin="normal"
          InputLabelProps={{ style: { color: '#9ca3af' } }}
          InputProps={{ style: { color: '#fff', background: '#18181b' } }}
        />
        <Button
          variant="contained"
          sx={{ mt: 1, bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' }, color: '#fff', fontWeight: 600 }}
          onClick={handleSaveKey}
        >
          Save Key
        </Button>
        <Box sx={{ mt: 5 }}>
          <Typography variant="h6" sx={{ mb: 1, color: '#ef4444' }}>Danger Zone</Typography>
          <Button
            variant="outlined"
            color="error"
            sx={{ borderColor: '#ef4444', color: '#ef4444', fontWeight: 600, mb: 2 }}
            onClick={logout}
            disabled={!user}
          >
            Logout
          </Button>
          <Button
            variant="outlined"
            color="error"
            sx={{ borderColor: '#ef4444', color: '#ef4444', fontWeight: 600 }}
            onClick={() => setDialogOpen(true)}
            disabled={!user}
          >
            Delete Account
          </Button>
        </Box>
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
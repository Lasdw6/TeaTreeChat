"use client";
import { useAuth } from "../AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Chat from "@/components/Chat";
import { Box, Paper, Typography, TextField, Button, Tabs, Tab, Alert, Dialog, DialogTitle, DialogContent } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Link from 'next/link';
import SettingsIcon from '@mui/icons-material/Settings';

export default function ChatPage() {
  const { user, token, login, register } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(!user || !token);
  const theme = useTheme();

  useEffect(() => {
    setOpen(!user || !token);
  }, [user, token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(loginEmail, loginPassword);
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(registerName, registerEmail, registerPassword);
    } catch (err: any) {
      setError(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box sx={{ minHeight: '100vh', bgcolor: '#5B6F56' }}>
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', p: 2, position: 'absolute', top: 0, right: 0, zIndex: 10 }}>
          <Link href="/settings" style={{ textDecoration: 'none' }}>
            <Button
              startIcon={<SettingsIcon />}
              sx={{ bgcolor: '#D6BFA3', color: '#4E342E', fontWeight: 600, borderRadius: 2, '&:hover': { bgcolor: '#bfae8c' } }}
              variant="contained"
            >
              Settings
            </Button>
          </Link>
        </Box>
        <Chat />
      </Box>
      <Dialog open={open} disableEscapeKeyDown fullWidth maxWidth="xs"
        PaperProps={{
          sx: {
            bgcolor: '#4E342E',
            p: 0,
            color: '#fff',
            borderRadius: 4,
            boxShadow: '0 8px 32px 0 rgba(91,111,86,0.25)',
            overflow: 'hidden',
            position: 'relative',
            '::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              background: 'linear-gradient(135deg, rgba(0,0,0,0.18) 0%, rgba(91,111,86,0.10) 100%)',
              pointerEvents: 'none',
            },
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', color: '#D6BFA3', fontWeight: 700, fontSize: 26, pb: 0, pt: 3, letterSpacing: 1 }}>
          Welcome to TeaTree Chat
        </DialogTitle>
        <DialogContent sx={{ px: 4, pt: 2, pb: 4 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} centered sx={{ mb: 2, mt: 1, '.MuiTabs-indicator': { bgcolor: '#D6BFA3' } }}>
            <Tab label="Login" sx={{ color: tab === 0 ? '#D6BFA3' : '#fff', fontWeight: 600, fontSize: 18 }} />
            <Tab label="Register" sx={{ color: tab === 1 ? '#D6BFA3' : '#fff', fontWeight: 600, fontSize: 18 }} />
          </Tabs>
          <Box sx={{ my: 2, height: 1, bgcolor: '#D6BFA3', opacity: 0.15, borderRadius: 2 }} />
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
          {tab === 0 ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <TextField
                label="Email"
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                fullWidth
                margin="normal"
                InputLabelProps={{ style: { color: theme.palette.text.secondary } }}
                InputProps={{ style: { color: theme.palette.primary.contrastText, background: 'rgba(255,255,255,0.06)', borderRadius: 10 } }}
                required
              />
              <TextField
                label="Password"
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                fullWidth
                margin="normal"
                InputLabelProps={{ style: { color: theme.palette.text.secondary } }}
                InputProps={{ style: { color: theme.palette.primary.contrastText, background: 'rgba(255,255,255,0.06)', borderRadius: 10 } }}
                required
              />
              <Button
                type="submit"
                variant="contained"
                sx={{ mt: 2, fontWeight: 700, fontSize: 18, borderRadius: 3, bgcolor: '#D6BFA3', color: '#4E342E', boxShadow: '0 2px 8px 0 rgba(91,111,86,0.10)', '&:hover': { bgcolor: '#bfae8c' } }}
                fullWidth
                disabled={loading}
              >
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <TextField
                label="Name"
                value={registerName}
                onChange={e => setRegisterName(e.target.value)}
                fullWidth
                margin="normal"
                InputLabelProps={{ style: { color: theme.palette.text.secondary } }}
                InputProps={{ style: { color: theme.palette.primary.contrastText, background: 'rgba(255,255,255,0.06)', borderRadius: 10 } }}
                required
              />
              <TextField
                label="Email"
                type="email"
                value={registerEmail}
                onChange={e => setRegisterEmail(e.target.value)}
                fullWidth
                margin="normal"
                InputLabelProps={{ style: { color: theme.palette.text.secondary } }}
                InputProps={{ style: { color: theme.palette.primary.contrastText, background: 'rgba(255,255,255,0.06)', borderRadius: 10 } }}
                required
              />
              <TextField
                label="Password"
                type="password"
                value={registerPassword}
                onChange={e => setRegisterPassword(e.target.value)}
                fullWidth
                margin="normal"
                InputLabelProps={{ style: { color: theme.palette.text.secondary } }}
                InputProps={{ style: { color: theme.palette.primary.contrastText, background: 'rgba(255,255,255,0.06)', borderRadius: 10 } }}
                required
              />
              <Button
                type="submit"
                variant="contained"
                sx={{ mt: 2, fontWeight: 700, fontSize: 18, borderRadius: 3, bgcolor: '#D6BFA3', color: '#4E342E', boxShadow: '0 2px 8px 0 rgba(91,111,86,0.10)', '&:hover': { bgcolor: '#bfae8c' } }}
                fullWidth
                disabled={loading}
              >
                {loading ? "Registering..." : "Register"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 
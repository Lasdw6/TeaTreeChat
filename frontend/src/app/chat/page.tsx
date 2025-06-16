"use client";
import { useAuth } from "../AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Chat from "@/components/Chat";
import { Box, Paper, Typography, TextField, Button, Tabs, Tab, Alert, Dialog, DialogTitle, DialogContent } from '@mui/material';

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
      <Box sx={{ minHeight: '100vh', bgcolor: '#18181b' }}>
        <Chat />
      </Box>
      <Dialog open={open} disableEscapeKeyDown fullWidth maxWidth="xs" PaperProps={{ sx: { bgcolor: '#23272f', p: 2 } }}>
        <DialogTitle sx={{ textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: 24, pb: 0 }}>Welcome to T3 Chat</DialogTitle>
        <DialogContent>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} centered sx={{ mb: 3 }}>
            <Tab label="Login" />
            <Tab label="Register" />
          </Tabs>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {tab === 0 ? (
            <form onSubmit={handleLogin}>
              <TextField
                label="Email"
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                fullWidth
                margin="normal"
                InputLabelProps={{ style: { color: '#9ca3af' } }}
                InputProps={{ style: { color: '#fff', background: '#18181b' } }}
                required
              />
              <TextField
                label="Password"
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                fullWidth
                margin="normal"
                InputLabelProps={{ style: { color: '#9ca3af' } }}
                InputProps={{ style: { color: '#fff', background: '#18181b' } }}
                required
              />
              <Button
                type="submit"
                variant="contained"
                sx={{ mt: 2, bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' }, color: '#fff', fontWeight: 600 }}
                fullWidth
                disabled={loading}
              >
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <TextField
                label="Name"
                value={registerName}
                onChange={e => setRegisterName(e.target.value)}
                fullWidth
                margin="normal"
                InputLabelProps={{ style: { color: '#9ca3af' } }}
                InputProps={{ style: { color: '#fff', background: '#18181b' } }}
                required
              />
              <TextField
                label="Email"
                type="email"
                value={registerEmail}
                onChange={e => setRegisterEmail(e.target.value)}
                fullWidth
                margin="normal"
                InputLabelProps={{ style: { color: '#9ca3af' } }}
                InputProps={{ style: { color: '#fff', background: '#18181b' } }}
                required
              />
              <TextField
                label="Password"
                type="password"
                value={registerPassword}
                onChange={e => setRegisterPassword(e.target.value)}
                fullWidth
                margin="normal"
                InputLabelProps={{ style: { color: '#9ca3af' } }}
                InputProps={{ style: { color: '#fff', background: '#18181b' } }}
                required
              />
              <Button
                type="submit"
                variant="contained"
                sx={{ mt: 2, bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' }, color: '#fff', fontWeight: 600 }}
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
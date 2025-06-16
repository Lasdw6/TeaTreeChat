"use client";
import { useRouter } from "next/navigation";
import { Box, Typography, Button, Stack, Divider, useMediaQuery } from '@mui/material';
import KeyIcon from '@mui/icons-material/VpnKey';
import SecurityIcon from '@mui/icons-material/Security';
import HubIcon from '@mui/icons-material/Hub';
import BoltIcon from '@mui/icons-material/Bolt';

export default function LandingPage() {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 900px)');
  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: 'transparent',
      background: 'linear-gradient(135deg, #23272f 0%, #18181b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      px: 2
    }}>
      <Stack direction={isMobile ? 'column' : 'row'} spacing={8} alignItems="center" justifyContent="center" sx={{ width: '100%', maxWidth: 1200 }}>
        {/* Left: Headline, tagline, CTA */}
        <Box sx={{ flex: 1, minWidth: 320, maxWidth: 500, textAlign: isMobile ? 'center' : 'left' }}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: isMobile ? 'center' : 'flex-start' }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: '50%', bgcolor: '#6366f1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 36, color: '#fff', letterSpacing: 1
            }}>
              T3
            </Box>
          </Box>
          <Typography variant="h2" sx={{ mb: 2, fontWeight: 900, color: '#fff', letterSpacing: 1, lineHeight: 1.1 }}>
            Your Private AI Chat Hub
          </Typography>
          <Typography variant="h5" sx={{ mb: 3, color: '#9ca3af', fontWeight: 400 }}>
            BYOK. All Models. Total Control.
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, color: '#b3b3b3', fontSize: 18 }}>
            Connect your own API keys and access {'all kinds of AI models'}—from OpenAI, Anthropic, Llama, and more. Enjoy privacy, flexibility, and full control over your conversations and data.
          </Typography>
          <Button
            variant="contained"
            sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' }, color: '#fff', fontWeight: 600, mb: 2, width: 220, fontSize: 18 }}
            size="large"
            onClick={() => router.push("/chat")}
          >
            Open Chat
          </Button>
        </Box>
        {/* Right: Features */}
        <Box sx={{ flex: 1, minWidth: 280, maxWidth: 420, bgcolor: 'rgba(30,32,40,0.98)', borderRadius: 4, p: 4, boxShadow: '0 8px 32px 0 rgba(0,0,0,0.18)' }}>
          <Typography variant="h5" sx={{ mb: 3, color: '#fff', fontWeight: 700, textAlign: isMobile ? 'center' : 'left' }}>
            Why T3 Chat?
          </Typography>
          <Divider sx={{ mb: 3, bgcolor: '#333' }} />
          <Stack direction="column" spacing={3}>
            <Stack direction="row" spacing={2} alignItems="center">
              <KeyIcon sx={{ color: '#6366f1', fontSize: 32 }} />
              <Typography variant="body1" sx={{ color: '#b3b3b3', fontSize: 18 }}>
                <b>Bring Your Own Key</b> for OpenAI, Anthropic, Llama, and more
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <HubIcon sx={{ color: '#6366f1', fontSize: 32 }} />
              <Typography variant="body1" sx={{ color: '#b3b3b3', fontSize: 18 }}>
                <b>All Models Supported</b> — GPT, Claude, Llama, and custom APIs
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <SecurityIcon sx={{ color: '#6366f1', fontSize: 32 }} />
              <Typography variant="body1" sx={{ color: '#b3b3b3', fontSize: 18 }}>
                <b>Private & Secure</b> — Your data, your control
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <BoltIcon sx={{ color: '#6366f1', fontSize: 32 }} />
              <Typography variant="body1" sx={{ color: '#b3b3b3', fontSize: 18 }}>
                <b>Fast, Modern UI</b> — Beautiful, responsive, and easy to use
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
} 
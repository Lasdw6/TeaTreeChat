"use client";
import { useRouter } from "next/navigation";
import { Box, Typography, Button, Stack, Divider, useMediaQuery } from '@mui/material';
import KeyIcon from '@mui/icons-material/VpnKey';
import SecurityIcon from '@mui/icons-material/Security';
import HubIcon from '@mui/icons-material/Hub';
import BoltIcon from '@mui/icons-material/Bolt';
import TeaTreeLogo from "@/components/TeaTreeLogo";
import { useTheme } from '@mui/material/styles';
import Link from 'next/link';
import SettingsIcon from '@mui/icons-material/Settings';

export default function LandingPage() {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 900px)');
  const theme = useTheme();
  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#5B6F56',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      px: 2
    }}>
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', p: 2, position: 'absolute', top: 0, right: 0, zIndex: 10 }}>
        <Link href="/settings" passHref legacyBehavior>
          <Button
            startIcon={<SettingsIcon />}
            sx={{ bgcolor: '#D6BFA3', color: '#4E342E', fontWeight: 600, borderRadius: 2, '&:hover': { bgcolor: '#bfae8c' } }}
            variant="contained"
          >
            Settings
          </Button>
        </Link>
      </Box>
      <Stack direction={isMobile ? 'column' : 'row'} spacing={8} alignItems="center" justifyContent="center" sx={{ width: '100%', maxWidth: 1200 }}>
        {/* Left: Headline, tagline, CTA */}
        <Box sx={{ flex: 1, minWidth: 320, maxWidth: 500, textAlign: isMobile ? 'center' : 'left' }}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: isMobile ? 'center' : 'flex-start' }}>
            <TeaTreeLogo size={120} />
          </Box>
          <Typography variant="h2" sx={{ mb: 2, fontWeight: 900, color: '#D6BFA3', letterSpacing: 1, lineHeight: 1.1 }}>
            TeaTree Chat
          </Typography>
          <Typography variant="h5" sx={{ mb: 3, color: '#D6BFA3', fontWeight: 400 }}>
            BYOK. All Models. Total Control.
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, color: '#fff', fontSize: 18 }}>
            Connect your own API keys and access {'all kinds of AI models'}—from OpenAI, Anthropic, Llama, and more. Enjoy privacy, flexibility, and full control over your conversations and data.
          </Typography>
          <Button
            variant="contained"
            sx={{ fontWeight: 600, mb: 2, width: 220, fontSize: 18, bgcolor: '#D6BFA3', color: '#4E342E', '&:hover': { bgcolor: '#bfae8c' } }}
            size="large"
            onClick={() => router.push("/chat")}
          >
            Open Chat
          </Button>
        </Box>
        {/* Right: Features */}
        <Box sx={{ flex: 1, minWidth: 280, maxWidth: 420, bgcolor: '#4E342E', borderRadius: 4, p: 4, boxShadow: '0 8px 32px 0 rgba(0,0,0,0.18)' }}>
          <Typography variant="h5" sx={{ mb: 3, color: '#D6BFA3', fontWeight: 700, textAlign: isMobile ? 'center' : 'left' }}>
            Why TeaTree Chat?
          </Typography>
          <Divider sx={{ mb: 3, bgcolor: '#D6BFA3' }} />
          <Stack direction="column" spacing={3}>
            <Stack direction="row" spacing={2} alignItems="center">
              <KeyIcon color="primary" sx={{ fontSize: 32 }} />
              <Typography variant="body1" sx={{ color: theme.palette.text.secondary, fontSize: 18 }}>
                <b>Bring Your Own Key</b> for OpenAI, Anthropic, Llama, and more
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <HubIcon color="primary" sx={{ fontSize: 32 }} />
              <Typography variant="body1" sx={{ color: theme.palette.text.secondary, fontSize: 18 }}>
                <b>All Models Supported</b> — GPT, Claude, Llama, and custom APIs
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <SecurityIcon color="primary" sx={{ fontSize: 32 }} />
              <Typography variant="body1" sx={{ color: theme.palette.text.secondary, fontSize: 18 }}>
                <b>Private & Secure</b> — Your data, your control
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <BoltIcon color="primary" sx={{ fontSize: 32 }} />
              <Typography variant="body1" sx={{ color: theme.palette.text.secondary, fontSize: 18 }}>
                <b>Fast, Modern UI</b> — Beautiful, responsive, and easy to use
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
} 
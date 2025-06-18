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
          <Typography variant="body1" sx={{ mb: 4, color: '#fff', fontSize: 18, lineHeight: 1.6 }}>
            The ultimate AI chat platform where <strong>you</strong> bring your own API keys. Access GPT-4, Claude, Llama, Gemini, and dozens of other models with complete privacy and control. No monthly subscriptions, no data mining—just pure AI conversation power.
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
      
      {/* Footer */}
      <Box sx={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        p: 3, 
        textAlign: 'center',
        background: 'linear-gradient(to top, rgba(78, 52, 46, 0.8), transparent)'
      }}>
        <Typography variant="body2" sx={{ color: '#D6BFA3', opacity: 0.8 }}>
          Made with ☕ by{' '}
          <Link 
            href="https://vividh.lol" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              color: '#D6BFA3', 
              textDecoration: 'none',
              fontWeight: 600,
              borderBottom: '1px solid transparent',
              transition: 'border-color 0.2s ease'
            }}
            onMouseEnter={(e) => (e.target as HTMLElement).style.borderBottomColor = '#D6BFA3'}
            onMouseLeave={(e) => (e.target as HTMLElement).style.borderBottomColor = 'transparent'}
          >
            Vividh Mahajan
          </Link>
          {' • '}
          <Link 
            href="https://github.com/Lasdw6/TeaTreeChat" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              color: '#D6BFA3', 
              textDecoration: 'none',
              fontWeight: 600,
              borderBottom: '1px solid transparent',
              transition: 'border-color 0.2s ease'
            }}
            onMouseEnter={(e) => (e.target as HTMLElement).style.borderBottomColor = '#D6BFA3'}
            onMouseLeave={(e) => (e.target as HTMLElement).style.borderBottomColor = 'transparent'}
          >
            GitHub
          </Link>
        </Typography>
      </Box>
    </Box>
  );
} 
"use client";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Chat from "@/components/Chat";
import ServerStatusLoader from "@/components/ServerStatusLoader";
import { Box, Button } from '@mui/material';
import Link from 'next/link';
import SettingsIcon from '@mui/icons-material/Settings';
import React from "react";
import TeaTreeSpinner from '@/components/TeaTreeSpinner';

export default function ChatPage() {
  const { user, isLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [serverReady, setServerReady] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleServerReady = () => {
    setServerReady(true);
  };

  if (!isLoaded) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#5B6F56', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <TeaTreeSpinner size={96} showText />
      </Box>
    );
  }

  return (
    <ServerStatusLoader onServerReady={handleServerReady}>
      <Box sx={{ minHeight: '100vh', bgcolor: '#5B6F56' }}>
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', p: 2, position: 'absolute', top: 0, right: 0, zIndex: 10 }}>
          <Link href="/settings" style={{ textDecoration: 'none' }}>
            <Button
              ref={settingsButtonRef}
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
    </ServerStatusLoader>
  );
} 
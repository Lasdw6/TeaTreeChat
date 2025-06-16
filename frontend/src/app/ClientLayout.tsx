'use client';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import Link from 'next/link';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <main className="min-h-screen flex flex-col" style={{ background: 'transparent' }}>
        {children}
      </main>
    </ThemeProvider>
  );
} 
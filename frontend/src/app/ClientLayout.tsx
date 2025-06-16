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
      <main className="min-h-screen flex flex-col">
        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', padding: '16px 24px 0 0' }}>
          <Link href="/settings" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none', fontSize: 18 }}>Settings</Link>
        </div>
        {children}
      </main>
    </ThemeProvider>
  );
} 
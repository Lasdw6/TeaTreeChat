import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import TeaTreeLogo from './TeaTreeLogo';
import { pingServer } from '@/lib/api';

interface ServerStatusLoaderProps {
  onServerReady: () => void;
  children: React.ReactNode;
}

const ServerStatusLoader: React.FC<ServerStatusLoaderProps> = ({ onServerReady, children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const maxRetries = 3;

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        setError(null);
        const isServerReady = await pingServer();
        
        if (isServerReady) {
          setIsLoading(false);
          onServerReady();
        } else {
          // Server responded but with error, retry
          if (retryCount < maxRetries) {
            setRetryCount(prev => prev + 1);
            setTimeout(checkServerStatus, 2000); // Retry after 2 seconds
          } else {
            setError('Server is not responding. Please try refreshing the page.');
            setIsLoading(false);
          }
        }
      } catch (error) {
        // Network error or timeout, retry
        if (retryCount < maxRetries) {
          setRetryCount(prev => prev + 1);
          setTimeout(checkServerStatus, 3000); // Retry after 3 seconds for network errors
        } else {
          setError('Unable to connect to server. Please check your internet connection and try refreshing the page.');
          setIsLoading(false);
        }
      }
    };

    // Start checking server status
    checkServerStatus();
  }, [retryCount, onServerReady]);

  if (!isLoading && !error) {
    return <>{children}</>;
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#5B6F56', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 3,
      px: 2
    }}>
      <Box sx={{ 
        bgcolor: '#4E342E', 
        p: 4, 
        borderRadius: 4, 
        textAlign: 'center',
        maxWidth: 500,
        width: '100%',
        boxShadow: '0 8px 32px 0 rgba(91,111,86,0.25)'
      }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
          <TeaTreeLogo size={80} />
        </Box>
        
        {isLoading && !error && (
          <>
            <Typography variant="h5" sx={{ 
              color: '#D6BFA3', 
              fontWeight: 700, 
              mb: 2 
            }}>
              Waking up TeaTree Chat
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <CircularProgress 
                size={40} 
                sx={{ color: '#D6BFA3' }}
              />
            </Box>
            
            <Typography variant="body1" sx={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              mb: 2,
              lineHeight: 1.6
            }}>
              Our server is starting up. This may take up to a minute.
            </Typography>
            
            {retryCount > 0 && (
              <Typography variant="body2" sx={{ 
                color: '#D6BFA3', 
                fontStyle: 'italic'
              }}>
                Attempt {retryCount + 1} of {maxRetries + 1}
              </Typography>
            )}
          </>
        )}
        
        {error && (
          <>
            <Typography variant="h5" sx={{ 
              color: '#ef4444', 
              fontWeight: 700, 
              mb: 2 
            }}>
              Connection Error
            </Typography>
            
            <Alert 
              severity="error" 
              sx={{ 
                bgcolor: 'rgba(239, 68, 68, 0.1)', 
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                mb: 2
              }}
            >
              {error}
            </Alert>
            
            <Typography variant="body2" sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              mt: 1
            }}>
              If this problem persists, the server may be experiencing issues.
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
};

export default ServerStatusLoader; 
import React from 'react';
import { Box, keyframes } from '@mui/material';
import TeaTreeLogo from './TeaTreeLogo';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
`;

interface TeaTreeSpinnerProps {
  size?: number;
  showText?: boolean;
}

const TeaTreeSpinner: React.FC<TeaTreeSpinnerProps> = ({ 
  size = 48, 
  showText = false 
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <Box
        sx={{
          animation: `${spin} 2s linear infinite`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TeaTreeLogo size={size} />
      </Box>
      {showText && (
        <Box
          sx={{
            animation: `${pulse} 1.5s ease-in-out infinite`,
            color: '#D6BFA3',
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: 1,
          }}
        >
          TeaTree Chat
        </Box>
      )}
    </Box>
  );
};

export default TeaTreeSpinner; 
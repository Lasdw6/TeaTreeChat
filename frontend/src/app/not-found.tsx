import { Box, Typography, Button } from '@mui/material';
import Link from 'next/link';
import TeaTreeLogo from '@/components/TeaTreeLogo';

export default function NotFound() {
  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#5B6F56',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      px: 2
    }}>
      <Box sx={{ 
        textAlign: 'center', 
        maxWidth: 500, 
        px: 4,
        py: 6,
        bgcolor: 'rgba(78, 52, 46, 0.1)',
        borderRadius: 4,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(214, 191, 163, 0.2)'
      }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
          <TeaTreeLogo size={100} />
        </Box>
        <Typography variant="h1" sx={{ 
          color: '#D6BFA3', 
          fontWeight: 900, 
          mb: 2, 
          fontSize: '4rem',
          letterSpacing: 2 
        }}>
          404
        </Typography>
        <Typography variant="h4" sx={{ 
          color: '#D6BFA3', 
          fontWeight: 700, 
          mb: 2, 
          letterSpacing: 1 
        }}>
          Page Not Found
        </Typography>
        <Typography variant="body1" sx={{ 
          color: 'rgba(255, 255, 255, 0.8)', 
          fontSize: 18,
          lineHeight: 1.6,
          mb: 4
        }}>
          The page you're looking for seems to have wandered off into the digital tea garden.
        </Typography>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Button
            variant="contained"
            sx={{ 
              fontWeight: 600, 
              fontSize: 16,
              px: 4,
              py: 1.5,
              bgcolor: '#D6BFA3', 
              color: '#4E342E', 
              borderRadius: 3,
              '&:hover': { bgcolor: '#bfae8c' } 
            }}
          >
            Return Home
          </Button>
        </Link>
      </Box>
    </Box>
  );
} 
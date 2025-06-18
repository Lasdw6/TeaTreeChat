import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#5B6F56', // Green
    },
    secondary: {
      main: '#D6BFA3', // Beige/Tan
    },
    background: {
      default: '#4E342E', // Brown
      paper: '#4E342E',   // Brown
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

export default theme; 
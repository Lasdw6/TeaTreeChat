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
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: '#D6BFA3 #4E342E',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#4E342E',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#D6BFA3',
            borderRadius: '4px',
            '&:hover': {
              background: '#C5A882',
            },
          },
          '& *': {
            scrollbarWidth: 'thin',
            scrollbarColor: '#D6BFA3 #4E342E',
          },
          '& *::-webkit-scrollbar': {
            width: '8px',
          },
          '& *::-webkit-scrollbar-track': {
            background: '#4E342E',
          },
          '& *::-webkit-scrollbar-thumb': {
            background: '#D6BFA3',
            borderRadius: '4px',
            '&:hover': {
              background: '#C5A882',
            },
          },
        },
      },
    },
  },
});

export default theme; 
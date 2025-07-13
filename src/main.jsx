import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App.jsx'
import '@xyflow/react/dist/style.css'
import './styles/custom-font.css'

// Material UI theme with Circular Std font
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: 'Circular Std, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0, 0, 0, 0.1)',
    '0px 4px 8px rgba(0, 0, 0, 0.1)',
    '0px 8px 16px rgba(0, 0, 0, 0.1)',
    '0px 4px 12px rgba(0, 0, 0, 0.15)',
    '0px 6px 16px rgba(0, 0, 0, 0.15)',
    '0px 8px 20px rgba(0, 0, 0, 0.15)',
    '0px 10px 24px rgba(0, 0, 0, 0.15)',
    '0px 12px 28px rgba(0, 0, 0, 0.15)',
    '0px 16px 32px rgba(0, 0, 0, 0.15)',
    '0px 20px 40px rgba(0, 0, 0, 0.15)',
    '0px 24px 48px rgba(0, 0, 0, 0.15)',
    '0px 28px 56px rgba(0, 0, 0, 0.15)',
    '0px 32px 64px rgba(0, 0, 0, 0.15)',
    '0px 36px 72px rgba(0, 0, 0, 0.15)',
    '0px 40px 80px rgba(0, 0, 0, 0.15)',
    '0px 44px 88px rgba(0, 0, 0, 0.15)',
    '0px 48px 96px rgba(0, 0, 0, 0.15)',
    '0px 52px 104px rgba(0, 0, 0, 0.15)',
    '0px 56px 112px rgba(0, 0, 0, 0.15)',
    '0px 60px 120px rgba(0, 0, 0, 0.15)',
    '0px 64px 128px rgba(0, 0, 0, 0.15)',
    '0px 68px 136px rgba(0, 0, 0, 0.15)',
    '0px 72px 144px rgba(0, 0, 0, 0.15)',
    '0px 76px 152px rgba(0, 0, 0, 0.15)',
  ],
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
) 
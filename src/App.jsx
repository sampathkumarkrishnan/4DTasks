import React from 'react';
import { Box } from '@mui/material';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import LoginScreen from './components/Auth/LoginScreen';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '3px solid',
            borderColor: 'primary.main',
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' },
            },
          }}
        />
      </Box>
    );
  }

  return isAuthenticated ? <Layout /> : <LoginScreen />;
}

export default App;


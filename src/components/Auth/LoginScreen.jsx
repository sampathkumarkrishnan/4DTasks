import React from 'react';
import { Box, Typography, Button, Paper, alpha, useTheme } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import GridViewIcon from '@mui/icons-material/GridView';
import { useAuth } from '../../context/AuthContext';
import { useThemeMode } from '../../context/ThemeContext';
import { getQuadrantConfig } from '../../theme/theme';

function LoginScreen() {
  const { login, error } = useAuth();
  const { mode, isDark } = useThemeMode();
  const theme = useTheme();
  const quadrantConfig = getQuadrantConfig(mode);

  const quadrantItems = [
    { label: 'Do', color: quadrantConfig.do.color },
    { label: 'Delegate', color: quadrantConfig.delegate.color },
    { label: 'Delay', color: quadrantConfig.delay.color },
    { label: 'Delete', color: quadrantConfig.delete.color },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 3,
        background: `
          radial-gradient(ellipse at 20% 20%, ${alpha(quadrantConfig.do.color, 0.15)} 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, ${alpha(quadrantConfig.delegate.color, 0.15)} 0%, transparent 50%),
          radial-gradient(ellipse at 20% 80%, ${alpha(quadrantConfig.delay.color, 0.15)} 0%, transparent 50%),
          radial-gradient(ellipse at 80% 80%, ${alpha(quadrantConfig.delete.color, 0.15)} 0%, transparent 50%),
          ${theme.palette.background.default}
        `,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 5,
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          bgcolor: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(12px)',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: 2,
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <GridViewIcon sx={{ fontSize: 32, color: 'white' }} />
        </Box>

        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          4D Matrix
        </Typography>

        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 4, lineHeight: 1.6 }}
        >
          Organize your tasks using the proven 4D Matrix method.
          Focus on what truly matters with Do, Delegate, Delay, and Delete.
        </Typography>

        <Button
          variant="contained"
          size="large"
          startIcon={<GoogleIcon />}
          onClick={login}
          fullWidth
          sx={{
            py: 1.5,
            fontSize: '1rem',
            bgcolor: isDark ? '#FFFFFF' : '#1A1A1F',
            color: isDark ? '#1A1A1F' : '#FFFFFF',
            '&:hover': {
              bgcolor: isDark ? alpha('#FFFFFF', 0.9) : alpha('#1A1A1F', 0.9),
            },
          }}
        >
          Sign in with Google
        </Button>

        {error && (
          <Typography
            variant="body2"
            color="error"
            sx={{ mt: 2 }}
          >
            {error}
          </Typography>
        )}

        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ display: 'block', mt: 3 }}
        >
          Your tasks are synced with Google Tasks
        </Typography>
      </Paper>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="caption" color="text.disabled">
          The 4Ds of Productivity
        </Typography>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mt: 1,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {quadrantItems.map((item) => (
            <Box
              key={item.label}
              sx={{
                px: 2,
                py: 0.5,
                borderRadius: 1,
                bgcolor: alpha(item.color, 0.3),
                border: `1px solid ${alpha(item.color, 0.5)}`,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                {item.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

export default LoginScreen;

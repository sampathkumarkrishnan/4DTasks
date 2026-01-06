import { createTheme, alpha } from '@mui/material/styles';

// Quadrant colors - work in both light and dark modes
const quadrantColors = {
  do: {
    dark: '#2D5A4A',
    light: '#4A8F6F',
  },
  delegate: {
    dark: '#4A4A6A',
    light: '#6B6B9A',
  },
  delay: {
    dark: '#5A4A3A',
    light: '#8B7355',
  },
  delete: {
    dark: '#4A3A3A',
    light: '#7A5A5A',
  },
};

// Accent colors
const accentColors = {
  primary: {
    dark: '#6B8F71',
    light: '#4A7050',
  },
  secondary: {
    dark: '#8B7355',
    light: '#6B5540',
  },
};

// Create theme based on mode
export function createAppTheme(mode) {
  const isDark = mode === 'dark';

  const colors = {
    quadrant: {
      do: isDark ? quadrantColors.do.dark : quadrantColors.do.light,
      delegate: isDark ? quadrantColors.delegate.dark : quadrantColors.delegate.light,
      delay: isDark ? quadrantColors.delay.dark : quadrantColors.delay.light,
      delete: isDark ? quadrantColors.delete.dark : quadrantColors.delete.light,
    },
    background: isDark
      ? {
          default: '#1A1A1F',
          paper: '#242429',
          elevated: '#2A2A30',
        }
      : {
          default: '#F5F5F7',
          paper: '#FFFFFF',
          elevated: '#FAFAFA',
        },
    text: isDark
      ? {
          primary: '#E8E8EC',
          secondary: '#9898A0',
          disabled: '#606068',
        }
      : {
          primary: '#1A1A1F',
          secondary: '#5A5A65',
          disabled: '#9898A0',
        },
  };

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? accentColors.primary.dark : accentColors.primary.light,
        light: isDark ? '#8FB396' : '#6B9070',
        dark: isDark ? '#4A6B4F' : '#3A5A40',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: isDark ? accentColors.secondary.dark : accentColors.secondary.light,
        light: isDark ? '#A89078' : '#8B7060',
        dark: isDark ? '#6B5540' : '#5A4530',
        contrastText: '#FFFFFF',
      },
      background: {
        default: colors.background.default,
        paper: colors.background.paper,
      },
      text: {
        primary: colors.text.primary,
        secondary: colors.text.secondary,
        disabled: colors.text.disabled,
      },
      divider: alpha(isDark ? '#FFFFFF' : '#000000', 0.08),
      quadrant: colors.quadrant,
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 600,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        letterSpacing: '-0.01em',
      },
      h3: {
        fontSize: '1.5rem',
        fontWeight: 600,
      },
      h4: {
        fontSize: '1.25rem',
        fontWeight: 600,
      },
      h5: {
        fontSize: '1rem',
        fontWeight: 600,
      },
      h6: {
        fontSize: '0.875rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      },
      body1: {
        fontSize: '0.9375rem',
        lineHeight: 1.6,
      },
      body2: {
        fontSize: '0.8125rem',
        lineHeight: 1.5,
      },
      caption: {
        fontSize: '0.75rem',
        letterSpacing: '0.02em',
      },
      button: {
        textTransform: 'none',
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarWidth: 'thin',
            scrollbarColor: `${alpha(isDark ? '#FFFFFF' : '#000000', 0.2)} transparent`,
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: alpha(isDark ? '#FFFFFF' : '#000000', 0.2),
              borderRadius: '4px',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            padding: '8px 16px',
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: `0 2px 8px ${alpha('#000000', isDark ? 0.2 : 0.08)}`,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: colors.background.elevated,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: alpha(isDark ? '#FFFFFF' : '#000000', 0.15),
              },
              '&:hover fieldset': {
                borderColor: alpha(isDark ? '#FFFFFF' : '#000000', 0.25),
              },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: alpha(isDark ? '#FFFFFF' : '#000000', 0.08),
            },
          },
        },
      },
    },
  });
}

// Get quadrant config based on theme mode
export function getQuadrantConfig(mode = 'dark') {
  const isDark = mode === 'dark';
  
  return {
    do: {
      id: 'do',
      title: 'Do',
      subtitle: 'Urgent & Important',
      color: isDark ? quadrantColors.do.dark : quadrantColors.do.light,
      icon: 'PlayArrow',
      description: 'Tasks to complete immediately',
    },
    delegate: {
      id: 'delegate',
      title: 'Delegate',
      subtitle: 'Urgent, Not Important',
      color: isDark ? quadrantColors.delegate.dark : quadrantColors.delegate.light,
      icon: 'People',
      description: 'Tasks to assign to others',
    },
    delay: {
      id: 'delay',
      title: 'Delay',
      subtitle: 'Important, Not Urgent',
      color: isDark ? quadrantColors.delay.dark : quadrantColors.delay.light,
      icon: 'Schedule',
      description: 'Tasks to schedule for later',
    },
    delete: {
      id: 'delete',
      title: 'Delete',
      subtitle: 'Neither Urgent nor Important',
      color: isDark ? quadrantColors.delete.dark : quadrantColors.delete.light,
      icon: 'Delete',
      description: 'Tasks to eliminate',
    },
  };
}

// Legacy export for compatibility - uses dark mode colors
export const quadrantConfig = getQuadrantConfig('dark');

export default createAppTheme('dark');

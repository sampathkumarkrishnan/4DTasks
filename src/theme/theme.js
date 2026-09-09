import { createTheme, alpha } from '@mui/material/styles';

// Quadrant colors — semantically distinct hue families, WCAG-AA-ready in both modes.
// DO = Teal (action, forward motion)
// DELEGATE = Indigo (collaboration, hand-off)
// DELAY = Amber (consideration, scheduling)
// DELETE = Slate (neutral, deprioritized — intentionally low energy)
const quadrantColors = {
  do: {
    dark: '#2A9D8F',
    light: '#1E7D70',
  },
  delegate: {
    dark: '#7B6CF6',
    light: '#5E52D4',
  },
  delay: {
    dark: '#E76F51',
    light: '#C85A3D',
  },
  delete: {
    dark: '#94A3B8',
    light: '#64748B',
  },
};

// Accent colors — primary mirrors DO teal, secondary mirrors DELEGATE indigo.
// Reference quadrantColors directly so the two never drift apart.
const accentColors = {
  primary: quadrantColors.do,
  secondary: quadrantColors.delegate,
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
          default: '#131318',
          paper: '#1C1C22',
          elevated: '#26262E',
        }
      : {
          default: '#F2F4F8',
          paper: '#FFFFFF',
          elevated: '#F8F9FB',
        },
    text: isDark
      ? {
          primary: '#ECECF0',
          secondary: '#9A9AA8',
          disabled: '#606068',
        }
      : {
          primary: '#18181F',
          secondary: '#55556A',
          disabled: '#9898A0',
        },
  };

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? accentColors.primary.dark : accentColors.primary.light,
        light: isDark ? '#3DBCAD' : '#2A9D8F',
        dark: isDark ? '#1E7D70' : '#176358',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: isDark ? accentColors.secondary.dark : accentColors.secondary.light,
        light: isDark ? '#9A8EF8' : '#7B6CF6',
        dark: isDark ? '#5E52D4' : '#4740B0',
        contrastText: '#FFFFFF',
      },
      warning: {
        // MUI standard warning palette — meets WCAG AA in both modes.
        // dark: orange[400] (#FFA726) — amber[400] (#FFCA28) is too light on dark surfaces.
        // light: deepOrange[900] (#E65100) — sufficient contrast on white/light backgrounds.
        main: isDark ? '#FFA726' : '#E65100',
        light: isDark ? '#FFB74D' : '#FF6D00',
        dark: isDark ? '#F57C00' : '#BF360C',
        contrastText: isDark ? '#000000' : '#FFFFFF',
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

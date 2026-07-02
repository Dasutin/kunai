import { createTheme } from '@mui/material/styles';

export const kunaiLayout = {
  miniSidebarWidth: 64,
  sidebarWidth: 208,
  modalContentWidth: 760,
  radius: 12
};

export const kunaiScrollbarSx = {
  scrollbarWidth: 'thin',
  scrollbarColor: '#4b5563 rgba(255, 255, 255, 0.04)',
  '&::-webkit-scrollbar': {
    width: 10,
    height: 10
  },
  '&::-webkit-scrollbar-button': {
    width: 0,
    height: 0,
    display: 'none'
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 999
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#4b5563',
    border: '2px solid var(--panel-2)',
    borderRadius: 999
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: '#6b7280'
  },
  '&::-webkit-scrollbar-corner': {
    background: 'transparent'
  }
} as const;

export const kunaiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#38bdf8' },
    secondary: { main: '#a78bfa' },
    error: { main: '#f87171' },
    success: { main: '#34d399' },
    background: {
      default: '#050505',
      paper: '#0b0b0b'
    },
    text: {
      primary: '#e5e7eb',
      secondary: '#9ca3af'
    }
  },
  shape: {
    borderRadius: kunaiLayout.radius
  },
  typography: {
    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    button: {
      textTransform: 'none',
      fontWeight: 700
    }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'var(--bg)',
          color: 'var(--text)',
          overflowX: 'hidden'
        },
        a: {
          color: 'inherit',
          textDecoration: 'none'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none'
        }
      }
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 700
        },
        contained: {
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          color: '#0b1021',
          '&:hover': {
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))'
          }
        },
        outlined: {
          borderColor: 'var(--card-border)',
          color: 'var(--text)'
        },
        text: {
          color: 'var(--muted)'
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: 'var(--muted)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            color: 'var(--text)'
          }
        }
      }
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: 'var(--panel)',
          border: '1px solid var(--card-border)',
          color: 'var(--text)'
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: 'var(--panel-2)',
          border: '1px solid var(--card-border)',
          color: 'var(--text)',
          boxShadow: 'var(--shadow)'
        }
      }
    },
    MuiTextField: {
      defaultProps: {
        size: 'small'
      }
    },
    MuiSelect: {
      defaultProps: {
        size: 'small'
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderColor: 'var(--card-border)',
          color: 'var(--text)'
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'var(--panel-2)',
          border: '1px solid var(--card-border)',
          color: 'var(--text)'
        }
      }
    }
  }
});

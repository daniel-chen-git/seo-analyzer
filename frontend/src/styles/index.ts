import './globals.css'

export const theme = {
  colors: {
    primary: '#1a73e8',
    secondary: '#f8f9fa',
    success: '#34a853',
    warning: '#fbbc04',
    error: '#ea4335',
    text: '#202124',
    textSecondary: '#5f6368',
    border: '#dadce0',
    background: '#ffffff',
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px',
  },
} as const
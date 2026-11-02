// Our design system first, then the app (whose page stylesheets load
// last). Bootstrap's stylesheet is no longer loaded: no Bootstrap classes
// or components are used, and index.css provides the base reset. Dropping
// it saves ~230 KB of CSS and stops its <legend> rule clashing with MUI
// outlined text fields.
import './index.css';
import App from './App';

import React from 'react';
import ReactDOM from 'react-dom/client';

import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AuthContextProvider } from './context/AuthContext';

// Dark theme for the MUI pieces (text fields, ratings, modals, buttons)
// so they match the rest of the site.
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#e0a84e', contrastText: '#000000' },
    background: { default: '#000000', paper: '#141416' },
    text: { primary: '#ece7de', secondary: '#8f8a82' },
    divider: 'rgba(236, 231, 222, 0.12)',
  },
  shape: { borderRadius: 3 },
  typography: {
    fontFamily: "'FADE', 'Courier Prime', 'Courier New', monospace",
    button: { textTransform: 'none', fontWeight: 500 },
  },
  components: {
    MuiRating: {
      styleOverrides: {
        iconFilled: { color: '#e0a84e' },
        iconHover: { color: '#e0a84e' },
        iconEmpty: { color: 'rgba(236, 231, 222, 0.22)' },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#141416',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(236, 231, 222, 0.12)' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(236, 231, 222, 0.28)' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <AuthContextProvider>
    <ThemeProvider theme={theme}>
      <HashRouter>
        <App />
      </HashRouter>
    </ThemeProvider>
  </AuthContextProvider>
);

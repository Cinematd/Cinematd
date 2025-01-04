import App from './App';
import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import React from 'react';
import ReactDOM from 'react-dom/client';

import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import { AuthContextProvider } from './context/AuthContext';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <AuthContextProvider>
    <HashRouter>
      <App />

    </HashRouter>
  </AuthContextProvider>
);
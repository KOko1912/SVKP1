// src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import AppRouter from './AppRouter';
import './index.css';

const isDev = import.meta.env.MODE === 'development';

const AppTree = (
  <HashRouter>
    <AppRouter />
  </HashRouter>
);

createRoot(document.getElementById('root')).render(
  isDev ? AppTree : <StrictMode>{AppTree}</StrictMode>
);

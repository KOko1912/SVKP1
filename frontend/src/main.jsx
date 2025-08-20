import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './AppRouter';
import './index.css';

const isDev = import.meta.env.MODE === 'development';

const AppTree = (
  <BrowserRouter basename={import.meta.env.BASE_URL ?? '/'}>
    <AppRouter />
  </BrowserRouter>
);

createRoot(document.getElementById('root')).render(
  // En desarrollo quitamos StrictMode para evitar efectos dobles.
  // En producción lo dejamos (no duplica efectos y ayuda a detectar problemas).
  isDev ? AppTree : <StrictMode>{AppTree}</StrictMode>
);

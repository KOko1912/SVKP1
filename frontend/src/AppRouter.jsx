// frontend/src/AppRouter.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import App from './App';

// ===============================
// Público
// ===============================
import PublicProducto from './pages/Public/PublicProducto';
import SVKT from './pages/SVKT'; // Vista pública de tienda

// ===============================
// Auth (acceso público)
// ===============================
import Login from './pages/Auth/Login';
import Registro from './pages/Auth/Registro';
import Olvide from './pages/Auth/Olvide';
import Reset from './pages/Auth/Reset';

// ===============================
// Usuario final (área protegida)
// ===============================
import Perfil from './pages/Usuario/Perfil';
import HomeUsuario from './pages/Usuario/Home';
import MisCompras from './pages/Usuario/MisCompras';
import TiendasSeguidas from './pages/Usuario/TiendasSeguidas';
import ConfiguracionUsuario from './pages/Usuario/Configuracion';
import DetalleProducto from './pages/Usuario/DetalleProducto';

// ===============================
// Admin / Vendedor
// ===============================
import AdminHome from './pages/Admin/Home';
import VendedorPerfil from './pages/Vendedor/Perfil';
import Pagina from './pages/Vendedor/Pagina';
import ConfiguracionVista from './pages/Vendedor/ConfiguracionVista';
import Productos from './pages/Vendedor/Productos';

// ------------------------------------------------------------------
// Helpers de protección de rutas
// ------------------------------------------------------------------
const getUsuario = () => {
  try {
    const raw = localStorage.getItem('usuario');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/** Requiere sesión (usuario en localStorage) */
const RequireAuth = ({ children }) => {
  const user = getUsuario();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

/**
 * Arregla el caso típico de HashRouter:
 * Si el usuario abre /admin (sin #/), redirigimos a /#/admin
 * para que las rutas coincidan correctamente.
 */
function HashPathFix() {
  useEffect(() => {
    const hasHash = typeof window !== 'undefined' && window.location.hash.startsWith('#/');
    const pathIsRoot = window.location.pathname === '/' || window.location.pathname === '';
    const needsFix = !hasHash && !pathIsRoot; // p.ej. /admin, /usuario/perfil, etc.

    if (needsFix) {
      const rest = window.location.pathname + window.location.search + window.location.hash;
      // redirige a la versión hash sin recargar el estado del dev server
      window.location.replace('/#' + rest);
    }
  }, []);
  return null;
}

export default function AppRouter() {
  return (
    <>
      {/* Ejecuta la corrección de hash si aplica */}
      <HashPathFix />

      <Routes>
        {/* =======================
            Rutas públicas
           ======================= */}
        <Route path="/" element={<App />} />

        {/* Público: producto y tienda */}
        <Route path="/producto/:uuid" element={<PublicProducto />} />
        <Route path="/t/:slug" element={<SVKT />} />

        {/* Auth público */}
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/olvide" element={<Olvide />} />
        <Route path="/reset" element={<Reset />} />

        {/* =======================
            Usuario (protegido)
           ======================= */}
        <Route
          path="/usuario/home"
          element={
            <RequireAuth>
              <HomeUsuario />
            </RequireAuth>
          }
        />
        <Route
          path="/usuario/compras"
          element={
            <RequireAuth>
              <MisCompras />
            </RequireAuth>
          }
        />
        <Route
          path="/usuario/tiendas"
          element={
            <RequireAuth>
              <TiendasSeguidas />
            </RequireAuth>
          }
        />
        <Route
          path="/usuario/configuracion"
          element={
            <RequireAuth>
              <ConfiguracionUsuario />
            </RequireAuth>
          }
        />
        <Route
          path="/usuario/perfil"
          element={
            <RequireAuth>
              <Perfil />
            </RequireAuth>
          }
        />
        <Route
          path="/usuario/producto/:id"
          element={
            <RequireAuth>
              <DetalleProducto />
            </RequireAuth>
          }
        />

        {/* =======================
            Admin (público; se valida adentro con SDKADMIN)
           ======================= */}
        <Route path="/admin" element={<AdminHome />} />

        {/* =======================
            Vendedor (protegido)
           ======================= */}
        <Route
          path="/vendedor/perfil"
          element={
            <RequireAuth>
              <VendedorPerfil />
            </RequireAuth>
          }
        />
        <Route
          path="/vendedor/pagina"
          element={
            <RequireAuth>
              <Pagina />
            </RequireAuth>
          }
        />
        <Route
          path="/vendedor/configuracion"
          element={
            <RequireAuth>
              <ConfiguracionVista />
            </RequireAuth>
          }
        />
        <Route
          path="/vendedor/productos"
          element={
            <RequireAuth>
              <Productos />
            </RequireAuth>
          }
        />

        {/* =======================
            Fallback
           ======================= */}
        <Route path="*" element={<Navigate to="/usuario/home" replace />} />
      </Routes>
    </>
  );
}

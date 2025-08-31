// frontend/src/AppRouter.jsx
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import App from './App';

// ===============================
// Público
// ===============================
import PublicProducto from './pages/Public/PublicProducto';
import Comprobante from './pages/Public/Comprobante';
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

// === NUEVO: Finanzas del Vendedor ===
import FinanzasInicio from './pages/Vendedor/Finanzas/Inicio';

// ------------------------------------------------------------------
// Token de URL para acceder al panel admin
// Colócalo en .env del frontend: VITE_ADMIN_URL_TOKEN="<tu hash>"
// ------------------------------------------------------------------
export const ADMIN_URL_TOKEN =
  (import.meta.env.VITE_ADMIN_URL_TOKEN && String(import.meta.env.VITE_ADMIN_URL_TOKEN)) ||
  '$2a$10$ONMIsejyxVNdsaEvZgJWE.Yo1YBSD.wyXPYOVZhOu3OncahAEYhXe';

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

const hasVendorRole = (u) => {
  if (!u) return false;

  // Soporte a varias convenciones que podrías estar usando:
  if (u.esVendedor === true) return true;
  if (u.isVendedor === true) return true;
  if (u.vendedor === true) return true;
  if (u.vendor === true) return true;

  // Si guardas una tienda ligada al usuario:
  if (u.tiendaId || (u.tienda && u.tienda.id)) return true;

  // Roles tipo array o string:
  if (Array.isArray(u.roles) && u.roles.some(r => String(r).toUpperCase() === 'VENDEDOR')) return true;
  if (typeof u.role === 'string' && u.role.toUpperCase() === 'VENDEDOR') return true;

  return false;
};

const RequireAuth = ({ children }) => {
  const user = getUsuario();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Extra: requiere que el usuario sea vendedor activo
const RequireVendor = ({ children }) => {
  const user = getUsuario();
  if (!user) return <Navigate to="/login" replace />;

  if (!hasVendorRole(user)) {
    // Si quieres mostrar un aviso, puedes enviar a una landing de activación del modo vendedor
    // return <Navigate to="/vendedor/activar" replace />;
    return <Navigate to="/usuario/home" replace />;
  }
  return children;
};

/**
 * Arregla el caso típico de HashRouter:
 * Si el usuario abre /algo (sin #/), redirigimos a /#/algo
 * para que las rutas coincidan correctamente.
 */
function HashPathFix() {
  useEffect(() => {
    const hasHash = typeof window !== 'undefined' && window.location.hash.startsWith('#/');
    const pathIsRoot = window.location.pathname === '/' || window.location.pathname === '';
    const needsFix = !hasHash && !pathIsRoot;

    if (needsFix) {
      const rest = window.location.pathname + window.location.search + window.location.hash;
      window.location.replace('/#' + rest);
    }
  }, []);
  return null;
}

/**
 * Puerta de acceso al Admin:
 * Si el token en la URL coincide con ADMIN_URL_TOKEN, renderiza AdminHome.
 * Si no coincide, redirige a inicio.
 */
function AdminGate() {
  const { token } = useParams();
  if (token === ADMIN_URL_TOKEN) {
    return <AdminHome />;
  }
  return <Navigate to="/" replace />;
}

export default function AppRouter() {
  return (
    <>
      <HashPathFix />

      <Routes>
        {/* =======================
            Rutas públicas
           ======================= */}
        <Route path="/" element={<App />} />

        {/* Público: producto, tienda, comprobante */}
        <Route path="/producto/:uuid" element={<PublicProducto />} />
        <Route path="/t/:slug" element={<SVKT />} />
        <Route path="/comprobante/:token" element={<Comprobante />} />

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
            Admin (oculto por token)
           ======================= */}
        {import.meta.env.DEV && <Route path="/admin" element={<AdminHome />} />}
        <Route path="/:token" element={<AdminGate />} />

        {/* =======================
            Vendedor (protegido y requiere vendedor activo)
           ======================= */}
        <Route
          path="/vendedor/perfil"
          element={
            <RequireAuth>
              <RequireVendor>
                <VendedorPerfil />
              </RequireVendor>
            </RequireAuth>
          }
        />
        <Route
          path="/vendedor/pagina"
          element={
            <RequireAuth>
              <RequireVendor>
                <Pagina />
              </RequireVendor>
            </RequireAuth>
          }
        />
        <Route
          path="/vendedor/configuracion"
          element={
            <RequireAuth>
              <RequireVendor>
                <ConfiguracionVista />
              </RequireVendor>
            </RequireAuth>
          }
        />
        <Route
          path="/vendedor/productos"
          element={
            <RequireAuth>
              <RequireVendor>
                <Productos />
              </RequireVendor>
            </RequireAuth>
          }
        />

        {/* === NUEVO: Finanzas (solo si vendedor activo) === */}
        <Route
          path="/vendedor/finanzas"
          element={
            <RequireAuth>
              <RequireVendor>
                <FinanzasInicio />
              </RequireVendor>
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

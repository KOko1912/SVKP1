// frontend/src/AppRouter.jsx
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import App from './App';

// ===============================
// Público
// ===============================
import PublicProducto from './pages/Public/PublicProducto';
import Comprobante from './pages/Public/Comprobante';
import SVKT from './pages/SVKT';

// ===============================
// Auth
// ===============================
import Login from './pages/Auth/Login';
import Registro from './pages/Auth/Registro';
import Olvide from './pages/Auth/Olvide';
import Reset from './pages/Auth/Reset';

// ===============================
// Usuario
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

// Finanzas
import FinanzasInicio from './pages/Vendedor/Finanzas/Inicio';
import Ingresos from './pages/Vendedor/Finanzas/Ingresos';

// ------------------------------------------------------------------
export const ADMIN_URL_TOKEN =
  (import.meta.env.VITE_ADMIN_URL_TOKEN && String(import.meta.env.VITE_ADMIN_URL_TOKEN)) ||
  '$2a$10$ONMIsejyxVNdsaEvZgJWE.Yo1YBSD.wyXPYOVZhOu3OncahAEYhXe';

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
  if (u.esVendedor === true) return true;
  if (u.isVendedor === true) return true;
  if (u.vendedor === true) return true;
  if (u.vendor === true) return true;
  if (u.tiendaId || (u.tienda && u.tienda.id)) return true;
  if (Array.isArray(u.roles) && u.roles.some(r => String(r).toUpperCase() === 'VENDEDOR')) return true;
  if (typeof u.role === 'string' && u.role.toUpperCase() === 'VENDEDOR') return true;
  return false;
};

const RequireAuth = ({ children }) => {
  const user = getUsuario();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const RequireVendor = ({ children }) => {
  const user = getUsuario();
  if (!user) return <Navigate to="/login" replace />;
  if (!hasVendorRole(user)) return <Navigate to="/usuario/home" replace />;
  return children;
};

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
        {/* Públicas */}
        <Route path="/" element={<App />} />
        <Route path="/producto/:uuid" element={<PublicProducto />} />
        <Route path="/t/:slug" element={<SVKT />} />
        <Route path="/comprobante/:token" element={<Comprobante />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/olvide" element={<Olvide />} />
        <Route path="/reset" element={<Reset />} />

        {/* Usuario */}
        <Route path="/usuario/home" element={<RequireAuth><HomeUsuario /></RequireAuth>} />
        <Route path="/usuario/compras" element={<RequireAuth><MisCompras /></RequireAuth>} />
        <Route path="/usuario/tiendas" element={<RequireAuth><TiendasSeguidas /></RequireAuth>} />
        <Route path="/usuario/configuracion" element={<RequireAuth><ConfiguracionUsuario /></RequireAuth>} />
        <Route path="/usuario/perfil" element={<RequireAuth><Perfil /></RequireAuth>} />
        <Route path="/usuario/producto/:id" element={<RequireAuth><DetalleProducto /></RequireAuth>} />

        {/* Admin */}
        {import.meta.env.DEV && <Route path="/admin" element={<AdminHome />} />}
        <Route path="/:token" element={<AdminGate />} />

        {/* Vendedor */}
        <Route path="/vendedor/perfil" element={<RequireAuth><RequireVendor><VendedorPerfil /></RequireVendor></RequireAuth>} />
        <Route path="/vendedor/pagina" element={<RequireAuth><RequireVendor><Pagina /></RequireVendor></RequireAuth>} />
        <Route path="/vendedor/configuracion" element={<RequireAuth><RequireVendor><ConfiguracionVista /></RequireVendor></RequireAuth>} />
        <Route path="/vendedor/productos" element={<RequireAuth><RequireVendor><Productos /></RequireVendor></RequireAuth>} />

        {/* Finanzas */}
        <Route path="/vendedor/finanzas" element={<RequireAuth><RequireVendor><FinanzasInicio /></RequireVendor></RequireAuth>} />
        <Route path="/vendedor/finanzas/ingresos" element={<RequireAuth><RequireVendor><Ingresos /></RequireVendor></RequireAuth>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/usuario/home" replace />} />
      </Routes>
    </>
  );
}

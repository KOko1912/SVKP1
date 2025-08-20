// frontend/src/AppRouter.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import App from './App';

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
// Admin / Vendedor (área protegida)
// ===============================
import AdminHome from './pages/Admin/Home';
import VendedorPerfil from './pages/Vendedor/Perfil';
import Pagina from './pages/Vendedor/Pagina';
import ConfiguracionVista from './pages/Vendedor/ConfiguracionVista';
import Productos from './pages/Vendedor/Productos';            // <-- NUEVO
// import ProductosNuevo from './pages/Vendedor/ProductosNuevo'; // <-- opcional, si lo crearás

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

/**
 * Protege una ruta verificando que exista "usuario" en localStorage.
 * Si no hay sesión, redirige a /login.
 */
const RequireAuth = ({ children }) => {
  const user = getUsuario();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

/**
 * (Opcional) Protege rutas SOLO para vendedores.
 * Si no es vendedor, redirige al home del usuario.
 * Úsalo cuando ya tengas el flag "vendedor" activo en el login.
 */
// const RequireSeller = ({ children }) => {
//   const user = getUsuario();
//   if (!user) return <Navigate to="/login" replace />;
//   const esVendedor = user?.vendedor === true || user?.usuario?.vendedor === true;
//   if (!esVendedor) return <Navigate to="/usuario/home" replace />;
//   return children;
// };

export default function AppRouter() {
  return (
    <Routes>
      {/* =======================
          Rutas públicas
      ======================== */}
      <Route path="/" element={<App />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/olvide" element={<Olvide />} />
      <Route path="/reset" element={<Reset />} />

      {/* =======================
          Rutas protegidas: Usuario
      ======================== */}
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
          Rutas protegidas: Admin
      ======================== */}
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminHome />
          </RequireAuth>
        }
      />

      {/* =======================
          Rutas protegidas: Vendedor
          (Si quieres forzar solo vendedores, envuelve con <RequireSeller>…</RequireSeller>)
      ======================== */}
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
      {/* Ruta opcional para crear producto nuevo */}
      {/* <Route
        path="/vendedor/productos/nuevo"
        element={
          <RequireAuth>
            <ProductosNuevo />
          </RequireAuth>
        }
      /> */}

      {/* =======================
          Fallback
      ======================== */}
      <Route path="*" element={<Navigate to="/usuario/home" replace />} />
    </Routes>
  );
}

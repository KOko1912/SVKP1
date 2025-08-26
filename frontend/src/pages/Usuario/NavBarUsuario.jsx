import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  FiHome, FiShoppingBag, FiHeart, FiSettings, FiUser, FiLogOut
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import './NavBarUsuario.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const toPublic = (u) => {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('/')) return `${API}${u}`;
  return u;
};

/**
 * NavBarUsuario
 * @param {object} props.contextStore  { slug, nombre, logoUrl } para mostrar chip de tienda actual
 */
export default function NavBarUsuario({ contextStore = null }) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState('');

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('usuario') || 'null'); } catch { return null; }
  }, []);
  const avatarUrl = toPublic(user?.fotoUrl);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const logout = () => {
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const goStore = () => {
    if (!contextStore?.slug) return;
    const path = `/t/${encodeURIComponent(contextStore.slug)}`;
    const useHash = window.location.hash.startsWith('#/');
    useHash ? (window.location.hash = path) : navigate(path);
  };

  const navItems = [
    { path: '/usuario/home',         icon: FiHome,        label: 'Home' },
    { path: '/usuario/compras',      icon: FiShoppingBag, label: 'Compras' },
    { path: '/usuario/tiendas',      icon: FiHeart,       label: 'Tiendas' },
    { path: '/usuario/configuracion',icon: FiSettings,    label: 'Config' },
    { path: '/usuario/perfil',       icon: FiUser,        label: 'Perfil' }
  ];

  // estilos inline para chip/avatar (evita editar CSS)
  const chipStyle = {
    display: 'flex', alignItems: 'center', gap: 8,
    border: '1px solid rgba(226,232,240,0.9)', background: 'rgba(255,255,255,0.8)',
    padding: '6px 10px', borderRadius: 999, cursor: 'pointer'
  };
  const chipLogo = { width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' };
  const avatarBtn = {
    width: 34, height: 34, borderRadius: '50%', overflow: 'hidden',
    display: 'grid', placeItems: 'center',
    background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(226,232,240,0.9)'
  };
  const avatarImg = { width: '100%', height: '100%', objectFit: 'cover' };

  return (
    <>
      {/* Desktop glass bar */}
      {!isMobile && (
        <motion.nav
          className="desk-glass-nav"
          initial={{ y: -18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45 }}
        >
          <div className="nav-inner">
            <div className="nav-center">
              <ul className="nav-links">
                {navItems.map((item) => (
                  <motion.li key={item.path} whileHover={{ y: -2 }}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) => isActive ? 'active' : ''}
                      onMouseEnter={() => setActiveTab(item.label)}
                      onMouseLeave={() => setActiveTab('')}
                    >
                      <item.icon size={20} />
                      <AnimatePresence>
                        {activeTab === item.label && (
                          <motion.span
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            className="nav-tooltip"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </NavLink>
                  </motion.li>
                ))}
              </ul>
            </div>

            <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {contextStore?.slug && (
                <button onClick={goStore} style={chipStyle} title="Ir a esta tienda">
                  {contextStore?.logoUrl ? (
                    <img src={toPublic(contextStore.logoUrl)} alt="" style={chipLogo} />
                  ) : (
                    <FiShoppingBag size={18} />
                  )}
                  <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {contextStore?.nombre || contextStore?.slug}
                  </span>
                </button>
              )}

              <button
                onClick={() => navigate('/usuario/perfil')}
                style={avatarBtn}
                title="Mi perfil"
              >
                {avatarUrl ? <img src={avatarUrl} alt="" style={avatarImg} /> : <FiUser size={18} />}
              </button>

              <motion.button
                className="logout-btn"
                onClick={logout}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiLogOut size={18} />
                <span>Salir</span>
              </motion.button>
            </div>
          </div>
        </motion.nav>
      )}

      {/* Mobile bottom bar */}
      {isMobile && (
        <motion.nav
          className="mobile-glass-nav"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45 }}
        >
          <ul className="mobile-links">
            {navItems.map((item) => (
              <motion.li key={item.path} whileTap={{ scale: 0.96 }}>
                <NavLink to={item.path} className={({ isActive }) => isActive ? 'active' : ''}>
                  <item.icon size={22} />
                  <span>{item.label}</span>
                </NavLink>
              </motion.li>
            ))}

            {/* Botón de tienda actual y avatar en móvil */}
            {contextStore?.slug && (
              <motion.li whileTap={{ scale: 0.96 }}>
                <button onClick={goStore} style={avatarBtn} title="Ir a esta tienda">
                  {contextStore?.logoUrl ? (
                    <img src={toPublic(contextStore.logoUrl)} alt="" style={avatarImg} />
                  ) : (
                    <FiShoppingBag size={18} />
                  )}
                </button>
              </motion.li>
            )}
            <motion.li whileTap={{ scale: 0.96 }}>
              <button
                onClick={() => navigate('/usuario/perfil')}
                style={avatarBtn}
                title="Mi perfil"
              >
                {avatarUrl ? <img src={avatarUrl} alt="" style={avatarImg} /> : <FiUser size={18} />}
              </button>
            </motion.li>
          </ul>
        </motion.nav>
      )}
    </>
  );
}

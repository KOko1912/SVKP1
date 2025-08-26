import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  FiHome, FiShoppingBag, FiHeart, FiSettings, FiUser
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import './NavBarUsuario.css';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const toPublic = (u) => {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('/')) return `${API}${u}`;
  return u;
};

/**
 * NavBarUsuario
 * @param {object|null} contextStore  { slug, nombre, logoUrl } para mostrar chip de tienda actual
 */
export default function NavBarUsuario({ contextStore = null }) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [activeTab, setActiveTab] = useState('');
  const [storeCtx, setStoreCtx] = useState(contextStore); // estado interno con fallback autodetección

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('usuario') || 'null'); } catch { return null; }
  }, []);
  const avatarUrl = toPublic(user?.fotoUrl);

  // Sync prop -> state
  useEffect(() => setStoreCtx(contextStore), [contextStore]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fallback: detectar slug en URL y cargar tienda pública si no nos pasaron contextStore
  useEffect(() => {
    if (storeCtx) return;
    const hashMode = window.location.hash.startsWith('#/');
    const path = hashMode ? window.location.hash.slice(2) : window.location.pathname.slice(1);
    const first = (path || '').split('/')[0];

    // evita páginas reservadas
    const reserved = new Set(['', 'usuario', 'login', 'registro', 'admin', 'producto', 'p', 'carrito']);
    if (!first || reserved.has(first)) return;

    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API}/api/tienda/public/${encodeURIComponent(first)}`);
        const d = await r.json().catch(() => null);
        if (!r.ok || !d) return;
        if (cancelled) return;
        setStoreCtx({ slug: d.slug, nombre: d.nombre, logoUrl: d.logoUrl });
      } catch { /* noop */ }
    })();
    return () => { cancelled = true; };
  }, [storeCtx]);

  const goStore = () => {
    if (!storeCtx?.slug) return;
    const path = `/${encodeURIComponent(storeCtx.slug)}`;
    const useHash = window.location.hash.startsWith('#/');
    if (useHash) window.location.hash = path;
    else navigate(path);
  };

  const isStoreActive = (() => {
    if (!storeCtx?.slug) return false;
    const current = window.location.hash.startsWith('#/')
      ? window.location.hash.slice(1) // incluye la barra inicial
      : window.location.pathname;
    const re = new RegExp(`^/${storeCtx.slug}(?:/|$)`, 'i');
    return re.test(current);
  })();

  const navItems = [
    { path: '/usuario/home',         icon: FiHome,        label: 'Home' },
    { path: '/usuario/compras',      icon: FiShoppingBag, label: 'Compras' },
    { path: '/usuario/tiendas',      icon: FiHeart,       label: 'Tiendas' },
    { path: '/usuario/configuracion',icon: FiSettings,    label: 'Config' },
    { path: '/usuario/perfil',       icon: FiUser,        label: 'Perfil' }
  ];

  // estilos inline
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

                {/* Icono de TIENDA ACTUAL, a la derecha de los íconos normales */}
                {storeCtx?.slug && (
                  <motion.li whileHover={{ y: -2 }}>
                    <button
                      type="button"
                      className={`icon-btn ${isStoreActive ? 'active' : ''}`}
                      onClick={goStore}
                      onMouseEnter={() => setActiveTab(storeCtx.nombre || storeCtx.slug)}
                      onMouseLeave={() => setActiveTab('')}
                      title={storeCtx.nombre || storeCtx.slug}
                    >
                      {storeCtx.logoUrl
                        ? <img src={toPublic(storeCtx.logoUrl)} alt="" className="icon-img" />
                        : <FiShoppingBag size={20} />
                      }
                      <AnimatePresence>
                        {activeTab === (storeCtx.nombre || storeCtx.slug) && (
                          <motion.span
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            className="nav-tooltip"
                          >
                            {storeCtx.nombre || storeCtx.slug}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  </motion.li>
                )}
              </ul>
            </div>

            <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* avatar (perfil) */}
              <button
                onClick={() => navigate('/usuario/perfil')}
                style={avatarBtn}
                title="Mi perfil"
              >
                {avatarUrl ? <img src={avatarUrl} alt="" style={avatarImg} /> : <FiUser size={18} />}
              </button>
              {/* ❌ Se elimina el botón de “Salir” del navbar */}
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

            {/* Botón de tienda actual en móvil */}
            {storeCtx?.slug && (
              <motion.li whileTap={{ scale: 0.96 }}>
                <button
                  onClick={goStore}
                  className={`mobile-store-btn ${isStoreActive ? 'active' : ''}`}
                  title={storeCtx.nombre || storeCtx.slug}
                >
                  {storeCtx.logoUrl
                    ? <img src={toPublic(storeCtx.logoUrl)} alt="" />
                    : <FiShoppingBag size={18} />
                  }
                </button>
              </motion.li>
            )}

            {/* Avatar */}
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

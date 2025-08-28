import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  FiShoppingBag, FiHeart, FiSettings, FiUser
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import './NavBarUsuario.css';

const API   = (import.meta.env.VITE_API_URL    || 'http://localhost:5000').replace(/\/$/, '');
const FILES = (import.meta.env.VITE_FILES_BASE || API).replace(/\/$/, '');

const toPublic = (u) => {
  if (!u) return '';
  const val = typeof u === 'string'
    ? u
    : (u.url || u.path || u.src || u.href || u.filepath || u.location || u.image || u.thumbnail || '');
  if (!val) return '';
  if (/^https?:\/\//i.test(val)) return val;
  const rel = val.startsWith('/') ? val : `/${val}`;
  return `${FILES}${rel}`;
};

/** Lee la tienda actual desde la URL (soporta HashRouter y BrowserRouter) */
function readPublicStoreKey(loc) {
  // Con HashRouter, location.pathname ya viene como "/t/slug"
  // pero para máxima compatibilidad revisamos también window.location.hash
  let path = loc?.pathname || window.location.pathname || '';
  if (!path || path === '/') {
    const h = window.location.hash || '';
    if (h.startsWith('#/')) path = h.slice(1); // "/t/slug"
  }
  const parts = String(path).split('/').filter(Boolean); // ["t","slug"] | ["s","uuid"] | ...

  if (parts[0] === 't' && parts[1]) return { type: 'slug', value: decodeURIComponent(parts[1]) };
  if (parts[0] === 's' && parts[1]) return { type: 'uuid', value: decodeURIComponent(parts[1]) };
  return null;
}

/**
 * NavBarUsuario
 * @param {object|null} contextStore  { slug, nombre, logoUrl } para mostrar chip de tienda actual
 */
export default function NavBarUsuario({ contextStore = null }) {
  const navigate  = useNavigate();
  const location  = useLocation();

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  );
  const [activeTab, setActiveTab] = useState('');
  const [storeCtx, setStoreCtx]   = useState(contextStore); // estado local (prop tiene prioridad)

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('usuario') || 'null'); } catch { return null; }
  }, []);
  const avatarUrl = toPublic(user?.fotoUrl);

  // Prop -> state
  useEffect(() => setStoreCtx(contextStore), [contextStore]);

  // Responsivo
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Autodetectar tienda pública desde la URL cuando no llega por props
  useEffect(() => {
    if (contextStore) return; // si te la pasan desde arriba, respetarla

    const key = readPublicStoreKey(location);
    if (!key) { setStoreCtx(null); return; } // evita GETs inválidos (/api/tienda/public/t)

    let cancelled = false;
    (async () => {
      try {
        const url = key.type === 'slug'
          ? `${API}/api/tienda/public/${encodeURIComponent(key.value)}`
          : `${API}/api/tienda/public/uuid/${encodeURIComponent(key.value)}`;

        const r  = await fetch(url);
        const tx = await r.text();
        let d = null; try { d = JSON.parse(tx); } catch {}
        if (!r.ok || !d) return;
        if (cancelled) return;

        setStoreCtx({
          slug: d.slug || key.value,
          nombre: d.nombre || d.titulo || key.value,
          logoUrl: (d.logo && d.logo.url) || d.logoUrl || ''
        });
      } catch {/* noop */}
    })();

    return () => { cancelled = true; };
  }, [location, contextStore]);

  // Ir a la tienda actual
  const goStore = () => {
    if (!storeCtx?.slug) return;
    navigate(`/t/${encodeURIComponent(storeCtx.slug)}`);
  };

  // ¿Estoy dentro de la tienda actual?
  const isStoreActive = useMemo(() => {
    if (!storeCtx?.slug) return false;
    const key = readPublicStoreKey(location);
    return key?.type === 'slug' && String(key.value).toLowerCase() === String(storeCtx.slug).toLowerCase();
  }, [location, storeCtx]);

  const navItems = [
    { path: '/usuario/tiendas',       icon: FiHeart,    label: 'Tiendas' },
    { path: '/usuario/configuracion', icon: FiSettings, label: 'Config'  },
    { path: '/usuario/perfil',        icon: FiUser,     label: 'Perfil'  }
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

                {/* Icono de TIENDA ACTUAL al final */}
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
              <button
                onClick={() => navigate('/usuario/perfil')}
                style={avatarBtn}
                title="Mi perfil"
              >
                {avatarUrl ? <img src={avatarUrl} alt="" style={avatarImg} /> : <FiUser size={18} />}
              </button>
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

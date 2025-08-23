// frontend/src/pages/Vendedor/Nabvendedor.jsx
import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FiSettings, FiUser, FiHome, FiEye, FiShoppingBag, FiLogOut, FiMenu, FiX
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import './Vendedor.css';

export default function Nabvendedor() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [menuOpen, setMenuOpen] = useState(false);

  // reduce motion
  const reduceMotion = useMemo(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false,
    []
  );

  // Mantener navbar sin superponer contenido en móvil (espaciados controlados por CSS y clases en <body>)
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setMenuOpen(false);
      document.body.classList.toggle('has-bottomnav', mobile); // añade padding-bottom = var(--bottom-nav-height)
      document.body.classList.toggle('has-topfixed', mobile);  // añade padding-top = var(--top-nav-height)
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const menuItems = [
    { path: '/vendedor/pagina', icon: <FiHome />, text: 'Mi Tienda' },
    { path: '/vendedor/productos', icon: <FiShoppingBag />, text: 'Productos' },
    { path: '/vendedor/perfil', icon: <FiUser />, text: 'Perfil' },
    { path: '/vendedor/configuracion', icon: <FiSettings />, text: 'Configuración' },
  ];

  // Variants (se desactivan si reduceMotion)
  const navVariants = reduceMotion
    ? {}
    : { hidden: { opacity: 0, y: -10 }, visible: { opacity: 1, y: 0, transition: { duration: .25, ease: 'easeOut' } } };
  const slideVariants = reduceMotion
    ? {}
    : { initial: { y: 80 }, animate: { y: 0, transition: { type: 'spring', stiffness: 280, damping: 26 } }, exit: { y: 80 } };

  /* ================= Desktop ================= */
  const Desktop = () => (
    <motion.nav
      className="vendor-navbar"
      initial={navVariants.hidden ? 'hidden' : false}
      animate={navVariants.visible ? 'visible' : false}
      variants={navVariants}
      role="navigation"
      aria-label="Navegación vendedor"
    >
      <div className="vendor-navbar__container">
        <button
          className="brand"
          onClick={() => navigate('/vendedor/pagina')}
          aria-label="Ir a Mi Tienda"
        >
          <span className="brand__logo">
            <img src="/SVKP.png" alt="SVKP" />
          </span>
          <span className="brand__name">Panel Vendedor</span>
        </button>

        <ul className="vendor-menu" role="menubar" aria-label="Secciones del vendedor">
          {menuItems.map(item => (
            <li key={item.path} role="none">
              <NavLink
                to={item.path}
                className={({ isActive }) => `vendor-link ${isActive ? 'is-active' : ''}`}
                role="menuitem"
              >
                <span className="vendor-link__icon">{item.icon}</span>
                <span className="vendor-link__label">{item.text}</span>
                <span className="vendor-link__underline" aria-hidden="true" />
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="vendor-actions">
          <button className="btn btn-ghost" onClick={() => navigate('/')} aria-label="Ver como cliente">
            <FiEye /> <span className="hide-sm">Ver como cliente</span>
          </button>
          <button className="btn btn-danger" onClick={handleLogout}>
            <FiLogOut /> <span className="hide-sm">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </motion.nav>
  );

  /* ================= Mobile ================= */
  const Mobile = () => (
    <>
      {/* Top bar fija (no tapa contenido gracias a body.has-topfixed) */}
      <nav className="vendor-topbar" role="navigation" aria-label="Barra superior vendedor">
        <button className="brand brand--compact" onClick={() => navigate('/vendedor/pagina')} aria-label="Ir a Mi Tienda">
          <span className="brand__logo brand__logo--sm">
            <img src="/SVKP.png" alt="SVKP" />
          </span>
          <span className="brand__name">Vendedor</span>
        </button>
        <button
          className="icon-btn"
          onClick={() => setMenuOpen(v => !v)}
          aria-expanded={menuOpen ? 'true' : 'false'}
          aria-controls="vendor-mobile-menu"
          aria-label="Abrir menú"
        >
          {menuOpen ? <FiX /> : <FiMenu />}
        </button>
      </nav>

      {/* Menú modal (sheet) */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="mobile-sheet__scrim"
            onClick={() => setMenuOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              id="vendor-mobile-menu"
              className="mobile-sheet"
              onClick={e => e.stopPropagation()}
              {...(!reduceMotion ? { initial: 'initial', animate: 'animate', exit: 'exit', variants: slideVariants } : {})}
              role="dialog"
              aria-modal="true"
              aria-label="Acciones de vendedor"
            >
              <button className="sheet-action" onClick={() => { navigate('/'); setMenuOpen(false); }}>
                <FiEye /> Ver como cliente
              </button>
              <button className="sheet-action sheet-action--danger" onClick={() => { handleLogout(); setMenuOpen(false); }}>
                <FiLogOut /> Cerrar sesión
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom nav fija (no tapa contenido gracias a body.has-bottomnav) */}
      <nav className="vendor-bottomnav" role="navigation" aria-label="Navegación inferior vendedor">
        {menuItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `bottom-link ${isActive ? 'is-active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            <span className="bottom-link__icon">{item.icon}</span>
            <span className="bottom-link__label">{item.text}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );

  return isMobile ? <Mobile /> : <Desktop />;
}

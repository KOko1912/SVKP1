// frontend/src/pages/Vendedor/Nabvendedor.jsx
import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FiSettings, FiUser, FiHome, FiEye, FiShoppingBag, FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import './Vendedor.css';

export default function Nabvendedor() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [menuOpen, setMenuOpen] = useState(false);

  // Colores de marca tomados del perfil (persistidos en localStorage)
  const [brandColors, setBrandColors] = useState({
    from: localStorage.getItem('brandFrom') || '#6d28d9',
    to: localStorage.getItem('brandTo') || '#c026d3',
    contrast: localStorage.getItem('brandContrast') || '#ffffff'
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setMenuOpen(false);
    };

    const handleStorageChange = () => {
      setBrandColors({
        from: localStorage.getItem('brandFrom') || '#6d28d9',
        to: localStorage.getItem('brandTo') || '#c026d3',
        contrast: localStorage.getItem('brandContrast') || '#ffffff'
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('storage', handleStorageChange);

    applyBrandColors(brandColors);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [brandColors]);

  const applyBrandColors = (colors) => {
    const root = document.documentElement;
    root.style.setProperty('--brand-from', colors.from);
    root.style.setProperty('--brand-to', colors.to);
    root.style.setProperty('--brand-contrast', colors.contrast);
    root.style.setProperty('--primary-color', colors.from);

    const rgb = hexToRgb(colors.from);
    if (rgb) root.style.setProperty('--primary-color-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);

    const hoverColor = adjustColor(colors.from, -20);
    root.style.setProperty('--primary-hover', hoverColor);
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1],16), g: parseInt(result[2],16), b: parseInt(result[3],16) } : null;
  };

  const adjustColor = (color, amount) =>
    '#' + color.replace(/^#/, '').replace(/../g, c => ('0' + Math.min(255, Math.max(0, parseInt(c,16) + amount)).toString(16)).slice(-2));

  const handleLogout = () => {
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  // Animaciones
  const navVariants = { hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0, transition: { duration: .5, ease: 'easeInOut' } } };
  const itemVariants = { hover: { scale: 1.05 }, tap: { scale: 0.95 } };

  const menuItems = [
    { path: '/vendedor/pagina', icon: <FiHome />, text: 'Mi Tienda' },
    { path: '/vendedor/productos', icon: <FiShoppingBag />, text: 'Productos' },
    { path: '/vendedor/perfil', icon: <FiUser />, text: 'Perfil' },
    { path: '/vendedor/configuracion', icon: <FiSettings />, text: 'Configuración' }
  ];

  // Estilos (usan variables del tema)
  const styles = {
    navbarDesktop: {
      backgroundColor: 'rgba(255, 255, 255, 0.97)',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.08)',
      padding: '0 2rem',
      height: '80px',
      display: 'flex',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
      borderRadius: '0 0 var(--border-radius) var(--border-radius)',
    },
    container: {
      width: '100%',
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    brandContainer: { display: 'flex', alignItems: 'center', cursor: 'pointer', marginRight: '3rem' },
    logoCircle: {
      width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    },
    brandLogo: { height: '32px', transition: 'all .3s ease' },
    menuDesktop: { display: 'flex', gap: '.5rem', flexGrow: 1 },
    linkDesktop: {
      display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
      color: 'var(--text-muted)', fontWeight: 500, height: '100%', position: 'relative'
    },
    linkContentDesktop: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '.75rem 1.5rem', borderRadius: 'var(--border-radius)', height: '100%' },
    activeLinkDesktop: { color: 'var(--primary-color)', fontWeight: 600 },
    actionsDesktop: { display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '2rem' },
    viewModeButton: {
      display: 'flex', alignItems: 'center', gap: '8px', padding: '.7rem 1.5rem', borderRadius: 'var(--border-radius)',
      backgroundColor: 'rgba(var(--primary-color-rgb), 0.1)', color: 'var(--primary-color)', border: 'none', cursor: 'pointer',
      fontWeight: 600, transition: 'all .3s ease', fontSize: '.9rem', boxShadow: '0 2px 8px rgba(var(--primary-color-rgb), 0.1)',
    },
    logoutButton: {
      display: 'flex', alignItems: 'center', gap: '8px', padding: '.7rem 1.5rem', borderRadius: 'var(--border-radius)',
      backgroundColor: 'var(--error-color)', color: 'var(--text-on-primary)', border: 'none', cursor: 'pointer',
      fontWeight: 600, transition: 'all .3s ease', fontSize: '.9rem', boxShadow: '0 2px 8px rgba(239,68,68,0.1)',
    },

    /* Mobile */
    navbarMobileTop: {
      backgroundColor: 'rgba(255, 255, 255, 0.97)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 30px rgba(0,0,0,0.08)',
      padding: '0 1rem', height: '60px', display: 'flex', alignItems: 'center', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      borderBottom: '1px solid rgba(0,0,0,0.05)'
    },
    containerMobile: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    brandContainerMobile: { display: 'flex', alignItems: 'center', cursor: 'pointer' },
    menuButton: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-on-light)', padding: '.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },

    navbarMobileBottom: {
      backgroundColor: 'rgba(255, 255, 255, 0.97)', backdropFilter: 'blur(8px)', boxShadow: '0 -4px 30px rgba(0,0,0,0.08)',
      padding: '.5rem 0', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999, borderTop: '1px solid rgba(0,0,0,0.05)'
    },
    menuMobile: { display: 'flex', justifyContent: 'space-around', alignItems: 'center', width: '100%' },
    linkMobile: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: 'var(--text-muted)', fontWeight: 500, padding: '.5rem', flex: 1 },
    linkContentMobile: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
    activeLinkMobile: { color: 'var(--primary-color)', fontWeight: 600 },
    linkIconMobile: { fontSize: '1.4rem' },
    linkTextMobile: { fontSize: '.7rem', fontWeight: 500 },

    mobileMenuOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,.5)', zIndex: 1001, display: 'flex', justifyContent: 'center', alignItems: 'flex-end' },
    mobileMenuContent: {
      width: '100%', backgroundColor: 'var(--bg-light)', borderTopLeftRadius: '20px', borderTopRightRadius: '20px',
      padding: '2rem 1.5rem', boxShadow: '0 -10px 30px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '1rem'
    },
    viewModeButtonMobile: {
      display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem', borderRadius: 'var(--border-radius)',
      backgroundColor: 'rgba(var(--primary-color-rgb), 0.1)', color: 'var(--primary-color)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '1rem', width: '100%'
    },
    logoutButtonMobile: {
      display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem', borderRadius: 'var(--border-radius)',
      backgroundColor: 'var(--error-color)', color: 'var(--text-on-primary)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '1rem', width: '100%'
    },

    linkIcon: { fontSize: '1.2rem', transition: 'all .3s ease' },
    linkText: { fontSize: '.8rem', transition: 'all .3s ease' },
    buttonIcon: { fontSize: '1.2rem' },
    buttonText: { fontSize: '.9rem' },
  };

  const renderDesktopNavbar = () => (
    <motion.nav initial="hidden" animate="visible" variants={navVariants} style={styles.navbarDesktop} className="vendor-navbar">
      <div style={styles.container}>
        <motion.div style={styles.brandContainer} onClick={() => navigate('/vendedor/pagina')} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
          <div style={styles.logoCircle}>
            <img src="/SVKP.png" alt="SVKP Logo" style={styles.brandLogo} />
          </div>
        </motion.div>

        <div style={styles.menuDesktop}>
          {menuItems.map((item) => (
            <NavLink key={item.path} to={item.path} style={({ isActive }) => ({ ...styles.linkDesktop, ...(isActive && styles.activeLinkDesktop) })}>
              <motion.div variants={itemVariants} whileHover="hover" whileTap="tap" style={styles.linkContentDesktop}>
                <span style={styles.linkIcon}>{item.icon}</span>
                <span style={styles.linkText}>{item.text}</span>
              </motion.div>
            </NavLink>
          ))}
        </div>

        <div style={styles.actionsDesktop}>
          <motion.button onClick={() => navigate('/')} style={styles.viewModeButton}
            whileHover={{ backgroundColor: 'rgba(var(--primary-color-rgb), 0.2)', boxShadow: '0 4px 14px -2px rgba(var(--primary-color-rgb), 0.3)' }}
            whileTap={{ scale: 0.95 }}>
            <FiEye style={styles.buttonIcon} />
            <span style={styles.buttonText}>Ver como cliente</span>
          </motion.button>

          <motion.button onClick={handleLogout} style={styles.logoutButton}
            whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.8)', boxShadow: '0 4px 14px -2px rgba(220,38,38,0.3)' }}
            whileTap={{ scale: 0.95 }}>
            <FiLogOut style={styles.buttonIcon} />
            <span style={styles.buttonText}>Cerrar sesión</span>
          </motion.button>
        </div>
      </div>
    </motion.nav>
  );

  const renderMobileNavbar = () => (
    <>
      <motion.nav initial="hidden" animate="visible" variants={navVariants} style={styles.navbarMobileTop}>
        <div style={styles.containerMobile}>
          <motion.div style={styles.brandContainerMobile} onClick={() => navigate('/vendedor/pagina')} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <div style={styles.logoCircle}>
              <img src="/SVKP.png" alt="SVKP Logo" style={styles.brandLogo} />
            </div>
          </motion.div>
          <motion.button onClick={() => setMenuOpen(!menuOpen)} style={styles.menuButton} whileTap={{ scale: 0.9 }}>
            {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </motion.button>
        </div>
      </motion.nav>

      <motion.nav style={styles.navbarMobileBottom} initial={{ y: 100 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
        <div style={styles.menuMobile}>
          {menuItems.map((item) => (
            <NavLink key={item.path} to={item.path}
              style={({ isActive }) => ({ ...styles.linkMobile, ...(isActive && styles.activeLinkMobile) })}
              onClick={() => setMenuOpen(false)}>
              <motion.div variants={itemVariants} whileTap="tap" style={styles.linkContentMobile}>
                <span style={styles.linkIconMobile}>{item.icon}</span>
                <span style={styles.linkTextMobile}>{item.text}</span>
              </motion.div>
            </NavLink>
          ))}
        </div>
      </motion.nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div style={styles.mobileMenuOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)}>
            <motion.div style={styles.mobileMenuContent} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} onClick={(e) => e.stopPropagation()}>
              <motion.button onClick={() => { navigate('/'); setMenuOpen(false); }} style={styles.viewModeButtonMobile}
                whileHover={{ backgroundColor: 'rgba(var(--primary-color-rgb), 0.2)' }} whileTap={{ scale: 0.95 }}>
                <FiEye style={styles.buttonIcon} />
                <span>Ver como cliente</span>
              </motion.button>
              <motion.button onClick={() => { handleLogout(); setMenuOpen(false); }} style={styles.logoutButtonMobile}
                whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.8)' }} whileTap={{ scale: 0.95 }}>
                <FiLogOut style={styles.buttonIcon} />
                <span>Cerrar sesión</span>
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return isMobile ? renderMobileNavbar() : renderDesktopNavbar();
}

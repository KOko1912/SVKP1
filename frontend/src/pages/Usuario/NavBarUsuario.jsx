import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  FiHome, FiShoppingBag, FiHeart, FiSettings, FiUser, FiLogOut
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import './NavBarUsuario.css';

export default function NavBarUsuario() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const logout = () => {
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const navItems = [
    { path: '/usuario/home', icon: FiHome, label: 'Home' },
    { path: '/usuario/compras', icon: FiShoppingBag, label: 'Compras' },
    { path: '/usuario/tiendas', icon: FiHeart, label: 'Tiendas' },
    { path: '/usuario/configuracion', icon: FiSettings, label: 'Config' },
    { path: '/usuario/perfil', icon: FiUser, label: 'Perfil' }
  ];

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

            <div className="nav-actions">
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
          </ul>
        </motion.nav>
      )}
    </>
  );
}

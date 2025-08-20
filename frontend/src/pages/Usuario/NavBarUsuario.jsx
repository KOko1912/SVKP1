import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { 
  FiHome, 
  FiShoppingBag, 
  FiHeart, 
  FiSettings, 
  FiUser,
  FiLogOut,
  FiSun,
  FiMoon
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import './NavBarUsuario.css';

export default function NavBarUsuario() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('');

  // Detectar cambio de tamaño y modo oscuro
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setDarkMode(mediaQuery.matches);
    mediaQuery.addEventListener('change', (e) => setDarkMode(e.matches));
    
    return () => {
      window.removeEventListener('resize', handleResize);
      mediaQuery.removeEventListener('change', (e) => setDarkMode(e.matches));
    };
  }, []);

  const logout = () => {
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const toggleTheme = () => setDarkMode(!darkMode);

  const navItems = [
    { path: '/usuario/home', icon: FiHome, label: 'Home' },
    { path: '/usuario/compras', icon: FiShoppingBag, label: 'Compras' },
    { path: '/usuario/tiendas', icon: FiHeart, label: 'Tiendas' },
    { path: '/usuario/configuracion', icon: FiSettings, label: 'Config' },
    { path: '/usuario/perfil', icon: FiUser, label: 'Perfil' }
  ];

  return (
    <>
      {/* Barra Superior para Desktop */}
      {!isMobile && (
        <motion.nav 
          className={`desktop-nav ${darkMode ? 'dark' : 'light'}`}
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="nav-logo-container">
            <img 
              src="/SVKP.png" 
              alt="SystemVkode" 
              className="nav-logo"
            />
          </div>

          <div className="nav-center">
            <ul className="nav-links">
              {navItems.map((item) => (
                <motion.li 
                  key={item.path}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <NavLink 
                    to={item.path}
                    className={({ isActive }) => 
                      isActive ? 'active' : ''
                    }
                    onMouseEnter={() => setActiveTab(item.label)}
                    onMouseLeave={() => setActiveTab('')}
                  >
                    <item.icon size={20} />
                    <AnimatePresence>
                      {activeTab === item.label && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
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
              onClick={toggleTheme}
              className="theme-toggle"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {darkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
            </motion.button>
            
            <motion.button
              className="logout-btn"
              onClick={logout}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiLogOut size={20} />
              <span>Cerrar sesión</span>
            </motion.button>
          </div>
        </motion.nav>
      )}

      {/* Barra Inferior para Mobile */}
      {isMobile && (
        <motion.nav
          className={`mobile-nav ${darkMode ? 'dark' : 'light'}`}
          initial={{ y: 50 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ul className="mobile-nav-links">
            {navItems.map((item) => (
              <motion.li
                key={item.path}
                whileTap={{ scale: 0.9 }}
              >
                <NavLink
                  to={item.path}
                  className={({ isActive }) => 
                    isActive ? 'active' : ''
                  }
                >
                  <item.icon size={24} />
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
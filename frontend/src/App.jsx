// E:\SVKP1\frontend\src\App.jsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  FiArrowRight,
  FiCheck,
  FiMessageSquare,
  FiBarChart2,
  FiSettings,
  FiX,
  FiMenu,
  FiShoppingCart,
  FiDollarSign,
  FiUsers,
  FiLayers
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import './App.css';

const USE_LOADING = true; // ponlo en false si quieres quitar la animación

// Logo reutilizable
const SystemVkodeLogo = ({ size = 'medium' }) => {
  const sizes = { small: '32px', medium: '48px', large: '64px' };
  return (
    <img
      src="/SVKP.png"
      alt="SystemVkode Logo"
      className="logo-img"
      style={{ height: sizes[size], width: 'auto', transition: 'height 0.3s ease' }}
    />
  );
};

/* ===========================
   Loading Screen (PORTAL + estilos inline)
   No usa la clase .loading-screen para evitar interferencias.
   =========================== */
const LoadingScreenInner = () => {
  const overlayStyle = {
    position: 'fixed',
    top: 0, right: 0, bottom: 0, left: 0, // = inset: 0
    zIndex: 2147483647,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    // Fondo sólido y opaco (sin cortes)
    background: 'linear-gradient(135deg, #0A0A0F 0%, #1A1A2E 50%, #0F0F13 100%)',
    color: '#fff',
    isolation: 'isolate',
  };

  return (
    <div style={overlayStyle}>
      <div className="loading-content">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <SystemVkodeLogo size="large" />
        </motion.div>

        <motion.h1
          className="loading-title"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
        >
          SystemVkode
        </motion.h1>

        <motion.p
          className="loading-subtitle"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
        >
          Preparando tu experiencia de comercio inteligente
        </motion.p>

        <div className="loading-progress">
          <motion.div
            className="loading-progress-bar"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.5, ease: 'easeInOut' }}
          />
        </div>

        <div className="loading-dots">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="loading-dot"
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6], y: [0, -8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const LoadingScreen = () =>
  (typeof document !== 'undefined' ? createPortal(<LoadingScreenInner />, document.body) : null);

// Tarjeta de Característica
const FeatureCard = ({ icon, title, description, index }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="feature-card"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px' }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -5 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <motion.div
        className="feature-icon-container"
        animate={{ scale: isHovered ? 1.1 : 1, rotate: isHovered ? 5 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="feature-icon-background">{icon}</div>
      </motion.div>

      <h3 className="feature-title">{title}</h3>
      <p className="feature-description">{description}</p>

      <motion.div
        className="feature-underline"
        initial={{ width: 0 }}
        animate={{ width: isHovered ? '100%' : 0 }}
        transition={{ duration: 0.4 }}
      />
    </motion.div>
  );
};

// Navegación
const Navigation = ({ isMenuOpen, setIsMenuOpen, navigate }) => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <SystemVkodeLogo />
          <span>SystemVkode</span>
        </div>

        <div className={`navbar-links ${isMenuOpen ? 'active' : ''}`}>
          <a href="#features" onClick={() => setIsMenuOpen(false)}>Características</a>
          <a href="#pricing" onClick={() => setIsMenuOpen(false)}>Precios</a>
          <a href="#contact" onClick={() => setIsMenuOpen(false)}>Contacto</a>
          <button
            className="navbar-cta"
            onClick={() => { setIsMenuOpen(false); navigate('/login'); }}
          >
            Iniciar Demo <FiArrowRight />
          </button>
        </div>

        <button
          className="navbar-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>
    </nav>
  );
};

// Hero
const HeroSection = ({ navigate }) => {
  return (
    <section className="hero">
      <div className="hero-background"></div>

      <div className="hero-container">
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="hero-badge"
          >
            <span>NUEVO</span> Plataforma 3.0 Disponible
          </motion.div>

          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            Transforma tu Negocio con <span>Comercio Inteligente</span>
          </motion.h1>

          <motion.p
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            Con SystemVkode, convierte visitantes en clientes leales con nuestra solución todo-en-uno diseñada específicamente para emprendedores digitales que buscan escalar su presencia online.
          </motion.p>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.8 }}
            className="hero-cta"
          >
            <button className="primary-button" onClick={() => navigate('/login')}>
              Comenzar Ahora <FiArrowRight />
            </button>
            <button
              className="secondary-button"
              onClick={() => { document.getElementById('features').scrollIntoView({ behavior: 'smooth' }); }}
            >
              Ver Características
            </button>
          </motion.div>
        </motion.div>

        <motion.div
          className="hero-image"
          initial={{ opacity: 0, scale: 0.9, x: 50 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <div className="dashboard-mockup">
            <div className="mockup-header">
              <div className="mockup-dots"><span></span><span></span><span></span></div>
            </div>
            <div className="mockup-content">
              <div className="mockup-sidebar"></div>
              <div className="mockup-main">
                <div className="mockup-chart"></div>
                <div className="mockup-stats"><div></div><div></div><div></div></div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// Features
const FeaturesSection = () => {
  const features = [
    { icon: <FiSettings size={24} />, title: 'Personalización Total', description: 'Control absoluto sobre cada aspecto de tu tienda virtual con nuestro editor intuitivo. Cambia colores, imágenes y posiciones de productos con arrastrar y soltar.' },
    { icon: <FiMessageSquare size={24} />, title: 'WhatsApp Integrado', description: 'Conecta directamente con tus clientes mediante integración nativa con WhatsApp Business. Recibe notificaciones y gestiona conversaciones desde un solo lugar.' },
    { icon: <FiBarChart2 size={24} />, title: 'Analytics Avanzados', description: 'Toma decisiones basadas en datos en tiempo real con nuestro dashboard de analytics. Monitorea ventas, tráfico y comportamiento de clientes.' },
    { icon: <FiShoppingCart size={24} />, title: 'Gestión de Productos', description: 'Administra tu inventario con facilidad. Destaca productos importantes y reorganiza tu catálogo con simples movimientos táctiles.' },
    { icon: <FiDollarSign size={24} />, title: 'Finanzas Completas', description: 'Sistema integral de gestión financiera con reportes detallados de ingresos, gastos y proyecciones de crecimiento para tu negocio.' },
    { icon: <FiUsers size={24} />, title: 'Multiplan Flexible', description: 'El usuario elige: comprador o vendedor. Planes desde $356 MXN mensuales con todas las funcionalidades profesionales para vender en línea.' }
  ];

  return (
    <section id="features" className="features-section">
      <div className="section-container">
        <div className="section-header">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            Potencia tu Negocio Digital
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}>
            Todo lo que necesitas para vender más en un solo lugar, diseñado específicamente para el mercado mexicano y con soporte técnico especializado.
          </motion.p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <FeatureCard key={index} icon={feature.icon} title={feature.title} description={feature.description} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

// Propuesta de Valor
const ValueSection = () => {
  return (
    <section className="value-section">
      <div className="section-container">
        <div className="value-content">
          <div className="value-text">
            <motion.h2 initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              La Plataforma Más Completa para Emprendedores Digitales
            </motion.h2>

            <motion.ul initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 }}>
              <li><FiCheck /> Implementación en 72 horas con migración de datos incluida</li>
              <li><FiCheck /> Soporte técnico especializado 24/7 en español</li>
              <li><FiCheck /> Escalabilidad garantizada con infraestructura en la nube</li>
              <li><FiCheck /> Pagos seguros con certificación PCI DSS y conexión a Stripe</li>
              <li><FiCheck /> Dominio personalizado y certificado SSL incluido</li>
              <li><FiCheck /> Reportes automáticos de ventas e impuestos</li>
            </motion.ul>

            <motion.div className="value-cta" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.6 }}>
              <button className="primary-button">Comenzar Ahora <FiArrowRight /></button>
            </motion.div>
          </div>

          <motion.div className="value-image" initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.4 }}>
            <div className="value-image-content">
              <FiLayers size={48} />
              <p>Interfaz intuitiva diseñada para resultados</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// Footer
const Footer = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="section-container">
        <div className="footer-content">
          <div className="footer-brand">
            <SystemVkodeLogo />
            <span>SystemVkode</span>
            <p>La solución profesional para comercio digital con enfoque en el mercado mexicano</p>
          </div>

          <div className="footer-links">
            <div className="footer-column">
              <h3>Producto</h3>
              <a href="#features">Características</a>
              <a href="#pricing">Planes y Precios</a>
              <a href="#">Demostración</a>
              <a href="#">Casos de Éxito</a>
            </div>

            <div className="footer-column">
              <h3>Recursos</h3>
              <a href="#">Centro de Ayuda</a>
              <a href="#">Blog</a>
              <a href="#">Tutoriales</a>
              <a href="#">Webinars</a>
            </div>

            <div className="footer-column">
              <h3>Empresa</h3>
              <a href="#">Sobre Nosotros</a>
              <a href="#">Trabaja con Nosotros</a>
              <a href="#">Partners</a>
              <a href="#">Prensa</a>
            </div>

            <div className="footer-column">
              <h3>Legal</h3>
              <a href="#">Términos de Servicio</a>
              <a href="#">Política de Privacidad</a>
              <a href="#">Seguridad</a>
              <a href="#">Contrato</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {currentYear} SystemVkode. Todos los derechos reservados. VentasVkode es una marca registrada.</p>
          <div className="footer-social">
            <a href="#" aria-label="Facebook">FB</a>
            <a href="#" aria-label="Instagram">IG</a>
            <a href="#" aria-label="Twitter">TW</a>
            <a href="#" aria-label="LinkedIn">LI</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

// App principal
function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(USE_LOADING);
  const navigate = useNavigate();

  useEffect(() => {
    if (!USE_LOADING) return;
    const timer = setTimeout(() => {
      setIsLoading(false);
      document.body.style.overflow = 'auto';
    }, 3000);

    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Cerrar menú al cambiar tamaño
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMenuOpen) setIsMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMenuOpen]);

  if (isLoading) return <LoadingScreen />;

  return (
    <motion.div
      className="app"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <Navigation isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} navigate={navigate} />
      <HeroSection navigate={navigate} />
      <FeaturesSection />
      <ValueSection />
      <Footer />
    </motion.div>
  );
}

export default App;

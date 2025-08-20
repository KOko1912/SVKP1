import { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import {
  FiArrowRight,
  FiCheck,
  FiMessageSquare,
  FiBarChart2,
  FiSettings
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import './App.css';

const SystemVkodeLogo = () => (
  <img 
    src="/SVKP.png" 
    alt="SystemVkode Logo" 
    className="logo-img"
    style={{ height: '48px', width: 'auto' }}
  />
);

const FeatureCard = ({ icon, title, description, index }) => {
  const controls = useAnimation();

  return (
    <motion.div
      className="feature-card"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: index * 0.15, duration: 0.6 }}
      whileHover={{ y: -10 }}
      onHoverStart={() => controls.start("hover")}
      onHoverEnd={() => controls.start("initial")}
    >
      <motion.div className="feature-icon-container">
        <motion.div
          className="feature-icon-background"
          variants={{
            initial: { scale: 1 },
            hover: { scale: 1.1 }
          }}
          animate={controls}
        >
          {icon}
        </motion.div>
      </motion.div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-description">{description}</p>
      <motion.div
        className="feature-underline"
        variants={{
          initial: { width: 0 },
          hover: { width: "100%" }
        }}
        animate={controls}
        transition={{ duration: 0.4 }}
      />
    </motion.div>
  );
};

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const controls = useAnimation();
  const navigate = useNavigate(); // 👈 Para redireccionar

  useEffect(() => {
    controls.start("visible");
  }, [controls]);

  return (
    <div className="app">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <SystemVkodeLogo />
            <span>SystemVkode</span>
          </div>
          <div className={`navbar-links ${isMenuOpen ? 'active' : ''}`}>
            <a href="#features">Características</a>
            <a href="#pricing">Precios</a>
            <a href="#contact">Contacto</a>
            <button className="navbar-cta" onClick={() => navigate('/login')}>
              Iniciar Demo <FiArrowRight />
            </button>
          </div>
          <button
            className="navbar-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <motion.div
          className="hero-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="hero-badge"
          >
            <span>NUEVO</span> Plataforma 3.0 lanzada
          </motion.div>
          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Software de Comercio <span>Inteligente</span> para Emprendedores
          </motion.h1>
          <motion.p
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            Convierte visitantes en clientes con nuestra solución todo-en-uno diseñada para escalar tu negocio digital.
          </motion.p>
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="hero-cta"
          >
            <button
              className="primary-button"
              onClick={() => navigate('/login')}
            >
              Comenzar ahora <FiArrowRight />
            </button>
          </motion.div>
        </motion.div>
        <motion.div
          className="hero-image"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <div className="dashboard-mockup">
            {/* Imagen del dashboard */}
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2>Potencia tu negocio</h2>
          <p>Todo lo que necesitas para vender más en un solo lugar</p>
        </div>
        <div className="features-grid">
          <FeatureCard
            icon={<FiSettings size={24} />}
            title="Personalización Total"
            description="Control absoluto sobre cada aspecto de tu tienda virtual"
            index={0}
          />
          <FeatureCard
            icon={<FiMessageSquare size={24} />}
            title="WhatsApp Integrado"
            description="Ventas directas con integración nativa a WhatsApp Business"
            index={1}
          />
          <FeatureCard
            icon={<FiBarChart2 size={24} />}
            title="Analytics Avanzados"
            description="Toma decisiones basadas en datos en tiempo real"
            index={2}
          />
        </div>
      </section>

      {/* Value Proposition */}
      <section className="value-section">
        <div className="value-content">
          <div className="value-text">
            <h2>La plataforma más completa para emprendedores digitales</h2>
            <ul>
              <li><FiCheck /> Implementación en 72 horas</li>
              <li><FiCheck /> Soporte técnico 24/7</li>
              <li><FiCheck /> Escalabilidad garantizada</li>
              <li><FiCheck /> Pagos seguros PCI DSS</li>
            </ul>
          </div>
          <div className="value-image">
            {/* Imagen de valor */}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <SystemVkodeLogo />
            <span>SystemVkode</span>
            <p>La solución profesional para comercio digital</p>
          </div>
          <div className="footer-links">
            <div>
              <h3>Producto</h3>
              <a href="#features">Características</a>
              <a href="#pricing">Precios</a>
              <a href="#">Demostración</a>
            </div>
            <div>
              <h3>Empresa</h3>
              <a href="#">Sobre nosotros</a>
              <a href="#">Blog</a>
              <a href="#">Carreras</a>
            </div>
            <div>
              <h3>Legal</h3>
              <a href="#">Privacidad</a>
              <a href="#">Términos</a>
              <a href="#">Seguridad</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} SystemVkode. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;

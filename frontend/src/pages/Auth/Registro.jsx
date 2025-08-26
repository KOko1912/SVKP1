// E:\SVKP1\frontend\src\pages\Auth\Registro.jsx
import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiUser, FiLock, FiPhone, FiMail, FiCheck } from 'react-icons/fi';

function Registro() {
  const navigate = useNavigate();
  const location = useLocation();
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [confirmarContraseña, setConfirmarContraseña] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [errores, setErrores] = useState({});

  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es obligatorio';
    } else if (nombre.trim().length < 2) {
      nuevosErrores.nombre = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!telefono.trim()) {
      nuevosErrores.telefono = 'El teléfono es obligatorio';
    } else if (!/^\d{10}$/.test(telefono)) {
      nuevosErrores.telefono = 'El teléfono debe tener 10 dígitos';
    }

    if (!contraseña) {
      nuevosErrores.contraseña = 'La contraseña es obligatoria';
    } else if (contraseña.length < 6) {
      nuevosErrores.contraseña = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (contraseña !== confirmarContraseña) {
      nuevosErrores.confirmarContraseña = 'Las contraseñas no coinciden';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    
    if (!validarFormulario()) return;

    try {
      setCargando(true);
      const resp = await fetch(`${API}/api/usuarios/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nombre: nombre.trim(), 
          telefono: telefono.trim(), 
          contraseña 
        })
      });

      const data = await resp.json().catch(() => ({}));
      
      if (!resp.ok) {
        throw new Error(data?.error || data?.message || `Error ${resp.status}`);
      }

      setMensaje('¡Registro exitoso! Redirigiendo…');
      setTimeout(() => navigate('/login', { 
        state: { from: location.state?.from },
        replace: true 
      }), 1500);
    } catch (err) {
      setMensaje(err.message || 'Error al registrar usuario');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-background"></div>
      
      <div className="auth-container">
        <button 
          onClick={() => navigate(-1)} 
          className="auth-back-button"
        >
          <FiArrowLeft /> Volver
        </button>

        <motion.div 
          className="auth-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="auth-header">
            <div className="auth-logo">
              <img src="/SVKP.png" alt="SystemVkode" />
            </div>
            <h2>Crear cuenta</h2>
            <p>Completa tus datos para crear una nueva cuenta</p>
          </div>

          {mensaje && (
            <motion.div 
              className={`auth-message ${mensaje.includes('éxito') ? 'auth-success' : 'auth-error'}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
              {mensaje.includes('éxito') ? '✅' : '⚠️'} {mensaje}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="nombre" className="form-label">
                <FiUser /> Nombre completo
              </label>
              <div className="input-container">
                <input
                  id="nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre completo"
                  disabled={cargando}
                  className={errores.nombre ? 'form-input error' : 'form-input'}
                />
              </div>
              {errores.nombre && <span className="error-text">{errores.nombre}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="telefono" className="form-label">
                <FiPhone /> Número de teléfono
              </label>
              <div className="input-container">
                <input
                  id="telefono"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                  placeholder="8440000000"
                  disabled={cargando}
                  maxLength="10"
                  className={errores.telefono ? 'form-input error' : 'form-input'}
                />
              </div>
              {errores.telefono && <span className="error-text">{errores.telefono}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="contraseña" className="form-label">
                <FiLock /> Contraseña
              </label>
              <div className="input-container">
                <input
                  id="contraseña"
                  type="password"
                  value={contraseña}
                  onChange={(e) => setContraseña(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  disabled={cargando}
                  className={errores.contraseña ? 'form-input error' : 'form-input'}
                />
              </div>
              {errores.contraseña && <span className="error-text">{errores.contraseña}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmarContraseña" className="form-label">
                <FiCheck /> Confirmar contraseña
              </label>
              <div className="input-container">
                <input
                  id="confirmarContraseña"
                  type="password"
                  value={confirmarContraseña}
                  onChange={(e) => setConfirmarContraseña(e.target.value)}
                  placeholder="Repite tu contraseña"
                  disabled={cargando}
                  className={errores.confirmarContraseña ? 'form-input error' : 'form-input'}
                />
              </div>
              {errores.confirmarContraseña && (
                <span className="error-text">{errores.confirmarContraseña}</span>
              )}
            </div>

            <button 
              type="submit" 
              className="auth-submit-button primary-button" 
              disabled={cargando}
            >
              {cargando ? (
                <>
                  <span className="button-spinner"></span> Creando cuenta…
                </>
              ) : (
                <>
                  <FiUser /> Crear cuenta
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>¿Ya tienes una cuenta?</p>
            <Link 
              to="/login" 
              className="auth-link-button secondary-button"
              state={{ from: location.state?.from }}
            >
              Iniciar sesión
            </Link>
          </div>
        </motion.div>

        <div className="auth-copyright">
          <p>© {new Date().getFullYear()} SystemVkode. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
}

export default Registro;
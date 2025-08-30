// E:\SVKP1\frontend\src\pages\Auth\Login.jsx
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiEye, FiEyeOff, FiArrowLeft, FiUser, FiLock, FiPhone } from 'react-icons/fi';
import * as API from '../../lib/api.js';
import './Auth.css';

export default function Login() {
  const [telefono, setTelefono] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/usuario/perfil';

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setLoading(true);

    try {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      localStorage.removeItem('auth');
      localStorage.removeItem('user');

      await API.apiLogin({ telefono: telefono.trim(), password: contrasena });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const msg = err?.message || 'Error al iniciar sesión. Verifica tus credenciales.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-background" />

      <div className="auth-container">
        {/* Rail superior alineado con el ancho del card */}
        <div className="auth-header-rail">
          <button
            onClick={() => navigate('/')}
            className="auth-back-button"
          >
            <FiArrowLeft /> Volver al inicio
          </button>
        </div>

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
            <h2>Bienvenido</h2>
            <p>Ingresa tus credenciales para acceder a tu cuenta</p>
          </div>

          {error && (
            <motion.div
              className="auth-error-message"
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
              <span aria-hidden="true">⚠️</span> {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="auth-form" noValidate>
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
                  autoComplete="username"
                  placeholder="8440000000"
                  required
                  disabled={loading}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                <FiLock /> Contraseña
              </label>
              <div className="input-container password-container">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  autoComplete="current-password"
                  placeholder="•••••••••"
                  required
                  disabled={loading}
                  className="form-input"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  disabled={loading}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="form-options">
              <button
                type="button"
                onClick={() => navigate('/olvide')}
                className="text-link"
                disabled={loading}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button
              type="submit"
              className="auth-submit-button primary-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="button-spinner"></span> Ingresando…
                </>
              ) : (
                <>
                  <FiUser /> Iniciar sesión
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>¿No tienes una cuenta?</p>
            <Link
              to="/registro"
              className="auth-link-button secondary-button"
              state={{ from: location.state?.from }}
            >
              Crear cuenta
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

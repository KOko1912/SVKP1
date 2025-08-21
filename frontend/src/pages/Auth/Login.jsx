// src/pages/Auth/Login.jsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as API from '../../lib/api.js';
import './Auth.css';

export default function Login() {
  const [telefono, setTelefono]   = useState('');
  const [contrasena, setContrasena] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const navigate   = useNavigate();
  const location   = useLocation();
  const redirectTo = location.state?.from || '/usuario/perfil';

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setLoading(true);

    try {
      // limpiar restos de sesiones anteriores para evitar "undefined" en storage
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      localStorage.removeItem('auth');
      localStorage.removeItem('user');

      // login (api.ts guarda token/usuario de forma segura)
      await API.apiLogin({ telefono: telefono.trim(), password: contrasena });

      // redirigir
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const msg = err?.message || 'Error al iniciar sesión';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h2>Bienvenido de nuevo</h2>
        <p>Ingresa tus credenciales para acceder a tu cuenta</p>
      </div>

      {error && <div className="auth-error-message">⚠️ {error}</div>}

      <form onSubmit={handleLogin} className="auth-form">
        <div className="form-group">
          <label htmlFor="telefono">Teléfono</label>
          <input
            id="telefono"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            autoComplete="username"
            placeholder="8440000000"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Contraseña</label>
          <div className="password-input">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              autoComplete="current-password"
              placeholder="•••••••••"
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              👁️
            </button>
          </div>
        </div>

        <div className="forgot-password">
          <button
            type="button"
            onClick={() => navigate('/olvide')}
            className="text-button"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" /> Ingresando…
            </>
          ) : (
            'Iniciar sesión'
          )}
        </button>
      </form>

      <div className="auth-footer">
        <p>¿No tienes una cuenta?</p>
        <button onClick={() => navigate('/registro')} className="secondary-button">
          Crear cuenta
        </button>
      </div>
    </div>
  );
}

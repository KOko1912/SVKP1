import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Login() {
  const [telefono, setTelefono] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono, contraseña }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Error al iniciar sesión');
      }

      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      navigate('/usuario/perfil');
    } catch (err) {
      setError(err.message);
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
      
      {error && <div className="auth-error-message">{error}</div>}
      
      <form onSubmit={handleLogin} className="auth-form">
        <div className="form-group">
          <label htmlFor="telefono">Teléfono</label>
          <input
            id="telefono"
            type="text"
            placeholder="Ingresa tu número telefónico"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="contraseña">Contraseña</label>
          <div className="password-input">
            <input
              id="contraseña"
              type={showPassword ? "text" : "password"}
              placeholder="Ingresa tu contraseña"
              value={contraseña}
              onChange={(e) => setContraseña(e.target.value)}
              required
            />
            <button 
              type="button" 
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <i className="eye-icon">👁️</i>
              ) : (
                <i className="eye-icon">👁️</i>
              )}
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

        <button 
          type="submit" 
          className="primary-button" 
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Ingresando...
            </>
          ) : (
            'Iniciar sesión'
          )}
        </button>
      </form>

      <div className="auth-footer">
        <p>¿No tienes una cuenta?</p>
        <button 
          onClick={() => navigate('/registro')} 
          className="secondary-button"
        >
          Crear cuenta
        </button>
      </div>
    </div>
  );
}

export default Login;
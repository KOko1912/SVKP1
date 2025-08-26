// E:\SVKP1\frontend\src\pages\Auth\Olvide.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPhone } from 'react-icons/fi';
import './Auth.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Olvide() {
  const navigate = useNavigate();
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [token, setToken] = useState('');

  const solicitar = async (e) => {
    e.preventDefault();
    setMsg('');
    setToken('');
    if (!telefono.trim()) {
      setMsg('Ingresa tu teléfono.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/usuarios/solicitar-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono: telefono.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo generar el token');

      if (data?.token) {
        setToken(data.token);
        setMsg('Token generado. Úsalo en los próximos 15 minutos.');
      } else {
        setMsg(data?.mensaje || 'Si el usuario existe, se generó un token.');
      }
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setMsg('Token copiado al portapapeles.');
    } catch {
      setMsg('No se pudo copiar.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-background"></div>

      <div className="auth-container">
        <button onClick={() => navigate(-1)} className="auth-back-button">
          <FiArrowLeft /> Volver
        </button>

        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <img src="/SVKP.png" alt="SystemVkode" />
            </div>
            <h2>Recuperar contraseña</h2>
            <p>Ingresa tu número de teléfono para generar un token de restablecimiento</p>
          </div>

          <form className="auth-form" onSubmit={solicitar}>
            <div className="form-group">
              <label htmlFor="telefono" className="form-label">
                <FiPhone /> Número de teléfono
              </label>
              <div className="input-container">
                <input
                  id="telefono"
                  placeholder="8440000000"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="form-input"
                  type="tel"
                  autoComplete="tel"
                  disabled={loading}
                />
              </div>
            </div>

            <button className="auth-submit-button primary-button" disabled={loading}>
              {loading ? 'Enviando…' : 'Generar token'}
            </button>
          </form>

          {msg && <div className="auth-info">{msg}</div>}

          {token && (
            <div className="auth-info">
              <div><strong>Token:</strong> {token}</div>
              <div className="auth-footer" style={{ marginTop: '.5rem' }}>
                <button className="link-button" onClick={copiar}>Copiar token</button>
                <Link className="link-button" to={`/reset?token=${token}`}>Ir a Restablecer</Link>
              </div>
            </div>
          )}

          <div className="auth-footer" style={{ marginTop: '1rem' }}>
            <span>¿Ya lo tienes?</span>
            <Link className="link-button" to="/reset">Usar token</Link>
            <Link className="link-button" to="/login">Volver a Login</Link>
          </div>
        </div>

        <div className="auth-copyright">
          <p>© {new Date().getFullYear()} SystemVkode. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
}

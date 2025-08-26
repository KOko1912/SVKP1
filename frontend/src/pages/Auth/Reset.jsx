// E:\SVKP1\frontend\src\pages\Auth\Reset.jsx
import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiKey, FiLock } from 'react-icons/fi';
import './Auth.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Reset() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState('');
  const [nueva, setNueva] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = searchParams.get('token');
    if (t) setToken(t);
  }, [searchParams]);

  const resetear = async (e) => {
    e.preventDefault();
    setMsg('');
    if (!token.trim() || !nueva.trim()) {
      setMsg('Debes ingresar el token y la nueva contraseña');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/usuarios/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), nueva: nueva.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo restablecer');
      setMsg('Contraseña actualizada. Ya puedes iniciar sesión.');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
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
            <h2>Restablecer contraseña</h2>
            <p>Usa el token enviado y define tu nueva contraseña</p>
          </div>

          <form className="auth-form" onSubmit={resetear}>
            <div className="form-group">
              <label htmlFor="token" className="form-label">
                <FiKey /> Token
              </label>
              <div className="input-container">
                <input
                  id="token"
                  placeholder="Pega aquí tu token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="form-input"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="nueva" className="form-label">
                <FiLock /> Nueva contraseña
              </label>
              <div className="input-container">
                <input
                  id="nueva"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={nueva}
                  onChange={(e) => setNueva(e.target.value)}
                  className="form-input"
                  disabled={loading}
                />
              </div>
            </div>

            <button className="auth-submit-button primary-button" disabled={loading}>
              {loading ? 'Enviando…' : 'Cambiar contraseña'}
            </button>
          </form>

          {msg && <div className="auth-info" style={{ marginTop: '.75rem' }}>{msg}</div>}

          <div className="auth-footer">
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

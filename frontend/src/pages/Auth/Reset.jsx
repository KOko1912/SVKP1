import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
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
    <div className="auth-container">
      <button 
        onClick={() => navigate(-1)} 
        className="back-button"
      >
        <FiArrowLeft /> Volver
      </button>
      
      <h1>Restablecer contraseña</h1>
      <form className="auth-form" onSubmit={resetear}>
        <input
          placeholder="Token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <input
          type="password"
          placeholder="Nueva contraseña"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
        />
        <button className="primary-button" disabled={loading}>
          {loading ? 'Enviando…' : 'Cambiar contraseña'}
        </button>
      </form>

      {msg && <p className="auth-info" style={{ marginTop: 12 }}>{msg}</p>}

      <p className="auth-link" style={{ marginTop: 24 }}>
        <Link className="link-button" to="/login">Volver a Login</Link>
      </p>
    </div>
  );
}
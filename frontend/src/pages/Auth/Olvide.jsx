import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
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
    } catch { setMsg('No se pudo copiar.'); }
  };

  return (
    <div className="auth-container">
      <button 
        onClick={() => navigate(-1)} 
        className="back-button"
      >
        <FiArrowLeft /> Volver
      </button>
      
      <h1>Recuperar contraseña</h1>
      <form className="auth-form" onSubmit={solicitar}>
        <input
          placeholder="Teléfono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />
        <button className="primary-button" disabled={loading}>
          {loading ? 'Enviando…' : 'Generar token'}
        </button>
      </form>

      {msg && <p className="auth-info" style={{ marginTop: 12 }}>{msg}</p>}

      {token && (
        <div className="auth-info" style={{ marginTop: 12, wordBreak: 'break-all' }}>
          <div><strong>Token:</strong> {token}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="link-button" onClick={copiar}>Copiar token</button>
            <Link className="link-button" to={`/reset?token=${token}`}>Ir a Restablecer</Link>
          </div>
        </div>
      )}

      <p className="auth-link" style={{ marginTop: 24 }}>
        ¿Ya lo tienes? <Link className="link-button" to="/reset">Usar token</Link>
      </p>

      <p className="auth-link">
        <Link className="link-button" to="/login">Volver a Login</Link>
      </p>
    </div>
  );
}
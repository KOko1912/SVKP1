// frontend/src/pages/Usuario/Configuracion.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NavBarUsuario from './NavBarUsuario';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ConfiguracionUsuario() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Cargar usuario desde localStorage (protegemos el acceso)
  useEffect(() => {
    const raw = localStorage.getItem('usuario');
    if (!raw) return navigate('/login');
    try {
      setUsuario(JSON.parse(raw));
    } catch {
      localStorage.removeItem('usuario');
      navigate('/login');
    }
  }, [navigate]);

  const cambiarPassword = async (e) => {
    e.preventDefault();
    setMsg('');

    if (!actual.trim() || !nueva.trim() || !confirmar.trim()) {
      setMsg('Completa todos los campos.');
      return;
    }
    if (nueva !== confirmar) {
      setMsg('La nueva contraseña y su confirmación no coinciden.');
      return;
    }
    if (!usuario?.id) {
      setMsg('Sesión inválida. Inicia sesión de nuevo.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/usuarios/cambiar-contraseña`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: usuario.id, actual, nueva })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo actualizar la contraseña');

      setMsg('Contraseña actualizada correctamente ✅');
      setActual('');
      setNueva('');
      setConfirmar('');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!usuario) return null;

  return (
    <>
      <NavBarUsuario />

      <div style={{ maxWidth: 680, margin: '24px auto', padding: '0 16px' }}>
        <h2>Configuración</h2>


        {/* Cambio de contraseña con la actual */}
        <div className="card" style={{ marginTop: 16, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Cambiar contraseña</h3>
          <form onSubmit={cambiarPassword} style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
            <input
              type="password"
              placeholder="Contraseña actual"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
            />
            <input
              type="password"
              placeholder="Nueva contraseña"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
            />
            <input
              type="password"
              placeholder="Confirmar nueva contraseña"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
            />
            <button className="primary-button" disabled={loading}>
              {loading ? 'Guardando…' : 'Actualizar contraseña'}
            </button>
          </form>
          {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
        </div>
      </div>
    </>
  );
}

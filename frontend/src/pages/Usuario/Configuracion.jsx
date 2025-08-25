import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBarUsuario from './NavBarUsuario';
import { FiLock, FiChevronDown, FiChevronUp, FiEye, FiEyeOff } from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ConfiguracionUsuario() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(null);

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');

  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // visibilidad del formulario y de los inputs
  const [mostrarForm, setMostrarForm] = useState(false);
  const [verActual, setVerActual] = useState(false);
  const [verNueva, setVerNueva] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);

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

  const resetForm = () => {
    setActual('');
    setNueva('');
    setConfirmar('');
    setVerActual(false);
    setVerNueva(false);
    setVerConfirmar(false);
  };

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
      resetForm();
      setMostrarForm(false);
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

      <div className="container-svk" style={{ maxWidth: 720 }}>
        <h2 className="title-svk" style={{ marginBottom: 12 }}>Configuración</h2>

        {/* Seguridad / Contraseña */}
        <div className="card-svk" style={{ marginTop: 12 }}>
          <div className="block-title" style={{ marginBottom: 0 }}>
            <span className="icon"><FiLock /></span>
            <h2>Seguridad y contraseña</h2>
          </div>

          <p className="muted-svk" style={{ marginTop: 10 }}>
            Mantén tu cuenta protegida. Te recomendamos cambiar tu contraseña periódicamente.
          </p>

          {/* Trigger para mostrar/ocultar formulario */}
          <button
            className="btn btn-primary"
            onClick={() => setMostrarForm(v => !v)}
            style={{ marginTop: 10 }}
          >
            {mostrarForm ? <>Ocultar formulario <FiChevronUp /></> : <>Cambiar contraseña <FiChevronDown /></>}
          </button>

          {/* Formulario oculto por defecto */}
          {mostrarForm && (
            <form onSubmit={cambiarPassword} className="form-svk" style={{ marginTop: 14 }}>
              <div className="input-wrap-svk">
                <input
                  type={verActual ? 'text' : 'password'}
                  placeholder="Contraseña actual"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setVerActual(v => !v)}
                  aria-label="Ver/Ocultar contraseña actual"
                >
                  {verActual ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              <div className="input-wrap-svk">
                <input
                  type={verNueva ? 'text' : 'password'}
                  placeholder="Nueva contraseña"
                  value={nueva}
                  onChange={(e) => setNueva(e.target.value)}
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setVerNueva(v => !v)}
                  aria-label="Ver/Ocultar nueva contraseña"
                >
                  {verNueva ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              <div className="input-wrap-svk">
                <input
                  type={verConfirmar ? 'text' : 'password'}
                  placeholder="Confirmar nueva contraseña"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setVerConfirmar(v => !v)}
                  aria-label="Ver/Ocultar confirmación de contraseña"
                >
                  {verConfirmar ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" disabled={loading}>
                  {loading ? 'Guardando…' : 'Actualizar contraseña'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => { resetForm(); setMostrarForm(false); }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {msg && <div className="note" style={{ marginTop: 12 }}>{msg}</div>}
        </div>
      </div>
    </>
  );
}

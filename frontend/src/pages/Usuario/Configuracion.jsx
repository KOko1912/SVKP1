// frontend/src/pages/Usuario/Configuracion.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBarUsuario from './NavBarUsuario';
import {
  FiLock, FiChevronDown, FiChevronUp, FiEye, FiEyeOff,
  FiUpload, FiUser
} from 'react-icons/fi';
import './usuario.css';

const RAW_API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = RAW_API.replace(/\/$/, '');

// Helpers de imagen (mismo criterio que en Perfil.jsx)
const toPublicUrl = (u) => {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;       // URL absoluta (p.ej. Supabase)
  if (u.startsWith('/')) return `${API_URL}${u}`; // Ruta relativa del backend
  return `${API_URL}/${u}`;
};
const withCacheBuster = (url, stamp = Date.now()) =>
  url ? `${url}${url.includes('?') ? '&' : '?'}t=${stamp}` : '';
const pickUserPhotoUrl = (u) => {
  if (!u) return '';
  if (u.foto?.url) return u.foto.url;   // nuevo (Media)
  if (u.fotoUrl)   return u.fotoUrl;    // legado
  return '';
};

export default function ConfiguracionUsuario() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(null);

  // contraseña
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [verActual, setVerActual] = useState(false);
  const [verNueva, setVerNueva] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);

  // mensajes/estado
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // foto de perfil
  const [subiendo, setSubiendo] = useState(false);
  const [fotoMsg, setFotoMsg] = useState('');
  const fileRef = useRef(null);

  // cargar usuario
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

  const fotoSrc = useMemo(() => {
    const raw = pickUserPhotoUrl(usuario);
    if (!raw) return '';
    return withCacheBuster(
      toPublicUrl(raw),
      usuario?.updatedAt || Date.now()
    );
  }, [usuario?.foto, usuario?.fotoUrl, usuario?.updatedAt]);

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
      const res = await fetch(`${API_URL}/api/usuarios/cambiar-contraseña`, {
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

  // === Cambio de foto (unificado a /api/media/usuarios/:id/avatar con campo "file") ===
  const abrirSelector = () => fileRef.current?.click();

  const onChangeFoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !usuario?.id) return;

    setFotoMsg('');
    const formData = new FormData();
    formData.append('file', file); // campo esperado por /api/media/usuarios/:id/avatar

    setSubiendo(true);
    try {
      const res = await fetch(`${API_URL}/api/media/usuarios/${usuario.id}/avatar`, {
        method: 'POST',
        body: formData
      });

      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : await res.text();

      if (!res.ok) {
        const serverMsg =
          typeof data === 'string' ? data : (data?.error || 'Error al subir imagen');
        if (res.status === 413) setFotoMsg('La imagen es demasiado grande. Prueba con una menor.');
        else if (res.status === 415) setFotoMsg('Tipo no permitido. Usa JPG, PNG, WEBP o GIF.');
        else setFotoMsg(serverMsg);
        return;
      }

      // Actualizar usuario local (guardamos foto {id,url} y cache-busteamos con updatedAt)
      const next = {
        ...usuario,
        fotoId: data.mediaId ?? usuario.fotoId,
        foto: { ...(usuario.foto || {}), id: data.mediaId, url: data.url },
        updatedAt: Date.now(),
      };
      setUsuario(next);
      localStorage.setItem('usuario', JSON.stringify(next));
      setFotoMsg('Foto actualizada ✅');
    } catch (err) {
      setFotoMsg(err.message || 'No se pudo subir la imagen');
    } finally {
      setSubiendo(false);
      if (e.target) e.target.value = '';
    }
  };

  if (!usuario) return null;

  return (
    <div className="page page--dark-svk">
      <NavBarUsuario />

      <main className="container-svk" style={{ maxWidth: 720 }}>
        <h2 className="title-svk" style={{ marginBottom: 12 }}>Configuración</h2>

        {/* ===== Foto de perfil ===== */}
        <section className="card-svk" style={{ marginTop: 12 }}>
          <div className="block-title" style={{ marginBottom: 8 }}>
            <span className="icon"><FiUser /></span>
            <h2>Foto de perfil</h2>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
            <div className="avatar-svk" title="Foto de perfil">
              {fotoSrc ? (
                <img src={fotoSrc} alt="Foto de perfil" />
              ) : (
                <div className="avatar__placeholder" aria-label="Sin foto">
                  <FiUser size={36} />
                </div>
              )}
            </div>

            <div style={{ display:'grid', gap:8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={abrirSelector}
                disabled={subiendo}
              >
                <FiUpload /> {subiendo ? 'Subiendo…' : 'Cambiar foto'}
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                onChange={onChangeFoto}
                className="hidden"
                disabled={subiendo}
              />
              {fotoSrc && (
                <span className="subtitle-svk" style={{marginTop: -2}}>
                  Tip: usa una imagen cuadrada para mejor resultado.
                </span>
              )}
            </div>
          </div>

          {fotoMsg && <div className="note" style={{ marginTop: 12 }}>{fotoMsg}</div>}
        </section>

        {/* ===== Seguridad / Contraseña ===== */}
        <section className="card-svk" style={{ marginTop: 12 }}>
          <div className="block-title" style={{ marginBottom: 0 }}>
            <span className="icon"><FiLock /></span>
            <h2>Seguridad y contraseña</h2>
          </div>

          <p className="muted-svk" style={{ marginTop: 10 }}>
            Mantén tu cuenta protegida. Te recomendamos cambiar tu contraseña periódicamente.
          </p>

          <button
            className="btn btn-primary"
            onClick={() => setMostrarForm(v => !v)}
            style={{ marginTop: 10 }}
          >
            {mostrarForm ? <>Ocultar formulario <FiChevronUp /></> : <>Cambiar contraseña <FiChevronDown /></>}
          </button>

          {mostrarForm && (
            <form onSubmit={cambiarPassword} className="form-svk" style={{ marginTop: 14 }}>
              <div className="input-wrap-svk">
                <input
                  type={verActual ? 'text' : 'password'}
                  placeholder="Contraseña actual"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  autoComplete="current-password"
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
                  autoComplete="new-password"
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
                  autoComplete="new-password"
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
                <button className="btn btn-primary" disabled={loading} type="submit">
                  {loading ? 'Guardando…' : 'Actualizar contraseña'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => { setMsg(''); resetForm(); setMostrarForm(false); }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {msg && (
            <div className="note" style={{ marginTop: 12 }} aria-live="polite">
              {msg}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

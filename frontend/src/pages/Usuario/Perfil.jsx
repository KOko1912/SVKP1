// frontend/src/pages/Usuario/Perfil.jsx
import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBarUsuario from './NavBarUsuario';
import {
  FiUser, FiPhone, FiShoppingBag, FiLogOut, FiHeart,
  FiMapPin, FiSettings, FiChevronRight, FiBookmark, FiCamera
} from 'react-icons/fi';
import './usuario.css';

const RAW_API = import.meta.env.VITE_API_URL || '';
const API_URL = RAW_API.replace(/\/$/, '');

// Normaliza una URL: si viene absoluta (Supabase) se devuelve tal cual.
// Si viene relativa (ruta local del backend) la anteponemos con API_URL.
const toPublicUrl = (u) => {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('/')) return `${API_URL}${u}`;
  return `${API_URL}/${u}`;
};

// Escoge la mejor URL de foto: nuevo esquema (usuario.foto.url) o el viejo (usuario.fotoUrl)
const pickUserPhotoUrl = (u) => {
  if (!u) return '';
  if (u.foto?.url) return u.foto.url;   // 👈 nuevo (Media)
  if (u.fotoUrl)   return u.fotoUrl;    // 👈 legado
  return '';
};

const withCacheBuster = (url, stamp = Date.now()) =>
  url ? `${url}${url.includes('?') ? '&' : '?'}t=${stamp}` : '';

export default function Perfil() {
  const [usuario, setUsuario] = useState(null);
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // URL final para la imagen (soporta Supabase o rutas locales antiguas)
  const fotoSrc = useMemo(() => {
    const raw = pickUserPhotoUrl(usuario);
    if (!raw) return '';
    const publicUrl = toPublicUrl(raw);
    return withCacheBuster(publicUrl, usuario?.updatedAt || Date.now());
  }, [usuario?.foto, usuario?.fotoUrl, usuario?.updatedAt]);

  // Cargar usuario y refrescar datos desde la API (incluye foto si el backend la expone)
  useEffect(() => {
    const raw = localStorage.getItem('usuario');
    if (!raw) return navigate('/login');

    try {
      const u = JSON.parse(raw);
      setUsuario(u);

      // Refresca desde el backend (ideal si el endpoint incluye { foto: true })
      fetch(`${API_URL}/api/usuarios/${u.id}`)
        .then(async (r) => {
          if (!r.ok) return;
          const data = await r.json();
          if (data?.usuario) {
            const refreshed = { ...data.usuario };
            setUsuario(refreshed);
            localStorage.setItem('usuario', JSON.stringify(refreshed));
          }
        })
        .catch(() => {});
    } catch {
      localStorage.removeItem('usuario');
      navigate('/login');
    }
  }, [navigate]);

  // Subir avatar a Supabase vía backend
  const onAvatarSelected = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !usuario?.id) return;

      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch(`${API_URL}/api/media/usuarios/${usuario.id}/avatar`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo subir la foto');

      // Actualiza estado/localStorage: preferimos dejar un objeto foto {id,url}
      const next = {
        ...usuario,
        fotoId: data.mediaId ?? usuario.fotoId,
        foto: { ...(usuario.foto || {}), id: data.mediaId, url: data.url },
        updatedAt: Date.now(),
      };
      setUsuario(next);
      localStorage.setItem('usuario', JSON.stringify(next));
      setMsg('Foto actualizada correctamente.');
    } catch (err) {
      setMsg(err.message || 'Error al subir la foto');
    } finally {
      // Limpia input para permitir re-seleccionar el mismo archivo si hace falta
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const solicitarVendedor = async () => {
    if (!usuario?.id) return;
    try {
      const res = await fetch(`${API_URL}/api/usuarios/solicitar-vendedor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: usuario.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo enviar la solicitud');

      const next = { ...usuario, vendedorSolicitado: true };
      setUsuario(next);
      localStorage.setItem('usuario', JSON.stringify(next));
      setMsg('Solicitud enviada. Nuestro soporte te contactará.');
    } catch (e) {
      setMsg(e.message);
    }
  };

  const irPanelVendedor = () => navigate('/vendedor/perfil');
  const irCompras = () => navigate('/usuario/compras');
  const irDirecciones = () => navigate('/usuario/configuracion?tab=direcciones');
  const irTiendas = () => navigate('/usuario/tiendas');
  const irConfig = () => navigate('/usuario/configuracion');
  const logout = () => { localStorage.removeItem('usuario'); navigate('/login'); };

  if (!usuario) return null;

  const roleLabel = usuario.vendedor ? 'Vendedor' : 'Comprador';
  const roleBadgeClass = usuario.vendedor ? 'badge badge--role' : 'badge badge--buyer';

  const BotonVendedor = () => {
    if (usuario.vendedor) {
      return (
        <button className="btn btn-primary w-full" onClick={irPanelVendedor}>
          <FiShoppingBag /> Ir al panel de vendedor
        </button>
      );
    }
    if (usuario.vendedorSolicitado) {
      return (
        <div className="stack-12">
          <div className="note success">
            <p>Solicitud enviada. Nuestro soporte te contactará.</p>
          </div>
          <button className="btn btn-outline w-full" disabled>
            En revisión…
          </button>
        </div>
      );
    }
    return (
      <button className="btn btn-primary w-full" onClick={solicitarVendedor}>
        <FiShoppingBag /> Solicitar modo vendedor
      </button>
    );
  };

  return (
    <div className="page page--dark-svk">
      <NavBarUsuario />

      <main className="container-svk">
        {/* Header */}
        <header className="card-svk header-svk">
          <div className="header-left">
            <div className="avatar-svk" style={{ position: 'relative' }}>
              {fotoSrc ? (
                <img src={fotoSrc} alt="Foto de perfil" />
              ) : (
                <div className="avatar__placeholder" aria-label="Sin foto">
                  <FiUser size={36} />
                </div>
              )}

              {/* Botón de cambiar foto */}
              <label
                className="btn btn-ghost"
                style={{
                  position: 'absolute', bottom: -8, right: -8,
                  fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 6
                }}
              >
                <FiCamera /> Cambiar
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onAvatarSelected}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            <div className="user-head">
              <h1 className="title-svk">{usuario.nombre || 'Usuario'}</h1>
              <p className="subtitle-svk">Administra tu cuenta, tus compras y tu tienda.</p>

              <div style={{ marginTop: '.5rem', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className={roleBadgeClass}>{roleLabel}</span>
                <span className="badge"><FiPhone /> {usuario.telefono || '—'}</span>
              </div>

              {msg && <div className="note" style={{ marginTop: '.6rem' }}>{msg}</div>}
            </div>
          </div>

          <div className="header-actions">
            <button className="btn btn-outline" onClick={irConfig}>
              <FiSettings /> Configuración
            </button>
            <button className="btn btn-danger" onClick={logout}>
              <FiLogOut /> Cerrar sesión
            </button>
          </div>
        </header>

        {/* Quick stats */}
        <section className="card-svk" style={{ marginTop: '16px' }}>
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
            <div className="stat-card">
              <div className="stat-icon"><FiPhone /></div>
              <div>
                <div className="stat-label">Teléfono</div>
                <div className="stat-value">{usuario.telefono || '—'}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><FiUser /></div>
              <div>
                <div className="stat-label">Rol</div>
                <div className="stat-value">{roleLabel}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Grid principal */}
        <section className="grid-svk" style={{ marginTop: '16px' }}>
          {/* Información personal */}
          <div className="card-svk">
            <div className="block-title">
              <span className="icon"><FiUser /></span>
              <h2>Información personal</h2>
            </div>
            <div className="kv-grid">
              <div className="kv-item">
                <div className="kv-label">Nombre</div>
                <div className="kv-value">{usuario.nombre || '—'}</div>
              </div>
              <div className="kv-item">
                <div className="kv-label">Teléfono</div>
                <div className="kv-value">{usuario.telefono || '—'}</div>
              </div>
            </div>
          </div>

          {/* Modo vendedor */}
          <div className="card-svk">
            <div className="block-title">
              <span className="icon"><FiShoppingBag /></span>
              <h2>Modo vendedor</h2>
            </div>
            <p className="subtitle-svk" style={{ marginTop: 0 }}>
              Administra una tienda y comienza a vender.
            </p>
            <BotonVendedor />
          </div>

          {/* Compras */}
          <div className="card-svk">
            <div className="block-title">
              <span className="icon"><FiBookmark /></span>
              <h2>Resumen de compras</h2>
            </div>
            <ul className="bullets">
              <li>Última compra: <strong>—</strong></li>
              <li>Pedidos en curso: <strong>—</strong></li>
            </ul>
            <button className="btn btn-ghost" onClick={irCompras}>
              Ver mis compras <FiChevronRight />
            </button>
          </div>

          {/* Direcciones / Favoritos */}
          <div className="card-svk">
            <div className="block-title">
              <span className="icon"><FiMapPin /></span>
              <h2>Direcciones & Favoritos</h2>
            </div>
            <div className="row-actions">
              <button className="chip" onClick={irDirecciones}><FiMapPin /> Gestionar direcciones</button>
              <button className="chip" onClick={irTiendas}><FiHeart /> Tiendas guardadas</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

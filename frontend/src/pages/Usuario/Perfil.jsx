// frontend/src/pages/Usuario/Perfil.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBarUsuario from './NavBarUsuario';
import {
  FiUser, FiPhone, FiShoppingBag, FiLogOut, FiHeart,
  FiMapPin, FiSettings, FiChevronRight, FiBookmark
} from 'react-icons/fi';
import './usuario.css';

const RAW_API = import.meta.env.VITE_API_URL || '';
const API_URL = RAW_API.replace(/\/$/, '');

const toPublicUrl = (u) => {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('/')) return `${API_URL}${u}`;
  return `${API_URL}/${u}`;
};

const pickUserPhotoUrl = (u) => {
  if (!u) return '';
  if (u.foto?.url) return u.foto.url;
  if (u.fotoUrl)   return u.fotoUrl;
  return '';
};

const withCacheBuster = (url, stamp = Date.now()) =>
  url ? `${url}${url.includes('?') ? '&' : '?'}t=${stamp}` : '';

export default function Perfil() {
  const [usuario, setUsuario] = useState(null);
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const fotoSrc = useMemo(() => {
    const raw = pickUserPhotoUrl(usuario);
    if (!raw) return '';
    const publicUrl = toPublicUrl(raw);
    return withCacheBuster(publicUrl, usuario?.updatedAt || Date.now());
  }, [usuario?.foto, usuario?.fotoUrl, usuario?.updatedAt]);

  useEffect(() => {
    const raw = localStorage.getItem('usuario');
    if (!raw) return navigate('/login');

    try {
      const u = JSON.parse(raw);
      setUsuario(u);

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
        <header className="card-svk card-svk--accent header-svk">
          <div className="header-left">
            <div className="avatar-svk" aria-hidden={false} title={usuario.nombre || 'Usuario'}>
              {fotoSrc ? (
                <img src={fotoSrc} alt="Foto de perfil" />
              ) : (
                <div className="avatar__placeholder" aria-label="Sin foto">
                  <FiUser size={36} />
                </div>
              )}
            </div>

            <div className="user-head">
              <h1 className="title-svk">{usuario.nombre || 'Usuario'}</h1>
              <p className="subtitle-svk">Administra tu cuenta, tus compras y tu tienda.</p>

              <div className="badges-row">
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

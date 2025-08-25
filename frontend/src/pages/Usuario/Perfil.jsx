// frontend/src/pages/Usuario/Perfil.jsx
import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBarUsuario from './NavBarUsuario';
import {
  FiUpload, FiUser, FiPhone, FiShoppingBag, FiLogOut, FiMessageSquare,
  FiHeart, FiMapPin, FiSettings, FiChevronRight, FiBookmark
} from 'react-icons/fi';
import './usuario.css';

const RAW_API = import.meta.env.VITE_API_URL || '';
const API_URL = RAW_API.replace(/\/$/, '');
const WA_SOPORTE = '528441786280';

const toPublicUrl = (u) => {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('/')) return `${API_URL}${u}`;
  return `${API_URL}/${u}`;
};

const withCacheBuster = (url, stamp = Date.now()) =>
  url ? `${url}${url.includes('?') ? '&' : '?'}t=${stamp}` : '';

export default function Perfil() {
  const [usuario, setUsuario] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [msg, setMsg] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const fotoSrc = useMemo(() => {
    if (!usuario?.fotoUrl) return '';
    return withCacheBuster(toPublicUrl(usuario.fotoUrl), usuario.updatedAt || Date.now());
  }, [usuario?.fotoUrl, usuario?.updatedAt]);

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

  const abrirFilePicker = () => fileInputRef.current?.click();

  const onChangeFoto = async (e) => {
    if (!usuario) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setMsg('');
    const formData = new FormData();
    formData.append('foto', file);

    setSubiendo(true);
    try {
      const res = await fetch(`${API_URL}/api/usuarios/${usuario.id}/foto`, {
        method: 'POST',
        body: formData,
      });

      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : await res.text();

      if (!res.ok) {
        const serverMsg =
          typeof data === 'string' ? data : (data?.error || 'Error al subir imagen');
        if (res.status === 413) setMsg('La imagen es demasiado grande. Prueba con una menor.');
        else if (res.status === 415) setMsg('Tipo no permitido. Usa JPG, PNG, WEBP o GIF.');
        else setMsg(serverMsg);
        return;
      }

      const updated = data?.usuario ? { ...usuario, ...data.usuario } : usuario;
      setUsuario(updated);
      localStorage.setItem('usuario', JSON.stringify(updated));
      setMsg('Foto actualizada ✅');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSubiendo(false);
      e.target.value = '';
    }
  };

  const abrirWhatsApp = (texto) => {
    const url = `https://wa.me/${WA_SOPORTE}?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
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

      const texto = `Hola, soy ${usuario.nombre} (ID ${usuario.id}). Quiero solicitar el modo VENDEDOR en SystemVKode.`;
      abrirWhatsApp(texto);
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
          <button
            className="btn btn-outline w-full"
            onClick={() =>
              abrirWhatsApp(`Hola, soy ${usuario.nombre} (ID ${usuario.id}). Di seguimiento a mi solicitud de vendedor.`)
            }
          >
            <FiMessageSquare /> Contactar soporte
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
            <div className="avatar-svk">
              {fotoSrc ? (
                <img src={fotoSrc} alt="Foto de perfil" />
              ) : (
                <div className="avatar__placeholder" aria-label="Sin foto">
                  <FiUser size={36} />
                </div>
              )}
              <button
                className={`btn btn-secondary avatar__action ${subiendo ? 'is-loading' : ''}`}
                onClick={abrirFilePicker}
                disabled={subiendo}
                aria-label="Cambiar foto"
                title="Cambiar foto"
              >
                <FiUpload /> {subiendo ? 'Subiendo…' : 'Cambiar'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                onChange={onChangeFoto}
                disabled={subiendo}
                className="hidden"
              />
            </div>

            <div className="user-head">
              <h1 className="title-svk">{usuario.nombre || 'Usuario'}</h1>
              <p className="subtitle-svk">Administra tu cuenta, tus compras y tu tienda.</p>
              {msg && <div className="note">{msg}</div>}
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

        {/* Grid principal */}
        <section className="grid-svk">
          {/* Información personal */}
          <div className="card-svk">
            <div className="block-title">
              <span className="icon"><FiUser /></span>
              <h2>Información personal</h2>
            </div>
            <div className="info-list">
              <div className="info-row">
                <span className="info-label">Nombre</span>
                <span className="info-value">{usuario.nombre || '—'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Teléfono</span>
                <span className="info-value">{usuario.telefono || '—'}</span>
              </div>
            </div>
          </div>

          {/* Modo vendedor */}
          <div className="card-svk">
            <div className="block-title">
              <span className="icon"><FiShoppingBag /></span>
              <h2>Modo vendedor</h2>
            </div>
            <p className="muted-svk">Administra una tienda y comienza a vender.</p>
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

          {/* Soporte */}
          <div className="card-svk span-2">
            <div className="block-title">
              <span className="icon"><FiMessageSquare /></span>
              <h2>Soporte</h2>
            </div>
            <p className="muted-svk">¿Dudas o ayuda? Estamos para ti.</p>
            <div className="row-actions">
              <button
                className="btn btn-outline"
                onClick={() =>
                  abrirWhatsApp(`Hola, soy ${usuario.nombre || ''} (ID ${usuario.id}). Necesito ayuda con mi cuenta.`)
                }
              >
                WhatsApp Soporte
              </button>
              <a className="btn btn-ghost" href="https://systemvkode.com/ayuda" target="_blank" rel="noreferrer">
                Centro de ayuda
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

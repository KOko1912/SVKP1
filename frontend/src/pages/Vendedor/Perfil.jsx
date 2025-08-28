// frontend/src/pages/Vendedor/Perfil.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import Nabvendedor from './Nabvendedor';
import {
  FiSettings, FiImage, FiInfo, FiCreditCard, FiShare2, FiTag,
  FiClock, FiPhone, FiTruck, FiRefreshCw, FiCheck,
  FiFacebook, FiInstagram, FiYoutube, FiMenu, FiX, FiMoon, FiSun
} from 'react-icons/fi';
import './Vendedor.css';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const CATEGORIAS = ['Electrónica', 'Moda', 'Hogar', 'Alimentos', 'Belleza', 'Juguetes', 'Otros'];
const METODOS_PAGO = ['tarjeta', 'transferencia', 'efectivo', 'contraentrega', 'paypal'];
const DIAS_SEMANA = [
  { id: 'lun', label: 'Lunes' }, { id: 'mar', label: 'Martes' }, { id: 'mie', label: 'Miércoles' },
  { id: 'jue', label: 'Jueves' }, { id: 'vie', label: 'Viernes' }, { id: 'sab', label: 'Sábado' },
  { id: 'dom', label: 'Domingo' },
];

const PALETA_NEON = [
  { id: 'neon-purple', name: 'Neon Purple', from: '#6d28d9', to: '#c026d3' },
  { id: 'neon-blue',   name: 'Neon Blue',   from: '#0369a1', to: '#0ea5e9' },
  { id: 'neon-green',  name: 'Neon Green',  from: '#059669', to: '#10b981' },
  { id: 'neon-orange', name: 'Neon Orange', from: '#ea580c', to: '#f97316' },
  { id: 'neon-pink',   name: 'Neon Pink',   from: '#be185d', to: '#ec4899' },
  { id: 'neon-cyan',   name: 'Neon Cyan',   from: '#0e7490', to: '#06b6d4' },
  { id: 'neon-red',    name: 'Neon Red',    from: '#b91c1c', to: '#ef4444' },
];

/* ===================== Utils ===================== */
const grad = (from, to) => `linear-gradient(135deg, ${from}, ${to})`;
const withT = (url, t) => (url ? `${url}${url.includes('?') ? '&' : '?'}t=${t || 0}` : '');

const isAbs = (u) => /^https?:\/\//i.test(String(u || ''));

// PUBLIC: para mostrar imágenes en el navegador.
// - Absolutas (Supabase): se dejan intactas.
// - Relativas (backend local): se antepone API.
const toPublicUrl = (u) => {
  if (!u) return '';
  const s = String(u).replace(/\\/g, '/');
  if (isAbs(s)) return s;
  const p = s.startsWith('/') ? s : `/${s}`;
  return `${API}${encodeURI(p)}`;
};

const hexToRgb = (hex) => {
  const m = hex?.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
};
const luminance = ([r, g, b]) => {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
};
const bestTextOn = (hexA, hexB) => {
  const L = (luminance(hexToRgb(hexA)) + luminance(hexToRgb(hexB))) / 2;
  return L > 0.45 ? '#111111' : '#ffffff';
};
const extractColors = (gradientString) => {
  const m = gradientString?.match(/#([0-9a-f]{6})/gi);
  return { from: m?.[0] || '#6d28d9', to: m?.[1] || '#c026d3' };
};

// Imagen de portada + tinte
const composeHeaderBg = (portadaUrl, from, to, ver) => {
  if (!portadaUrl) return `linear-gradient(135deg, ${from}, ${to})`;
  return `linear-gradient(135deg, ${from}cc, ${to}cc), url("${withT(toPublicUrl(portadaUrl), ver)}")`;
};

const normalizeUrl = (url) => {
  if (!url) return '';
  const u = String(url).trim();
  if (!/^https?:\/\//i.test(u)) return `https://${u}`;
  return u;
};

/* ===================== Componentes internos (reutilizables) ===================== */
function Card({ as: As = 'section', children, title, subtitle, actions, footer, id }) {
  const TitleWrap = typeof title === 'string' ? 'h3' : 'div';
  return (
    <As className="card" aria-labelledby={id ? `${id}-title` : undefined}>
      {(title || actions || subtitle) && (
        <header className="card-header">
          {title && (
            <TitleWrap id={id ? `${id}-title` : undefined} className="card-title">
              {title}
            </TitleWrap>
          )}
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      <div className="card-body">{children}</div>
      {footer && <footer className="card-footer">{footer}</footer>}
    </As>
  );
}

function FormField({ label, hint, error, required, children, id, inline, htmlFor, a11yDescription }) {
  return (
    <div className={`form-group ${inline ? 'form-group-inline' : ''}`}>
      {label && (
        <label className="form-label" htmlFor={htmlFor || id}>
          {label}{required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {hint && <p className="form-hint" id={a11yDescription}>{hint}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}

function ImageUploader({ label, value, onUpload, accept = 'image/*', ratio, busy, previewHeight = 180, id }) {
  const inputRef = useRef(null);
  return (
    <div className="image-upload" aria-busy={busy ? 'true' : 'false'}>
      {label && <label className="form-label" htmlFor={id}>{label}</label>}

      {value ? (
        <img
          src={value}
          alt=""
          className="image-preview"
          loading="lazy"
          decoding="async"
          style={{ maxHeight: previewHeight, aspectRatio: ratio || 'auto' }}
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <p className="image-upload-placeholder">Arrastra una imagen o haz clic para subir</p>
      )}

      <label className="btn btn-upload" role="button" aria-label="Subir imagen">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          onChange={e => onUpload?.(e.target.files?.[0] || null)}
          style={{ display: 'none' }}
        />
        {busy ? 'Subiendo...' : 'Seleccionar Imagen'}
      </label>
    </div>
  );
}

function Toast({ open, message }) {
  return (
    <div className={`notification ${open ? 'show' : ''}`} aria-live="polite">
      {message}
    </div>
  );
}

function SectionTitle({ icon: Icon, children, level = 3 }) {
  return (
    <span className="section-title" role="heading" aria-level={level}>
      {Icon && <Icon className="section-title-icon" aria-hidden="true" />} {children}
    </span>
  );
}

function Pill({ children }) {
  return <span className="pill">{children}</span>;
}

/* ===================== Página ===================== */
export default function VendedorPerfil() {
  const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
  const [colorMode, setColorMode] = useState(() => localStorage.getItem('vk-color-mode') || (prefersLight ? 'light' : 'dark'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [theme, setTheme] = useState({ from: '#6d28d9', to: '#c026d3', contrast: '#ffffff' });
  const [imgV, setImgV] = useState({ portada: 0, logo: 0, banner: 0 });

  const [tienda, setTienda] = useState({
    nombre: '', descripcion: '',
    portadaUrl: '', logoUrl: '', bannerPromoUrl: '',
    categoria: '', subcategorias: [],
    telefonoContacto: '', email: '',
    horario: Object.fromEntries(DIAS_SEMANA.map(d => [d.id, ''])),
    metodosPago: [],
    redes: { facebook: '', instagram: '', tiktok: '' },
    envioCobertura: '', envioCosto: '', envioTiempo: '',
    devoluciones: '',
    colorPrincipal: grad('#6d28d9', '#c026d3'),
    seoKeywords: [], seoDescripcion: '',
  });

  const [errors, setErrors] = useState({});
  const [tab, setTab] = useState('general');
  const [subiendo, setSubiendo] = useState({ portada: false, logo: false, banner: false });
  const [cargando, setCargando] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '' });

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const headers = { 'x-user-id': usuario?.id };

  /* ====== Effects ====== */
  useEffect(() => {
    document.body.classList.add('vendor-theme');
    return () => document.body.classList.remove('vendor-theme');
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', colorMode);
    localStorage.setItem('vk-color-mode', colorMode);
  }, [colorMode]);

  // Carga inicial
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/api/tienda/me`, { headers });
        const d = await r.json();
        if (r.ok && d) {
          const normal = {
            ...d,
            portadaUrl: d.portadaUrl || '',
            logoUrl: d.logoUrl || '',
            bannerPromoUrl: d.bannerPromoUrl || '',
            categoria: d.categoria || '',
            envioCobertura: d.envioCobertura || '',
            subcategorias: d.subcategorias || [],
            metodosPago: d.metodosPago || [],
            seoKeywords: d.seoKeywords || [],
            horario: d.horario || Object.fromEntries(DIAS_SEMANA.map(x => [x.id, ''])),
            redes: d.redes || { facebook: '', instagram: '', tiktok: '' },
            colorPrincipal: d.colorPrincipal || grad('#6d28d9', '#c026d3'),
          };
          setTienda(t => ({ ...t, ...normal }));
          const { from, to } = extractColors(normal.colorPrincipal);
          setTheme({ from, to, contrast: bestTextOn(from, to) });
        }
      } catch (e) {
        console.error(e);
      } finally { setCargando(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Propaga tema a CSS
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--brand-from', theme.from);
    root.setProperty('--brand-to', theme.to);
    root.setProperty('--brand-contrast', theme.contrast);
    root.setProperty('--brand-gradient', grad(theme.from, theme.to));
    root.setProperty('--primary-color', theme.from);
    root.setProperty('--primary-hover', theme.from);
    const softHalos = `radial-gradient(900px 600px at 0% -10%, ${theme.from}22, transparent 60%),
                       radial-gradient(900px 600px at 100% -10%, ${theme.to}22, transparent 60%)`;
    const pageBg = `${softHalos}, linear-gradient(135deg, ${theme.from}, ${theme.to})`;
    root.setProperty('--page-bg', pageBg);
    setTienda(t => ({ ...t, colorPrincipal: grad(theme.from, theme.to) }));
  }, [theme]);

  // Cierra drawer con ESC
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ====== Helpers de UI ====== */
  const showNotification = (message) => {
    setNotification({ show: true, message });
    window.clearTimeout((showNotification._t));
    showNotification._t = window.setTimeout(() => setNotification({ show: false, message: '' }), 2800);
  };

  const validate = () => {
    const e = {};
    if (!tienda.nombre) e.nombre = 'Requerido';
    if (!tienda.descripcion) e.descripcion = 'Requerido';
    if (!tienda.categoria) e.categoria = 'Requerido';
    if (!tienda.telefonoContacto) e.telefonoContacto = 'Requerido';
    if (tienda.telefonoContacto && !/^\d{10}$/.test(tienda.telefonoContacto)) e.telefonoContacto = '10 dígitos';
    if (!tienda.email) e.email = 'Requerido';
    if (tienda.email && !/^\S+@\S+\.\S+$/.test(tienda.email)) e.email = 'Email inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async () => {
    if (!validate()) { showNotification('Revisa los campos marcados'); return; }
    try {
      const r = await fetch(`${API}/api/tienda/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          ...tienda,
          // Enviamos las URLs tal cual (Supabase absoluto o ruta local)
          portadaUrl: tienda.portadaUrl || '',
          logoUrl: tienda.logoUrl || '',
          bannerPromoUrl: tienda.bannerPromoUrl || '',
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.error || 'Error al guardar');
      }
      showNotification('Cambios guardados correctamente ✓');
    } catch (e) {
      showNotification(e.message);
    }
  };

  const subirImagen = async (tipo, file) => {
    if (!file) return;
    setSubiendo(s => ({ ...s, [tipo]: true }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(`${API}/api/tienda/upload/${tipo}`, { method: 'POST', headers, body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Error al subir imagen');

      // Usamos exactamente la URL que devuelve el backend (Supabase o local)
      const webPath = d.url || '';
      const campo = tipo === 'portada' ? 'portadaUrl' : (tipo === 'logo' ? 'logoUrl' : 'bannerPromoUrl');
      setTienda(t => ({ ...t, [campo]: webPath }));
      setImgV(v => ({ ...v, [tipo]: Date.now() }));
      showNotification('Imagen subida correctamente');
    } catch (e) {
      showNotification(e.message);
    } finally {
      setSubiendo(s => ({ ...s, [tipo]: false }));
    }
  };

  const addArray = (campo, valor) => {
    if (!valor) return;
    setTienda(t => {
      const arr = Array.isArray(t[campo]) ? t[campo] : [];
      if (arr.includes(valor)) return t;
      return { ...t, [campo]: [...arr, valor] };
    });
  };
  const removeFromArray = (campo, idx) => setTienda(t => ({ ...t, [campo]: t[campo].filter((_, i) => i !== idx) }));
  const togglePago = (id) => setTienda(t => ({
    ...t, metodosPago: t.metodosPago.includes(id) ? t.metodosPago.filter(x => x !== id) : [...t.metodosPago, id],
  }));
  const setPalette = (paletteId) => {
    const p = PALETA_NEON.find(x => x.id === paletteId) || PALETA_NEON[0];
    setTheme({ from: p.from, to: p.to, contrast: bestTextOn(p.from, p.to) });
  };

  /* ====== Memoizados ====== */
  const headerBg = useMemo(
    () => composeHeaderBg(tienda.portadaUrl, theme.from, theme.to, imgV.portada),
    [tienda.portadaUrl, theme.from, theme.to, imgV.portada]
  );

  /* ====== Render ====== */
  if (cargando) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Cargando tu configuración...</p>
      </div>
    );
  }

  const imageUrl = (p, v) => (p ? withT(toPublicUrl(p), v) : '');

  return (
    <div className="vendedor-container">
      <Nabvendedor />

      {/* Header */}
      <div
        className="tienda-header"
        style={{
          backgroundImage: headerBg,
          backgroundSize: tienda.portadaUrl ? 'cover, cover' : 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          color: 'var(--brand-contrast)',
        }}
      >
        <div className="tienda-header-content">
          <div className="tienda-header-info">
            {tienda.logoUrl && (
              <img
                src={imageUrl(tienda.logoUrl, imgV.logo)}
                alt="Logo de la tienda"
                className="tienda-logo"
                loading="lazy"
                decoding="async"
                onError={(e) => { e.currentTarget.src = ''; }}
              />
            )}
            <div>
              <h1 className="tienda-nombre">{tienda.nombre || 'Nombre de tu tienda'}</h1>
              <p className="tienda-descripcion">
                {tienda.descripcion || 'Personaliza completamente tu tienda online'}
              </p>
              <div className="header-pills">
                {tienda.categoria && <Pill>{tienda.categoria}</Pill>}
                {tienda.subcategorias?.slice(0, 2).map((s, i) => <Pill key={i}>{s}</Pill>)}
              </div>
            </div>
          </div>

          {/* Controles header */}
          <div className="header-actions">
            <button
              className="btn btn-ghost"
              onClick={() => setColorMode(m => (m === 'light' ? 'dark' : 'light'))}
              aria-label="Cambiar modo de color"
              title="Claro/Oscuro"
            >
              {colorMode === 'light' ? <FiMoon /> : <FiSun />} {colorMode === 'light' ? 'Oscuro' : 'Claro'}
            </button>
            <button
              className="btn btn-primary"
              onClick={guardar}
              aria-label="Guardar cambios"
            >
              <FiCheck /> Guardar
            </button>
            <button
              className="btn btn-ghost show-on-mobile"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menú"
            >
              <FiMenu />
            </button>
          </div>
        </div>
      </div>

      {/* Panel principal */}
      <div className="config-panel">
        {/* Sidebar / Drawer */}
        <aside
          className={`sidebar ${drawerOpen ? 'open' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Menú de configuración"
        >
          <button className="drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Cerrar menú">
            <FiX />
          </button>

          <div
            className={`sidebar-item ${tab === 'general' ? 'active' : ''}`}
            onClick={() => { setTab('general'); setDrawerOpen(false); }}
            role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setTab('general')}
          >
            <FiSettings className="sidebar-icon" /> Información General
          </div>
          <div
            className={`sidebar-item ${tab === 'apariencia' ? 'active' : ''}`}
            onClick={() => { setTab('apariencia'); setDrawerOpen(false); }}
            role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setTab('apariencia')}
          >
            <FiImage className="sidebar-icon" /> Apariencia
          </div>
          <div
            className={`sidebar-item ${tab === 'pagos' ? 'active' : ''}`}
            onClick={() => { setTab('pagos'); setDrawerOpen(false); }}
            role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setTab('pagos')}
          >
            <FiCreditCard className="sidebar-icon" /> Pagos & Envíos
          </div>
          <div
            className={`sidebar-item ${tab === 'redes' ? 'active' : ''}`}
            onClick={() => { setTab('redes'); setDrawerOpen(false); }}
            role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setTab('redes')}
          >
            <FiShare2 className="sidebar-icon" /> Redes Sociales
          </div>
          <div
            className={`sidebar-item ${tab === 'seo' ? 'active' : ''}`}
            onClick={() => { setTab('seo'); setDrawerOpen(false); }}
            role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setTab('seo')}
          >
            <FiTag className="sidebar-icon" /> SEO & Marketing
          </div>

          <button className="btn btn-primary sidebar-save" onClick={guardar}>
            <FiCheck /> Guardar Cambios
          </button>

          <div className="sidebar-tip">
            <h4>Consejo Profesional</h4>
            <p>
              {tab === 'general' && 'Completa toda la información para que tus clientes te conozcan mejor.'}
              {tab === 'apariencia' && 'Una imagen profesional aumenta la confianza en tu tienda.'}
              {tab === 'pagos' && 'Ofrece múltiples métodos de pago para aumentar tus ventas.'}
              {tab === 'redes' && 'Conecta tus redes sociales para construir una comunidad.'}
              {tab === 'seo' && 'Usa palabras clave relevantes para mejorar tu visibilidad.'}
            </p>
          </div>
        </aside>

        {/* Overlay del drawer en móvil */}
        {drawerOpen && <div className="drawer-scrim" onClick={() => setDrawerOpen(false)} aria-hidden="true" />}

        {/* Contenido */}
        <main className="content-area">
          {tab === 'general' && (
            <div>

              <Card title={<SectionTitle icon={FiImage}>Imágenes de la Tienda</SectionTitle>}>
                {/* Portada */}
                <ImageUploader
                  label="Portada de la Tienda"
                  value={tienda.portadaUrl ? imageUrl(tienda.portadaUrl, imgV.portada) : ''}
                  onUpload={(f) => subirImagen('portada', f)}
                  busy={subiendo.portada}
                  ratio="1920 / 500"
                />
                <p className="form-hint">Aparece en la parte superior de tu tienda (recomendado 1920×500 px).</p>

                {/* Logo */}
                <ImageUploader
                  label="Logo de la Tienda"
                  value={tienda.logoUrl ? imageUrl(tienda.logoUrl, imgV.logo) : ''}
                  onUpload={(f) => subirImagen('logo', f)}
                  busy={subiendo.logo}
                  previewHeight={150}
                />
                <p className="form-hint">Logo cuadrado, fondo transparente (recomendado 500×500 px).</p>
              </Card>

              <Card title={<SectionTitle icon={FiInfo}>Información Básica</SectionTitle>}>
                <div className="form-row">
                  <FormField label="Nombre de la Tienda" required error={errors.nombre}>
                    <input
                      className="form-input"
                      placeholder="Ej: Moda Express"
                      value={tienda.nombre}
                      aria-invalid={!!errors.nombre}
                      onChange={e => { setTienda({ ...tienda, nombre: e.target.value }); if (errors.nombre) validate(); }}
                    />
                  </FormField>

                  <FormField label="Categoría Principal" required error={errors.categoria}>
                    <select
                      className="form-select"
                      value={tienda.categoria ?? ''}  // ← evita null
                      aria-invalid={!!errors.categoria}
                      onChange={e => { setTienda({ ...tienda, categoria: e.target.value }); if (errors.categoria) validate(); }}
                    >
                      <option value="">Selecciona una categoría</option>
                      {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </FormField>
                </div>

                <FormField label="Descripción" required error={errors.descripcion}>
                  <textarea
                    className="form-textarea"
                    placeholder="Describe qué hace única a tu tienda..."
                    maxLength={250}
                    value={tienda.descripcion}
                    aria-invalid={!!errors.descripcion}
                    onChange={e => { setTienda({ ...tienda, descripcion: e.target.value }); if (errors.descripcion) validate(); }}
                  />
                  <div className="char-counter">{tienda.descripcion?.length || 0}/250</div>
                </FormField>

                <FormField label="Subcategorías" hint="Presiona Enter para agregar">
                  <input
                    className="form-input"
                    placeholder="Ej: Ropa deportiva"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const v = e.currentTarget.value.trim();
                        if (v) addArray('subcategorias', v);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <div className="chip-container">
                    {tienda.subcategorias.map((s, i) => (
                      <div key={i} className="chip">
                        {s}
                        <button className="chip-remove" onClick={() => removeFromArray('subcategorias', i)} aria-label="Quitar">×</button>
                      </div>
                    ))}
                  </div>
                </FormField>
              </Card>

              <Card title={<SectionTitle icon={FiPhone}>Información de Contacto</SectionTitle>}>
                <div className="form-row">
                  <FormField label="Teléfono de Contacto" required error={errors.telefonoContacto} hint="Este número será visible para tus clientes">
                    <input
                      className="form-input"
                      placeholder="5512345678"
                      inputMode="numeric"
                      maxLength={10}
                      value={tienda.telefonoContacto}
                      aria-invalid={!!errors.telefonoContacto}
                      onChange={e => { setTienda({ ...tienda, telefonoContacto: e.target.value.replace(/\D/g, '') }); if (errors.telefonoContacto) validate(); }}
                    />
                  </FormField>

                  <FormField label="Email de Contacto" required error={errors.email} hint="Usa un email profesional">
                    <input
                      className="form-input"
                      placeholder="contacto@mitienda.com"
                      type="email"
                      inputMode="email"
                      value={tienda.email}
                      aria-invalid={!!errors.email}
                      onChange={e => { setTienda({ ...tienda, email: e.target.value }); if (errors.email) validate(); }}
                    />
                  </FormField>
                </div>
              </Card>

              <Card title={<SectionTitle icon={FiClock}>Horario de Atención</SectionTitle>} subtitle="Especifica tus horarios">
                <div className="grid-responsive">
                  {DIAS_SEMANA.map(d => (
                    <FormField key={d.id} label={d.label}>
                      <input
                        className="form-input"
                        placeholder="Ej: 9:00 - 18:00"
                        value={tienda.horario[d.id] || ''}
                        onChange={e => setTienda({
                          ...tienda,
                          horario: { ...tienda.horario, [d.id]: e.target.value }
                        })}
                      />
                    </FormField>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {tab === 'apariencia' && (
            <div>
              <Card title={<SectionTitle icon={FiImage}>Banner Promocional</SectionTitle>} subtitle="Destaca promociones (recomendado 1200×300 px)">
                <ImageUploader
                  label="Banner"
                  value={tienda.bannerPromoUrl ? imageUrl(tienda.bannerPromoUrl, imgV.banner) : ''}
                  onUpload={(f) => subirImagen('banner', f)}
                  busy={subiendo.banner}
                  ratio="1200 / 300"
                />
              </Card>

              <Card title={<SectionTitle>Paleta de Colores</SectionTitle>} subtitle="Elige una paleta o define tus colores">
                <div className="color-palette-grid">
                  {PALETA_NEON.map(p => {
                    const selected = theme.from === p.from && theme.to === p.to;
                    return (
                      <div
                        key={p.id}
                        className={`color-option ${selected ? 'selected' : ''}`}
                        onClick={() => setPalette(p.id)}
                        title={p.name}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setPalette(p.id)}
                      >
                        <div className="color-swatch" style={{ background: grad(p.from, p.to) }} />
                        <span className="color-name">{p.name}</span>
                        <div className="color-check" style={{ visibility: selected ? 'visible' : 'hidden' }}>✓</div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card title={<SectionTitle>Colores de marca (personalizados)</SectionTitle>} subtitle="El texto se ajusta automáticamente">
                <div className="form-row">
                  <FormField label="Color inicial">
                    <input
                      type="color"
                      className="form-input color-input"
                      value={theme.from}
                      onChange={e => setTheme(th => ({ ...th, from: e.target.value, contrast: bestTextOn(e.target.value, th.to) }))}
                    />
                  </FormField>
                  <FormField label="Color final">
                    <input
                      type="color"
                      className="form-input color-input"
                      value={theme.to}
                      onChange={e => setTheme(th => ({ ...th, to: e.target.value, contrast: bestTextOn(th.from, e.target.value) }))}
                    />
                  </FormField>
                </div>

                <div
                  className="color-preview"
                  style={{
                    backgroundImage: tienda.portadaUrl
                      ? `linear-gradient(135deg, ${theme.from}c7, ${theme.to}c7), url("${imageUrl(tienda.portadaUrl, imgV.portada)}")`
                      : `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    color: theme.contrast,
                  }}
                >
                  Vista previa del tema seleccionado
                </div>
              </Card>
            </div>
          )}

          {tab === 'pagos' && (
            <div>
              <Card title={<SectionTitle icon={FiCreditCard}>Métodos de Pago</SectionTitle>} subtitle="Selecciona los métodos que aceptas">
                <div className="checkbox-group">
                  {METODOS_PAGO.map(m => (
                    <div className="checkbox-item" key={m}>
                      <input
                        type="checkbox"
                        id={`pago-${m}`}
                        checked={tienda.metodosPago.includes(m)}
                        onChange={() => togglePago(m)}
                      />
                      <label htmlFor={`pago-${m}`} className="checkbox-label">{m}</label>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title={<SectionTitle icon={FiTruck}>Políticas de Envío</SectionTitle>}>
                <div className="form-row">
                  <FormField label="Cobertura de Envíos">
                    <select
                      className="form-select"
                      value={tienda.envioCobertura ?? ''}
                      onChange={e => setTienda({ ...tienda, envioCobertura: e.target.value })}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="local">Solo local</option>
                      <option value="nacional">Nacional</option>
                      <option value="internacional">Internacional</option>
                    </select>
                  </FormField>
                  <FormField label="Costo de Envío">
                    <input
                      className="form-input"
                      placeholder="Ej: $50 o Gratis para compras mayores a $500"
                      value={tienda.envioCosto}
                      onChange={e => setTienda({ ...tienda, envioCosto: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Tiempo de Entrega">
                    <input
                      className="form-input"
                      placeholder="Ej: 3-5 días hábiles"
                      value={tienda.envioTiempo}
                      onChange={e => setTienda({ ...tienda, envioTiempo: e.target.value })}
                    />
                  </FormField>
                </div>
              </Card>

              <Card title={<SectionTitle icon={FiRefreshCw}>Política de Devoluciones</SectionTitle>}>
                <FormField>
                  <textarea
                    className="form-textarea"
                    placeholder="Ej: Aceptamos devoluciones dentro de los 15 días posteriores a la compra..."
                    value={tienda.devoluciones}
                    onChange={e => setTienda({ ...tienda, devoluciones: e.target.value })}
                  />
                </FormField>
              </Card>
            </div>
          )}

          {tab === 'redes' && (
            <div>
              <Card title={<SectionTitle icon={FiShare2}>Redes Sociales</SectionTitle>} subtitle="Conecta tus redes">
                <div className="grid-responsive">
                  <FormField label={<><FiFacebook style={{ marginRight: 8, color: '#1877F2' }} /> Facebook</>}>
                    <input
                      className="form-input"
                      placeholder="https://facebook.com/tu-tienda"
                      value={tienda.redes.facebook}
                      onChange={e => setTienda({ ...tienda, redes: { ...tienda.redes, facebook: normalizeUrl(e.target.value) } })}
                    />
                  </FormField>
                  <FormField label={<><FiInstagram style={{ marginRight: 8, color: '#E1306C' }} /> Instagram</>}>
                    <input
                      className="form-input"
                      placeholder="https://instagram.com/tu-tienda"
                      value={tienda.redes.instagram}
                      onChange={e => setTienda({ ...tienda, redes: { ...tienda.redes, instagram: normalizeUrl(e.target.value) } })}
                    />
                  </FormField>
                  <FormField label={<><FiYoutube style={{ marginRight: 8, color: '#000' }} /> TikTok</>}>
                    <input
                      className="form-input"
                      placeholder="https://tiktok.com/@tu-tienda"
                      value={tienda.redes.tiktok}
                      onChange={e => setTienda({ ...tienda, redes: { ...tienda.redes, tiktok: normalizeUrl(e.target.value) } })}
                    />
                  </FormField>
                </div>

                <div className="social-preview-container">
                  <h4>Vista Previa</h4>
                  <div className="social-preview-group">
                    {tienda.redes.facebook && <a href={tienda.redes.facebook} target="_blank" rel="noreferrer" className="social-preview" style={{ background: '#1877F2' }}><FiFacebook /> Facebook</a>}
                    {tienda.redes.instagram && <a href={tienda.redes.instagram} target="_blank" rel="noreferrer" className="social-preview" style={{ background: '#E1306C' }}><FiInstagram /> Instagram</a>}
                    {tienda.redes.tiktok && <a href={tienda.redes.tiktok} target="_blank" rel="noreferrer" className="social-preview" style={{ background: '#000' }}><FiYoutube /> TikTok</a>}
                    {!tienda.redes.facebook && !tienda.redes.instagram && !tienda.redes.tiktok && (
                      <p className="no-socials">Agrega tus redes sociales para mostrarlas aquí</p>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {tab === 'seo' && (
            <div>
              <Card title={<SectionTitle icon={FiTag}>Palabras Clave (SEO)</SectionTitle>} subtitle="Mejora tu visibilidad">
                <input
                  className="form-input"
                  placeholder="Escribe una palabra clave y presiona Enter"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const v = e.currentTarget.value.trim();
                      if (v) addArray('seoKeywords', v);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <div className="chip-container">
                  {tienda.seoKeywords.map((k, i) => (
                    <div key={i} className="chip">
                      {k}
                      <button className="chip-remove" onClick={() => removeFromArray('seoKeywords', i)} aria-label="Quitar">×</button>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title={<SectionTitle>Descripción para SEO</SectionTitle>} subtitle="Óptimo 150–160 caracteres">
                <textarea
                  className="form-textarea"
                  placeholder="Describe tu tienda con palabras clave importantes..."
                  maxLength={160}
                  value={tienda.seoDescripcion}
                  onChange={e => setTienda({ ...tienda, seoDescripcion: e.target.value })}
                />
                <div className="char-counter" data-ok={tienda.seoDescripcion.length >= 150 && tienda.seoDescripcion.length <= 160}>
                  {tienda.seoDescripcion.length}/160 caracteres
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* CTA sticky móvil */}
      <div className="sticky-cta show-on-mobile">
        <button className="btn btn-primary" onClick={guardar}><FiCheck /> Guardar</button>
      </div>

      {/* Toast */}
      <Toast open={notification.show} message={notification.message} />
    </div>
  );
}

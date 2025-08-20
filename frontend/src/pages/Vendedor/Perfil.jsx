// frontend/src/pages/Vendedor/Perfil.jsx
import { useEffect, useState } from 'react';
import Nabvendedor from './Nabvendedor';
import {
  FiSettings, FiImage, FiInfo, FiCreditCard, FiShare2, FiTag,
  FiClock, FiPhone, FiTruck, FiRefreshCw, FiCheck,
  FiFacebook, FiInstagram, FiYoutube
} from 'react-icons/fi';
import './Vendedor.css';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const CATEGORIAS = ['Electrónica', 'Moda', 'Hogar', 'Alimentos', 'Belleza', 'Juguetes', 'Otros'];
const METODOS_PAGO = ['tarjeta', 'transferencia', 'efectivo', 'contraentrega', 'paypal'];
const DIAS_SEMANA = [
  { id: 'lun', label: 'Lunes' },
  { id: 'mar', label: 'Martes' },
  { id: 'mie', label: 'Miércoles' },
  { id: 'jue', label: 'Jueves' },
  { id: 'vie', label: 'Viernes' },
  { id: 'sab', label: 'Sábado' },
  { id: 'dom', label: 'Domingo' },
];

// Paletas
const PALETA_NEON = [
  { id: 'neon-purple', name: 'Neon Purple', from: '#6d28d9', to: '#c026d3' },
  { id: 'neon-blue',   name: 'Neon Blue',   from: '#0369a1', to: '#0ea5e9' },
  { id: 'neon-green',  name: 'Neon Green',  from: '#059669', to: '#10b981' },
  { id: 'neon-orange', name: 'Neon Orange', from: '#ea580c', to: '#f97316' },
  { id: 'neon-pink',   name: 'Neon Pink',   from: '#be185d', to: '#ec4899' },
  { id: 'neon-cyan',   name: 'Neon Cyan',   from: '#0e7490', to: '#06b6d4' },
  { id: 'neon-red',    name: 'Neon Red',    from: '#b91c1c', to: '#ef4444' },
];

// Utils
const grad = (from, to) => `linear-gradient(135deg, ${from}, ${to})`;

// Versionador por imagen para invalidar caché solo al subir
const withT = (url, t) => (url ? `${url}${url.includes('?') ? '&' : '?'}t=${t || 0}` : '');

// Extrae SIEMPRE un **web path** seguro (sin rutas locales).
// Preferimos /TiendaUploads/... y aceptamos /uploads/... por compat.
const toWebPath = (u) => {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) {
    try { return new URL(u).pathname; } catch { return ''; }
  }
  const clean = String(u).replace(/\\/g, '/'); // E:\ -> E:/
  const lower = clean.toLowerCase();
  const marks = ['/tiendauploads/', 'tiendauploads/', '/uploads/', 'uploads/'];
  for (const m of marks) {
    const i = lower.indexOf(m);
    if (i !== -1) {
      // recortamos desde la marca y garantizamos slash inicial
      const slice = clean.slice(i);
      return slice.startsWith('/') ? slice : `/${slice}`;
    }
  }
  // Si ya viene relativo, nos aseguramos del slash
  return clean.startsWith('/') ? clean : `/${clean}`;
};

// Convierte a URL pública usando API + web path
const toPublicUrl = (u) => {
  const p = toWebPath(u);
  return p ? `${API}${encodeURI(p)}` : '';
};

// Helpers de color/contraste
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

// Header con gradiente + portada
const composeHeaderBg = (portadaUrl, from, to, ver) => {
  const layers = [`linear-gradient(135deg, ${from}, ${to})`];
  if (portadaUrl) layers.push(`url("${withT(toPublicUrl(portadaUrl), ver)}")`);
  return layers.join(', ');
};

export default function VendedorPerfil() {
  const [theme, setTheme] = useState({ from: '#fdfdfdff', to: '#4236e6ff', contrast: '#ffffff' });

  // Versión por imagen
  const [imgV, setImgV] = useState({ portada: 0, logo: 0, banner: 0 });

  const [tienda, setTienda] = useState({
    nombre: '',
    descripcion: '',
    portadaUrl: '',
    logoUrl: '',
    categoria: '',
    subcategorias: [],
    telefonoContacto: '',
    email: '',
    horario: Object.fromEntries(DIAS_SEMANA.map(d => [d.id, ''])),
    metodosPago: [],
    redes: { facebook: '', instagram: '', tiktok: '' },
    envioCobertura: '',
    envioCosto: '',
    envioTiempo: '',
    devoluciones: '',
    colorPrincipal: grad('#0084ffff', '#faebfcff'),
    bannerPromoUrl: '',
    seoKeywords: [],
    seoDescripcion: '',
  });

  const [tab, setTab] = useState('general');
  const [subiendo, setSubiendo] = useState({ portada: false, logo: false, banner: false });
  const [cargando, setCargando] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '' });

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const headers = { 'x-user-id': usuario?.id };

  // Cargar config de tienda (solo web paths)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/api/tienda/me`, { headers });
        const d = await r.json();
        if (r.ok && d) {
          const normal = {
            ...d,
            portadaUrl: toWebPath(d.portadaUrl),
            logoUrl: toWebPath(d.logoUrl),
            bannerPromoUrl: toWebPath(d.bannerPromoUrl),
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
      } finally {
        setCargando(false);
      }
    })();

    document.body.classList.add('vendor-theme');
    return () => {
      document.body.classList.remove('vendor-theme');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Propagar tema a CSS
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

  const showNotification = (message) => {
    setNotification({ show: true, message });
    setTimeout(() => setNotification({ show: false, message: '' }), 3000);
  };

  const guardar = async () => {
    if (!tienda.nombre || !tienda.descripcion || !tienda.categoria || !tienda.telefonoContacto || !tienda.email) {
      showNotification('Por favor completa todos los campos requeridos');
      return;
    }
    if (tienda.telefonoContacto && !/^\d{10}$/.test(tienda.telefonoContacto)) {
      showNotification('El teléfono debe tener exactamente 10 dígitos');
      return;
    }
    try {
      const r = await fetch(`${API}/api/tienda/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        // Siempre enviamos web paths (no rutas locales)
        body: JSON.stringify({
          ...tienda,
          portadaUrl: toWebPath(tienda.portadaUrl),
          logoUrl: toWebPath(tienda.logoUrl),
          bannerPromoUrl: toWebPath(tienda.bannerPromoUrl),
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
      const r = await fetch(`${API}/api/tienda/upload/${tipo}`, {
        method: 'POST',
        headers,
        body: fd,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Error al subir imagen');

      // Guardamos solo el web path (nada de E:\...)
      const webPath = toWebPath(d.url);

      const campo = tipo === 'portada' ? 'portadaUrl' : (tipo === 'logo' ? 'logoUrl' : 'bannerPromoUrl');
      setTienda(t => ({ ...t, [campo]: webPath }));

      // Bump de versión para invalidar caché SOLO de esa imagen
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

  const removeFromArray = (campo, idx) => {
    setTienda(t => ({ ...t, [campo]: t[campo].filter((_, i) => i !== idx) }));
  };

  const togglePago = (id) => {
    setTienda(t => ({
      ...t,
      metodosPago: t.metodosPago.includes(id)
        ? t.metodosPago.filter(x => x !== id)
        : [...t.metodosPago, id],
    }));
  };

  const setPalette = (paletteId) => {
    const p = PALETA_NEON.find(x => x.id === paletteId) || PALETA_NEON[0];
    setTheme({
      from: p.from,
      to: p.to,
      contrast: bestTextOn(p.from, p.to),
    });
  };

  if (cargando) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Cargando tu configuración...</p>
      </div>
    );
  }

  const headerBg = composeHeaderBg(tienda.portadaUrl, theme.from, theme.to, imgV.portada);

  return (
    <div className="vendedor-container">
      <Nabvendedor />

      {/* Header con imagen/gradiente + overlay y contraste automático */}
      <div
        className="tienda-header"
        style={{
          backgroundImage: headerBg,
          color: 'var(--brand-contrast)',
        }}
      >
        <div className="tienda-header-content">
          <div className="tienda-header-info">
            {tienda.logoUrl && (
              <img
                src={withT(toPublicUrl(tienda.logoUrl), imgV.logo)}
                alt="logo"
                className="tienda-logo"
                onError={(e) => { e.currentTarget.src = ''; }}
              />
            )}
            <div>
              <h1 className="tienda-nombre">
                {tienda.nombre || 'Nombre de tu tienda'}
              </h1>
              <p className="tienda-descripcion">
                {tienda.descripcion || 'Personaliza completamente tu tienda online'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Panel de configuración */}
      <div className="config-panel">
        {/* Sidebar */}
        <div className="sidebar">
          <div
            className={`sidebar-item ${tab === 'general' ? 'active' : ''}`}
            onClick={() => setTab('general')}
          >
            <FiSettings className="sidebar-icon" />
            Información General
          </div>
          <div
            className={`sidebar-item ${tab === 'apariencia' ? 'active' : ''}`}
            onClick={() => setTab('apariencia')}
          >
            <FiImage className="sidebar-icon" />
            Apariencia
          </div>
          <div
            className={`sidebar-item ${tab === 'pagos' ? 'active' : ''}`}
            onClick={() => setTab('pagos')}
          >
            <FiCreditCard className="sidebar-icon" />
            Pagos & Envíos
          </div>
          <div
            className={`sidebar-item ${tab === 'redes' ? 'active' : ''}`}
            onClick={() => setTab('redes')}
          >
            <FiShare2 className="sidebar-icon" />
            Redes Sociales
          </div>
          <div
            className={`sidebar-item ${tab === 'seo' ? 'active' : ''}`}
            onClick={() => setTab('seo')}
          >
            <FiTag className="sidebar-icon" />
            SEO & Marketing
          </div>

          <button
            className="btn btn-primary"
            onClick={guardar}
            style={{ marginTop: '1.5rem', width: '100%' }}
          >
            <FiCheck style={{ marginRight: 8 }} />
            Guardar Cambios
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
        </div>

        {/* Contenido principal */}
        <div className="content-area">
          {tab === 'general' && (
            <div>
              <div className="form-section">
                <h3><FiImage style={{ marginRight: 10 }} /> Imágenes de la Tienda</h3>

                <div className="form-group">
                  <label className="form-label">Portada de la Tienda</label>
                  <p className="form-hint">
                    Esta imagen aparecerá en la parte superior de tu tienda (recomendado 1920x500 px)
                  </p>
                  <div className="image-upload">
                    {tienda.portadaUrl ? (
                      <img
                        src={withT(toPublicUrl(tienda.portadaUrl), imgV.portada)}
                        alt="portada"
                        className="image-preview"
                        onError={(e) => { e.currentTarget.src = ''; }}
                      />
                    ) : (
                      <p className="image-upload-placeholder">Arrastra una imagen o haz clic para subir</p>
                    )}
                    <label className="btn btn-upload">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => subirImagen('portada', e.target.files?.[0])}
                        style={{ display: 'none' }}
                      />
                      {subiendo.portada ? 'Subiendo...' : 'Seleccionar Imagen'}
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Logo de la Tienda</label>
                  <p className="form-hint">
                    Tu logo debe ser cuadrado y con fondo transparente (recomendado 500x500 px)
                  </p>
                  <div className="image-upload">
                    {tienda.logoUrl ? (
                      <img
                        src={withT(toPublicUrl(tienda.logoUrl), imgV.logo)}
                        alt="logo"
                        className="image-preview"
                        style={{ maxHeight: 150, width: 'auto' }}
                        onError={(e) => { e.currentTarget.src = ''; }}
                      />
                    ) : (
                      <p className="image-upload-placeholder">Tu logo ayuda a los clientes a reconocer tu marca</p>
                    )}
                    <label className="btn btn-upload">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => subirImagen('logo', e.target.files?.[0])}
                        style={{ display: 'none' }}
                      />
                      {subiendo.logo ? 'Subiendo...' : 'Seleccionar Logo'}
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3><FiInfo style={{ marginRight: 10 }} /> Información Básica</h3>

                <div className="form-group">
                  <label className="form-label">Nombre de la Tienda*</label>
                  <input
                    className="form-input"
                    placeholder="Ej: Moda Express"
                    value={tienda.nombre}
                    onChange={e => setTienda({ ...tienda, nombre: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Descripción*</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Describe qué hace única a tu tienda..."
                    value={tienda.descripcion}
                    onChange={e => setTienda({ ...tienda, descripcion: e.target.value })}
                  />
                  <p className="form-hint">
                    Esta descripción aparecerá en la página principal de tu tienda (máximo 250 caracteres).
                  </p>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Categoría Principal*</label>
                    <select
                      className="form-select"
                      value={tienda.categoria}
                      onChange={e => setTienda({ ...tienda, categoria: e.target.value })}
                    >
                      <option value="">Selecciona una categoría</option>
                      {CATEGORIAS.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Subcategorías</label>
                    <input
                      className="form-input"
                      placeholder="Ej: Ropa deportiva (presiona Enter para agregar)"
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
                          <button
                            className="chip-remove"
                            onClick={() => removeFromArray('subcategorias', i)}
                            aria-label="Quitar"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3><FiPhone style={{ marginRight: 10 }} /> Información de Contacto</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Teléfono de Contacto*</label>
                    <input
                      className="form-input"
                      placeholder="Ej: 5512345678"
                      maxLength={10}
                      value={tienda.telefonoContacto}
                      onChange={e => setTienda({ ...tienda, telefonoContacto: e.target.value })}
                    />
                    <p className="form-hint">
                      Este número será visible para tus clientes
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email de Contacto*</label>
                    <input
                      className="form-input"
                      placeholder="Ej: contacto@mitienda.com"
                      type="email"
                      value={tienda.email}
                      onChange={e => setTienda({ ...tienda, email: e.target.value })}
                    />
                    <p className="form-hint">Usa un email profesional</p>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3><FiClock style={{ marginRight: 10 }} /> Horario de Atención</h3>
                <p className="form-hint" style={{ marginBottom: '1rem' }}>
                  Especifica los horarios en que atiendes a tus clientes
                </p>
                <div className="grid-responsive">
                  {DIAS_SEMANA.map(d => (
                    <div className="form-group" key={d.id}>
                      <label className="form-label">{d.label}</label>
                      <input
                        className="form-input"
                        placeholder="Ej: 9:00 - 18:00"
                        value={tienda.horario[d.id] || ''}
                        onChange={e => setTienda({
                          ...tienda,
                          horario: { ...tienda.horario, [d.id]: e.target.value }
                        })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'apariencia' && (
            <div>
              <div className="form-section">
                <h3>Banner Promocional</h3>
                <p className="form-hint">
                  Este banner aparecerá en tu tienda para destacar promociones (recomendado 1200x300 px)
                </p>
                <div className="image-upload">
                  {tienda.bannerPromoUrl ? (
                    <img
                      src={withT(toPublicUrl(tienda.bannerPromoUrl), imgV.banner)}
                      alt="banner"
                      className="image-preview"
                      onError={(e) => { e.currentTarget.src = ''; }}
                    />
                  ) : (
                    <p className="image-upload-placeholder">Puedes subir un banner para promociones especiales</p>
                  )}
                  <label className="btn btn-upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => subirImagen('banner', e.target.files?.[0])}
                      style={{ display: 'none' }}
                    />
                    {subiendo.banner ? 'Subiendo...' : 'Seleccionar Banner'}
                  </label>
                </div>
              </div>

              {/* Paletas NEON preset */}
              <div className="form-section">
                <h3>Paleta de Colores</h3>
                <p className="form-hint">Elige una paleta o define tus colores de marca.</p>

                <div className="color-palette-grid">
                  {PALETA_NEON.map(p => {
                    const selected = theme.from === p.from && theme.to === p.to;
                    return (
                      <div
                        key={p.id}
                        className={`color-option ${selected ? 'selected' : ''}`}
                        onClick={() => setPalette(p.id)}
                        title={p.name}
                      >
                        <div
                          className="color-swatch"
                          style={{ background: grad(p.from, p.to) }}
                        />
                        <span className="color-name">{p.name}</span>
                        <div
                          className="color-check"
                          style={{ visibility: selected ? 'visible' : 'hidden' }}
                        >
                          ✓
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Colores personalizados + vista previa con portada */}
              <div className="form-section">
                <h3>Colores de marca (personalizados)</h3>
                <p className="form-hint">
                  Elige dos colores para tu gradiente. El texto se ajusta automáticamente para que se lea bien.
                </p>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Color inicial</label>
                    <input
                      type="color"
                      className="form-input color-input"
                      value={theme.from}
                      onChange={e =>
                        setTheme(th => ({ ...th, from: e.target.value, contrast: bestTextOn(e.target.value, th.to) }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Color final</label>
                    <input
                      type="color"
                      className="form-input color-input"
                      value={theme.to}
                      onChange={e =>
                        setTheme(th => ({ ...th, to: e.target.value, contrast: bestTextOn(th.from, e.target.value) }))
                      }
                    />
                  </div>
                </div>

                <div
                  className="color-preview"
                  style={{
                    backgroundImage: tienda.portadaUrl
                      ? `linear-gradient(135deg, ${theme.from}c7, ${theme.to}c7), url("${withT(toPublicUrl(tienda.portadaUrl), imgV.portada)}")`
                      : `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    color: theme.contrast,
                  }}
                >
                  Vista previa del tema seleccionado
                </div>
              </div>
            </div>
          )}

          {tab === 'pagos' && (
            <div>
              <div className="form-section">
                <h3><FiCreditCard style={{ marginRight: 10 }} /> Métodos de Pago</h3>
                <p className="form-hint">
                  Selecciona los métodos de pago que aceptas en tu tienda
                </p>
                <div className="checkbox-group">
                  {METODOS_PAGO.map(m => (
                    <div className="checkbox-item" key={m}>
                      <input
                        type="checkbox"
                        id={`pago-${m}`}
                        checked={tienda.metodosPago.includes(m)}
                        onChange={() => togglePago(m)}
                      />
                      <label
                        htmlFor={`pago-${m}`}
                        className="checkbox-label"
                      >
                        {m}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h3><FiTruck style={{ marginRight: 10 }} /> Políticas de Envío</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Cobertura de Envíos</label>
                    <select
                      className="form-select"
                      value={tienda.envioCobertura}
                      onChange={e => setTienda({ ...tienda, envioCobertura: e.target.value })}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="local">Solo local</option>
                      <option value="nacional">Nacional</option>
                      <option value="internacional">Internacional</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Costo de Envío</label>
                    <input
                      className="form-input"
                      placeholder="Ej: $50 o Gratis para compras mayores a $500"
                      value={tienda.envioCosto}
                      onChange={e => setTienda({ ...tienda, envioCosto: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tiempo de Entrega</label>
                    <input
                      className="form-input"
                      placeholder="Ej: 3-5 días hábiles"
                      value={tienda.envioTiempo}
                      onChange={e => setTienda({ ...tienda, envioTiempo: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3><FiRefreshCw style={{ marginRight: 10 }} /> Política de Devoluciones</h3>
                <p className="form-hint">Especifica tus condiciones para devoluciones y cambios</p>
                <textarea
                  className="form-textarea"
                  placeholder="Ej: Aceptamos devoluciones dentro de los 15 días posteriores a la compra..."
                  value={tienda.devoluciones}
                  onChange={e => setTienda({ ...tienda, devoluciones: e.target.value })}
                />
              </div>
            </div>
          )}

          {tab === 'redes' && (
            <div>
              <div className="form-section">
                <h3><FiShare2 style={{ marginRight: 10 }} /> Redes Sociales</h3>
                <p className="form-hint">Conecta tus redes sociales para que tus clientes puedan seguirte</p>
                <div className="grid-responsive">
                  <div className="form-group">
                    <label className="form-label">
                      <FiFacebook style={{ marginRight: 8, color: '#1877F2' }} />
                      Facebook
                    </label>
                    <input
                      className="form-input"
                      placeholder="https://facebook.com/tu-tienda"
                      value={tienda.redes.facebook}
                      onChange={e => setTienda({ ...tienda, redes: { ...tienda.redes, facebook: e.target.value } })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <FiInstagram style={{ marginRight: 8, color: '#E1306C' }} />
                      Instagram
                    </label>
                    <input
                      className="form-input"
                      placeholder="https://instagram.com/tu-tienda"
                      value={tienda.redes.instagram}
                      onChange={e => setTienda({ ...tienda, redes: { ...tienda.redes, instagram: e.target.value } })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <FiYoutube style={{ marginRight: 8, color: '#FF0000' }} />
                      TikTok
                    </label>
                    <input
                      className="form-input"
                      placeholder="https://tiktok.com/@tu-tienda"
                      value={tienda.redes.tiktok}
                      onChange={e => setTienda({ ...tienda, redes: { ...tienda.redes, tiktok: e.target.value } })}
                    />
                  </div>
                </div>

                <div className="social-preview-container">
                  <h4>Vista Previa</h4>
                  <div className="social-preview-group">
                    {tienda.redes.facebook && (
                      <a href={tienda.redes.facebook} target="_blank" rel="noreferrer" className="social-preview" style={{ background: '#1877F2' }}>
                        <FiFacebook /> Facebook
                      </a>
                    )}
                    {tienda.redes.instagram && (
                      <a href={tienda.redes.instagram} target="_blank" rel="noreferrer" className="social-preview" style={{ background: '#E1306C' }}>
                        <FiInstagram /> Instagram
                      </a>
                    )}
                    {tienda.redes.tiktok && (
                      <a href={tienda.redes.tiktok} target="_blank" rel="noreferrer" className="social-preview" style={{ background: '#000000' }}>
                        <FiYoutube /> TikTok
                      </a>
                    )}
                    {!tienda.redes.facebook && !tienda.redes.instagram && !tienda.redes.tiktok && (
                      <p className="no-socials">Agrega tus redes sociales para mostrarlas aquí</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'seo' && (
            <div>
              <div className="form-section">
                <h3><FiTag style={{ marginRight: 10 }} /> Palabras Clave (SEO)</h3>
                <p className="form-hint">Agrega palabras clave que describan tu tienda para mejorar tu visibilidad en buscadores</p>
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
                      <button
                        className="chip-remove"
                        onClick={() => removeFromArray('seoKeywords', i)}
                        aria-label="Quitar"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h3>Descripción para SEO</h3>
                <p className="form-hint">Esta descripción aparecerá en los resultados de búsqueda (óptimo 150-160 caracteres)</p>
                <textarea
                  className="form-textarea"
                  placeholder="Describe tu tienda con palabras clave importantes..."
                  maxLength={160}
                  value={tienda.seoDescripcion}
                  onChange={e => setTienda({ ...tienda, seoDescripcion: e.target.value })}
                />
                <div
                  className="char-counter"
                  style={{
                    color: tienda.seoDescripcion.length >= 150 && tienda.seoDescripcion.length <= 160
                      ? 'var(--success-color)'
                      : '#666',
                  }}
                >
                  {tienda.seoDescripcion.length}/160 caracteres
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notificación */}
      <div className={`notification ${notification.show ? 'show' : ''}`} aria-live="polite">
        {notification.message}
      </div>
    </div>
  );
}

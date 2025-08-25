import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  FiTag, FiBox, FiHash, FiInfo, FiShoppingCart, FiChevronLeft, FiPackage,
  FiAlertTriangle, FiClipboard, FiTruck, FiShield, FiImage, FiExternalLink, FiX
} from 'react-icons/fi';
import './PublicProducto.css';

/* ===================== Config & Utils ===================== */
const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const grad = (from, to) => `linear-gradient(135deg, ${from}, ${to})`;
const withT = (url, t) => (url ? `${url}${url.includes('?') ? '&' : '?'}t=${t || 0}` : '');
const toWebPath = (u) => {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) { try { return new URL(u).pathname; } catch { return ''; } }
  const clean = String(u).replace(/\\/g, '/');
  const lower = clean.toLowerCase();
  const marks = ['/tiendauploads/', 'tiendauploads/', '/uploads/', 'uploads/'];
  for (const m of marks) { const i = lower.indexOf(m); if (i !== -1) { const slice = clean.slice(i); return slice.startsWith('/') ? slice : `/${slice}`; } }
  return clean.startsWith('/') ? clean : `/${clean}`;
};
const toPublicUrl = (u) => { const p = toWebPath(u); return p ? `${API}${encodeURI(p)}` : ''; };

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
const composeHeaderBg = (portadaUrl, from, to, ver) => {
  const layers = [`linear-gradient(135deg, ${from}, ${to})`];
  if (portadaUrl) layers.push(`url("${withT(toPublicUrl(portadaUrl), ver)}")`);
  return layers.join(', ');
};
const money = (n, currency = 'MXN') => (n == null ? '' : Number(n).toLocaleString('es-MX', { style: 'currency', currency }));

/* ===================== Page ===================== */
export default function PublicProducto() {
  const { id, uuid } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState({ from: '#6d28d9', to: '#c026d3', contrast: '#ffffff' });
  const [imgV, setImgV] = useState({ portada: 0, logo: 0 });

  const [tienda, setTienda] = useState({
    nombre: '', descripcion: '',
    portadaUrl: '', logoUrl: '',
    telefonoContacto: '', email: '',
    colorPrincipal: grad('#6d28d9', '#c026d3'),
    redes: { facebook: '', instagram: '', tiktok: '' },
    envioCobertura: '', envioCosto: '', envioTiempo: '', devoluciones: '',
  });

  const [producto, setProducto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [qty, setQty] = useState(1);

  // variantes
  const [selectedOps, setSelectedOps] = useState({});
  const [showConfirm, setShowConfirm] = useState(false); // <-- modal confirmar

  const user = useMemo(() => { try { return JSON.parse(localStorage.getItem('usuario') || '{}'); } catch { return {}; } }, []);
  const headers = useMemo(() => (user?.id ? { 'x-user-id': user.id } : {}), [user?.id]);

  // Sync theme tokens
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--brand-from', theme.from);
    root.setProperty('--brand-to', theme.to);
    root.setProperty('--brand-contrast', theme.contrast);
    root.setProperty('--brand-gradient', grad(theme.from, theme.to));
    root.setProperty('--page-bg', `linear-gradient(135deg, ${theme.from}, ${theme.to})`);
    root.setProperty('--primary-color', theme.from);
    root.setProperty('--primary-hover', theme.from);
  }, [theme]);

  // Try to load store config if there is a session
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!headers['x-user-id']) return;
        const r = await fetch(`${API}/api/tienda/me`, { headers });
        if (!r.ok) return;
        const d = await r.json();
        if (cancelled) return;
        const normal = {
          ...d,
          portadaUrl: toWebPath(d.portadaUrl),
          logoUrl: toWebPath(d.logoUrl),
          colorPrincipal: d.colorPrincipal || grad('#6d28d9', '#c026d3'),
          redes: d.redes || { facebook: '', instagram: '', tiktok: '' },
        };
        setTienda(t => ({ ...t, ...normal }));
        const { from, to } = extractColors(normal.colorPrincipal);
        setTheme({ from, to, contrast: bestTextOn(from, to) });
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [headers['x-user-id']]);

  // Load product
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setErr('');
      try {
        const url = uuid
          ? `${API}/api/v1/productos/public/uuid/${encodeURIComponent(uuid)}`
          : `${API}/api/v1/productos/${encodeURIComponent(id)}`;
        const r = await fetch(url);
        const d = await r.json().catch(() => null);
        if (cancelled) return;

        if (!r.ok || !d || d.error) {
          setErr(d?.error || 'No se pudo cargar el producto'); setProducto(null);
        } else {
          setProducto(d);
        }
      } catch (e) {
        setErr('Error de red al cargar el producto');
        setProducto(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, uuid]);

  // Derivados
  const galeria = useMemo(() => {
    const base = producto?.imagenes || [];
    if (!base.length && producto?.variantes?.length) {
      return producto.variantes.flatMap(v => v.imagenes || []);
    }
    return base;
  }, [producto]);

  const principal = useMemo(() => {
    if (!galeria.length) return '';
    const p = galeria.find(g => g.isPrincipal) || galeria[0];
    return toPublicUrl(p.url);
  }, [galeria]);

  const categorias = useMemo(
    () => (producto?.categorias || []).map(pc => pc?.categoria?.nombre).filter(Boolean),
    [producto?.categorias]
  );

  const atributos = useMemo(
    () => (producto?.atributos || []).filter(a => a?.clave != null && String(a.valor || '').trim() !== ''),
    [producto?.atributos]
  );

  const tipoVariante = producto?.tipo === 'VARIANTE';
  const opciones = useMemo(() => {
    if (!tipoVariante || !Array.isArray(producto?.variantes)) return [];
    const map = new Map();
    for (const v of producto.variantes) {
      const ops = v.opciones || {};
      for (const [k, val] of Object.entries(ops)) {
        if (!map.has(k)) map.set(k, new Set());
        map.get(k).add(String(val));
      }
    }
    return Array.from(map.entries()).map(([nombre, setVals]) => ({ nombre, valores: Array.from(setVals) }));
  }, [tipoVariante, producto?.variantes]);

  const activeVar = useMemo(() => {
    if (!tipoVariante || !producto?.variantes?.length) return null;
    const keys = Object.keys(selectedOps);
    const match = producto.variantes.find(v => {
      const ops = v.opciones || {};
      return keys.length && keys.every(k => String(ops[k]) === String(selectedOps[k]));
    });
    return match || null;
  }, [tipoVariante, producto?.variantes, selectedOps]);

  const rangoPrecio = useMemo(() => {
    if (!tipoVariante) return null;
    const desde = producto?.precioDesde ?? null;
    const hasta = producto?.precioHasta ?? null;
    if (desde == null && hasta == null) {
      const nums = (producto?.variantes || []).map(v => v.precio).filter(v => v != null);
      if (!nums.length) return null;
      return { desde: Math.min(...nums), hasta: Math.max(...nums) };
    }
    return { desde, hasta };
  }, [tipoVariante, producto?.precioDesde, producto?.precioHasta, producto?.variantes]);

  const headerBg = useMemo(
    () => composeHeaderBg(tienda.portadaUrl, theme.from, theme.to, imgV.portada),
    [tienda.portadaUrl, theme.from, theme.to, imgV.portada]
  );

  // Helpers
  const precioMostrar = tipoVariante ? (activeVar?.precio ?? null) : (producto?.precio ?? null);
  const precioComparativoMostrar = tipoVariante ? (activeVar?.precioComparativo ?? null) : (producto?.precioComparativo ?? null);
  const descuentoPct = producto?.descuentoPct ?? (activeVar?.descuentoPct ?? null);

  const stockTotal = producto?.stockTotal ?? producto?.inventario?.stock ?? 0;
  const hayStock = stockTotal > 0 || producto?.inventario?.permitirBackorder;

  const onSelectOpcion = (nombre, valor) => setSelectedOps(prev => ({ ...prev, [nombre]: valor }));
  const addQty = () => setQty(n => Math.max(1, (n || 1) + 1));
  const subQty = () => setQty(n => Math.max(1, (n || 1) - 1));

  // Construye el texto que se envía a WhatsApp
  const buildWhatsAppText = () => {
    const titulo = producto?.nombre || 'Producto';
    const url = window.location.href; // incluye uuid/id y query actuales
    const varianteTxt = activeVar
      ? (activeVar.nombre || Object.values(activeVar.opciones || {}).join(' / '))
      : '';
    const precioTxt = precioMostrar != null ? money(precioMostrar) : 'A consultar';
    const tiendaTxt = tienda?.nombre ? `Tienda: ${tienda.nombre}` : null;

    const lines = [
      `🛒 *Quiero comprar*: ${titulo}`,
      varianteTxt ? `• Variante: ${varianteTxt}` : null,
      `• Cantidad: ${qty}`,
      `• Precio: ${precioTxt}`,
      tiendaTxt,
      '',
      `🔗 ${url}`
    ].filter(Boolean);

    return lines.join('\n');
  };

  // Mostrar modal de confirmación
  const handleWhatsAppClick = () => {
    if (!tienda?.telefonoContacto) return;
    setShowConfirm(true);
  };

  // Confirmar e ir a WhatsApp
  const confirmWhatsApp = () => {
    const phone = tienda?.telefonoContacto?.replace(/\D/g, '') || '';
    const msg = encodeURIComponent(buildWhatsAppText());
    const wa = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(wa, '_blank', 'noopener,noreferrer');
    setShowConfirm(false);
  };

  /* ===================== Render ===================== */
  if (loading) {
    return (
      <div className="pp-loading">
        <div className="pp-spinner" />
        <p>Cargando producto...</p>
      </div>
    );
  }

  if (err || !producto) {
    return (
      <div className="pp-error">
        <p>{err || 'Producto no disponible.'}</p>
        <button className="btn" onClick={() => navigate(-1)}><FiChevronLeft /> Volver</button>
      </div>
    );
  }

  const showEnvio = Boolean(
    producto?.diasPreparacion != null ||
    producto?.claseEnvio ||
    producto?.politicaDevolucion ||
    tienda?.envioCobertura || tienda?.envioCosto || tienda?.envioTiempo || tienda?.devoluciones
  );
  const showDims = Boolean(producto?.altoCm || producto?.anchoCm || producto?.largoCm || producto?.pesoGramos);
  const showAttrs = (producto?.atributos || []).some(a => a?.clave && String(a.valor || '').trim() !== '');

  return (
    <div className="pp-wrap">
      {/* Header tienda */}
      {(tienda?.nombre || tienda?.logoUrl || tienda?.descripcion) && (
        <div className="pp-header" style={{ backgroundImage: headerBg, color: 'var(--brand-contrast)' }}>
          <div className="pp-header-inner">
            <div className="pp-shop">
              {tienda.logoUrl && (
                <img
                  src={withT(toPublicUrl(tienda.logoUrl), imgV.logo)}
                  alt=""
                  className="pp-shop-logo"
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                  loading="lazy"
                  decoding="async"
                />
              )}
              <div className="pp-shop-info">
                {tienda.nombre && <h1 className="pp-shop-name">{tienda.nombre}</h1>}
                {tienda.descripcion && <p className="pp-shop-desc">{tienda.descripcion}</p>}
              </div>
            </div>
            <button className="btn btn-ghost" onClick={() => navigate(-1)}><FiChevronLeft /> Volver</button>
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="pp-container">
        <div className="pp-grid">
          {/* Galería con marco renacentista */}
          <section className="pp-gallery card">
            <div className="pp-gallery-main">
              {principal ? (
                <div className="pp-frame pp-frame--renaissance">
                  <img src={principal} alt={producto?.nombre || ''} className="pp-main-img" />
                  <span className="pp-ornament tl" aria-hidden />
                  <span className="pp-ornament tr" aria-hidden />
                  <span className="pp-ornament bl" aria-hidden />
                  <span className="pp-ornament br" aria-hidden />
                </div>
              ) : (
                <div className="pp-main-placeholder"><FiImage /> Sin imagen</div>
              )}
            </div>

            {galeria.length > 1 && (
              <div className="pp-gallery-thumbs">
                {galeria.map((m, i) => {
                  const src = toPublicUrl(m.url);
                  const active = src === principal;
                  return (
                    <button
                      key={i}
                      className={`pp-thumb ${active ? 'is-active' : ''}`}
                      onClick={() => {
                        const el = document.querySelector('.pp-main-img');
                        if (el) el.src = src;
                      }}
                      aria-label={`Imagen ${i + 1}`}
                    >
                      <div className="pp-thumb-frame">
                        <img src={src} alt={m.alt || ''} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Info principal */}
          <section className="pp-info card">
            <header className="pp-title">
              <h2>{producto?.nombre}</h2>
              {producto?.destacado && <span className="pp-pill">Destacado</span>}
            </header>

            <div className="pp-meta">
              {producto?.marca && <div className="pp-meta-item"><FiTag /> Marca: <strong>{producto.marca}</strong></div>}
              {producto?.sku && <div className="pp-meta-item"><FiHash /> SKU: <strong>{producto.sku}</strong></div>}
              {producto?.gtin && <div className="pp-meta-item"><FiClipboard /> GTIN: <strong>{producto.gtin}</strong></div>}
              {producto?.condicion && <div className="pp-meta-item"><FiBox /> Condición: <strong>{producto.condicion}</strong></div>}
              {!!categorias.length && <div className="pp-meta-item"><FiPackage /> Categorías: <strong>{categorias.join(' / ')}</strong></div>}
            </div>

            {/* Precio */}
            <div className="pp-pricebox">
              {tipoVariante && !activeVar && rangoPrecio ? (
                <div className="pp-price">
                  <span className="pp-price-main">{money(rangoPrecio.desde)} – {money(rangoPrecio.hasta)}</span>
                  <span className="pp-price-note">según variante</span>
                </div>
              ) : (
                <div className="pp-price">
                  {precioMostrar != null
                    ? <span className="pp-price-main">{money(precioMostrar)}</span>
                    : <span className="pp-price-main">Precio a consultar</span>}
                  {(precioComparativoMostrar != null && precioMostrar != null && precioComparativoMostrar > precioMostrar) &&
                    <span className="pp-price-compare">{money(precioComparativoMostrar)}</span>}
                  {(descuentoPct != null && descuentoPct > 0) && <span className="pp-pill-off">-{descuentoPct}%</span>}
                </div>
              )}
              <div className={`pp-stock ${hayStock ? 'ok' : 'out'}`}>
                {hayStock ? `En stock: ${stockTotal}` : <><FiAlertTriangle /> Sin stock</>}
              </div>
            </div>

            {/* Variantes */}
            {tipoVariante && opciones.length > 0 && (
              <div className="pp-variants">
                {opciones.map(op => (
                  <div key={op.nombre} className="pp-variant">
                    <label className="pp-variant-label">{op.nombre}</label>
                    <div className="pp-variant-values">
                      {op.valores.map((val) => {
                        const active = String(selectedOps[op.nombre]) === String(val);
                        return (
                          <button
                            key={val}
                            className={`pp-variant-chip ${active ? 'active' : ''}`}
                            onClick={() => onSelectOpcion(op.nombre, val)}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {activeVar && (
                  <div className="pp-activevar">
                    Variante seleccionada: <strong>{activeVar.nombre || Object.values(activeVar.opciones || {}).join(' / ')}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Cantidad + Acciones */}
            <div className="pp-buyrow">
              <div className="pp-qty">
                <button onClick={subQty} aria-label="Menos">-</button>
                <input
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || 1, 10)))}
                />
                <button onClick={addQty} aria-label="Más">+</button>
              </div>
              <button className="btn btn-primary" disabled={!hayStock}>
                <FiShoppingCart /> Agregar al carrito
              </button>
              {tienda?.telefonoContacto && (
                <button className="btn btn-ghost" onClick={handleWhatsAppClick}>
                  Comprar por WhatsApp ahora
                </button>
              )}
            </div>

            {/* Descripción */}
            {producto?.descripcion && (
              <div className="pp-desc">
                <h3><FiInfo /> Descripción</h3>
                <p>{producto.descripcion}</p>
              </div>
            )}

            {/* Archivo digital */}
            {producto?.digitalUrl && (
              <div className="pp-digital">
                <a href={producto.digitalUrl} target="_blank" rel="noreferrer" className="pp-digital-link">
                  <FiExternalLink /> Ver archivo digital
                </a>
              </div>
            )}
          </section>

          {/* Aside condicional */}
          <aside className="pp-aside">
            {showEnvio && (
              <div className="card pp-block">
                <h4><FiTruck /> Envíos & Entrega</h4>
                <ul className="pp-list">
                  {producto?.diasPreparacion != null && (<li>Preparación: <strong>{producto.diasPreparacion} días</strong></li>)}
                  {producto?.claseEnvio && (<li>Clase de envío: <strong>{producto.claseEnvio}</strong></li>)}
                  {producto?.politicaDevolucion && (<li>Política: <strong>{producto.politicaDevolucion}</strong></li>)}
                  {tienda?.envioCobertura && (<li>Cobertura: <strong>{tienda.envioCobertura}</strong></li>)}
                  {tienda?.envioCosto && (<li>Costo: <strong>{tienda.envioCosto}</strong></li>)}
                  {tienda?.envioTiempo && (<li>Entrega: <strong>{tienda.envioTiempo}</strong></li>)}
                  {tienda?.devoluciones && (<li>Devoluciones: <strong>{tienda.devoluciones}</strong></li>)}
                </ul>
              </div>
            )}

            {showDims && (
              <div className="card pp-block">
                <h4>Dimensiones & Peso</h4>
                <ul className="pp-list">
                  {(producto?.largoCm || producto?.anchoCm || producto?.altoCm) && (
                    <li>
                      Dimensiones:
                      <strong>
                        {' '}
                        {producto?.largoCm ?? ''}{producto?.largoCm ? ' × ' : ''}
                        {producto?.anchoCm ?? ''}{producto?.anchoCm ? ' × ' : ''}
                        {producto?.altoCm ?? ''}{(producto?.largoCm || producto?.anchoCm || producto?.altoCm) ? ' cm' : ''}
                      </strong>
                    </li>
                  )}
                  {producto?.pesoGramos != null && (<li>Peso: <strong>{producto.pesoGramos} g</strong></li>)}
                </ul>
              </div>
            )}

            {showAttrs && (
              <div className="card pp-block">
                <h4><FiShield /> Atributos</h4>
                <ul className="pp-attrs">
                  {atributos.map((a, i) => (
                    <li key={`${a.clave}-${i}`}>
                      <span className="k">{a.clave}</span>
                      <span className="v">{a.valor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Redes tienda */}
      {(tienda?.redes?.facebook || tienda?.redes?.instagram || tienda?.redes?.tiktok) && (
        <footer className="pp-footer">
          <div className="pp-socials">
            {tienda.redes.facebook && <a href={tienda.redes.facebook} target="_blank" rel="noreferrer">Facebook</a>}
            {tienda.redes.instagram && <a href={tienda.redes.instagram} target="_blank" rel="noreferrer">Instagram</a>}
            {tienda.redes.tiktok && <a href={tienda.redes.tiktok} target="_blank" rel="noreferrer">TikTok</a>}
          </div>
        </footer>
      )}

      {/* ===== Modal de Confirmación WhatsApp ===== */}
      {showConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar compra por WhatsApp"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'grid', placeItems: 'center',
            background: 'rgba(0,0,0,.45)'
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="card"
            style={{
              width: 'min(720px, 92vw)',
              padding: '1rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              boxShadow: '0 20px 40px rgba(0,0,0,.4)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.5rem' }}>
              <h3 style={{ margin:0 }}>¿Confirmar compra por WhatsApp?</h3>
              <button
                onClick={() => setShowConfirm(false)}
                className="btn btn-ghost"
                aria-label="Cerrar"
                style={{ padding: '.4rem .6rem' }}
              >
                <FiX />
              </button>
            </div>

            {/* Vista previa compacta del pedido */}
            <div style={{ display:'grid', gridTemplateColumns:'100px 1fr', gap:'1rem', alignItems:'center', marginBottom:'.75rem' }}>
              <div className="pp-thumb-frame" style={{ width:100, height:100 }}>
                {principal
                  ? <img src={principal} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:5 }} />
                  : <div className="pp-main-placeholder" style={{ height:100 }}><FiImage />Sin imagen</div>
                }
              </div>
              <div style={{ display:'grid', gap:'.2rem' }}>
                <strong>{producto?.nombre}</strong>
                {activeVar && (
                  <div style={{ color:'var(--text-2)' }}>
                    Variante: <strong>{activeVar.nombre || Object.values(activeVar.opciones || {}).join(' / ')}</strong>
                  </div>
                )}
                <div style={{ color:'var(--text-2)' }}>
                  Cantidad: <strong>{qty}</strong>
                </div>
                <div style={{ display:'flex', alignItems:'baseline', gap:'.5rem' }}>
                  <span style={{ fontWeight:800 }}>{precioMostrar != null ? money(precioMostrar) : 'A consultar'}</span>
                  {(precioComparativoMostrar != null && precioMostrar != null && precioComparativoMostrar > precioMostrar) && (
                    <span className="pp-price-compare">{money(precioComparativoMostrar)}</span>
                  )}
                </div>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color:'#fff', textDecoration:'underline', wordBreak:'break-all' }}
                >
                  {window.location.href}
                </a>
              </div>
            </div>

            <div style={{ display:'flex', gap:'.5rem', justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowConfirm(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmWhatsApp}>Confirmar y abrir WhatsApp</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

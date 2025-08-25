// frontend/src/pages/Public/PublicProducto.jsx
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiShoppingCart, FiHeart, FiShare2, FiChevronLeft, FiChevronRight,
  FiStar, FiTruck, FiShield, FiArrowLeft, FiCheck, FiTag, FiPhone, FiMail, FiClock
} from 'react-icons/fi';

const API   = (import.meta.env.VITE_API_URL    || 'http://localhost:5000').replace(/\/$/, '');
const FILES = (import.meta.env.VITE_FILES_BASE || API).replace(/\/$/, '');

/* ===== Helpers compartidos con Perfil (rutas y tema) ===== */

// Normaliza a un "web path" seguro
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
      const slice = clean.slice(i);
      return slice.startsWith('/') ? slice : `/${slice}`;
    }
  }
  return clean.startsWith('/') ? clean : `/${clean}`;
};

// Convierte a URL pública
const toPublicUrl = (u) => {
  const p = toWebPath(u);
  return p ? `${FILES}${encodeURI(p)}` : '';
};

// Extrae colores de un string de gradiente
const extractColors = (gradientString) => {
  const m = gradientString?.match(/#([0-9a-f]{6})/gi);
  return { from: m?.[0] || '#6d28d9', to: m?.[1] || '#c026d3' };
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
const grad = (from, to) => `linear-gradient(135deg, ${from}, ${to})`;

/* Utilidades varias */
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const formatDate = (d) => {
  try {
    const dt = new Date(d);
    return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(dt);
  } catch { return ''; }
};
const avgFromReviews = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  const sum = arr.reduce((a, r) => a + Number(r.rating || 0), 0);
  return sum / arr.length;
};

/* ========================================================= */

export default function PublicProducto() {
  const { uuid } = useParams();
  const nav = useNavigate();

  const [p, setP] = useState(null);
  const [tienda, setTienda] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  // Reseñas
  const [reviews, setReviews] = useState([]);
  const [revLoading, setRevLoading] = useState(false);
  const [revError, setRevError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 0, comment: '', authorName: '', authorEmail: '' });

  // Tema dinámico a partir de tienda.colorPrincipal
  const theme = useMemo(() => {
    const cp = tienda?.colorPrincipal || grad('#6d28d9', '#c026d3');
    const { from, to } = extractColors(cp);
    return { from, to, contrast: bestTextOn(from, to) };
  }, [tienda?.colorPrincipal]);

  // Carga producto + config de tienda
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);

        // Producto público por UUID
        const r = await fetch(`${API}/api/v1/productos/public/uuid/${uuid}`);
        if (!r.ok) throw new Error('Producto no encontrado');
        const data = await r.json();

        if (!alive) return;
        setP(data);

        // Config de tienda (para tema/logo/portada/redes...)
        if (data?.tiendaId) {
          const tRes = await fetch(`${API}/api/tienda/config/${data.tiendaId}`);
          if (tRes.ok) {
            const tData = await tRes.json();
            // normaliza rutas a web path
            setTienda({
              ...tData,
              portadaUrl: toWebPath(tData.portadaUrl),
              logoUrl: toWebPath(tData.logoUrl),
              bannerPromoUrl: toWebPath(tData.bannerPromoUrl),
              colorPrincipal: tData.colorPrincipal || grad('#6d28d9', '#c026d3'),
            });
            localStorage.setItem('tiendaConfig', JSON.stringify(tData));
          }
        }

        // Reseñas
        fetchReviews(data?.id);

        // SEO básico
        document.title = `${data?.nombre || 'Producto'} – ${data?.tienda?.nombre || 'Tienda'}`;
      } catch (e) {
        if (alive) setP(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [uuid]);

  const fetchReviews = async (productoId) => {
    if (!productoId) return;
    setRevLoading(true); setRevError('');
    try {
      const r = await fetch(`${API}/api/v1/productos/${productoId}/reviews`);
      if (!r.ok) throw new Error('No se pudieron cargar las reseñas.');
      const data = await r.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch (e) {
      setReviews([]); setRevError(e?.message || 'Error al cargar reseñas');
    } finally {
      setRevLoading(false);
    }
  };

  // Números seguros (prisma Decimal viene string)
  const precioNumber = useMemo(() => Number(p?.precio), [p?.precio]);
  const precioComparativo = useMemo(() => Number(p?.precioComparativo || 0), [p?.precioComparativo]);
  const descPct = useMemo(() => Number(p?.descuentoPct || 0), [p?.descuentoPct]);

  const precioFinal = useMemo(() => {
    if (Number.isNaN(precioNumber)) return null;
    return descPct > 0 ? (precioNumber * (100 - descPct)) / 100 : precioNumber;
  }, [precioNumber, descPct]);

  const stockInfo = useMemo(() => {
    const inv = p?.inventario;
    if (!inv) return { stock: null, low: false, canBuy: true };
    const stock = Number(inv.stock ?? 0);
    const umbral = Number(inv.umbralAlerta ?? 0);
    const low = stock <= umbral;
    const canBuy = stock > 0 || !!inv.permitirBackorder;
    return { stock, low, canBuy };
  }, [p?.inventario]);

  const sortedImages = useMemo(() => {
    const imgs = Array.isArray(p?.imagenes) ? [...p.imagenes] : [];
    imgs.sort((a, b) => (Number(b.isPrincipal) - Number(a.isPrincipal)) || (a.orden ?? 0) - (b.orden ?? 0));
    return imgs;
  }, [p?.imagenes]);

  const currentAvg = useMemo(() => {
    const baseAvg = Number(p?.ratingAvg || 0);
    const baseCount = Number(p?.ratingCount || 0);
    // Si el backend ya expone ratingAvg y ratingCount, úsalos.
    if (baseCount > 0) return { avg: baseAvg, count: baseCount };
    // Si no, calcula del arreglo reviews.
    const localAvg = avgFromReviews(reviews);
    return { avg: localAvg, count: reviews.length };
  }, [p?.ratingAvg, p?.ratingCount, reviews]);

  const share = async () => {
    const url = window.location.href;
    const title = p?.nombre || 'Producto';
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Enlace copiado al portapapeles');
      }
    } catch {}
  };

  const handleAddToCart = () => {
    setAddedToCart(true);
    // TODO: lógica real para carrito
    setTimeout(() => setAddedToCart(false), 1800);
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!p?.id) return;
    const rating = clamp(Number(newReview.rating || 0), 1, 5);
    const comment = (newReview.comment || '').trim();
    if (!rating) { alert('Selecciona una calificación de 1 a 5 estrellas.'); return; }
    if (comment.length < 4) { alert('Escribe un comentario (mínimo 4 caracteres).'); return; }

    const payload = {
      rating,
      comment,
      authorName: (newReview.authorName || '').trim() || null,
      authorEmail: (newReview.authorEmail || '').trim() || null,
    };

    try {
      setSubmitting(true);
      const r = await fetch(`${API}/api/v1/productos/${p.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.text().catch(()=>'')) || 'No se pudo enviar tu reseña.');

      const created = await r.json();
      // Optimista: agrega arriba y limpia formulario
      setReviews((prev) => [created, ...prev]);
      setNewReview({ rating: 0, comment: '', authorName: '', authorEmail: '' });
      alert('¡Gracias! Tu reseña se ha publicado.');
    } catch (e2) {
      alert(e2?.message || 'No se pudo enviar la reseña.');
    } finally {
      setSubmitting(false);
    }
  };

  /* =========== Loaders / Not found =========== */
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: grad('#eef2ff', '#f5f3ff'),
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{
          width: 54, height: 54, borderRadius: '50%',
          border: '6px solid rgba(0,0,0,.08)',
          borderTopColor: theme.from,
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`@keyframes spin {to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!p) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        gap: 16,
        background: grad('#f1f5f9', '#f8fafc'),
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{
          padding: '2rem 2.25rem',
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 16px 40px rgba(0,0,0,.08)',
          textAlign: 'center'
        }}>
          <h2 style={{ margin: 0, fontWeight: 800 }}>Producto no encontrado</h2>
          <p style={{ color: '#6b7280', marginTop: 8 }}>El enlace puede haber cambiado o el producto ya no está publicado.</p>
          <button
            onClick={() => nav(-1)}
            style={{
              marginTop: 16, padding: '0.75rem 1.25rem',
              background: grad('#6366f1', '#8b5cf6'),
              color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer'
            }}
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  /* ======= Tema calculado ======= */
  const headerGradient = grad(theme.from, theme.to);
  const contrast = theme.contrast;
  const primaryColor = theme.from;

  return (
    <div
      style={{
        '--brandFrom': theme.from,
        '--brandTo': theme.to,
        '--contrast': contrast,
      }}
    >
      {/* ======= Header de tienda con portada/gradiente ======= */}
      <header
        style={{
          backgroundImage: tienda?.portadaUrl
            ? `linear-gradient(135deg, ${theme.from}cc, ${theme.to}cc), url("${toPublicUrl(tienda.portadaUrl)}")`
            : headerGradient,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: contrast,
          boxShadow: '0 10px 30px rgba(0,0,0,.18)',
        }}
      >
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '1rem 1rem 1.25rem',
          display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'space-between'
        }}>
          <button
            onClick={() => nav(-1)}
            title="Regresar"
            style={{
              background: 'rgba(255,255,255,.18)', color: contrast, border: '1px solid rgba(255,255,255,.35)',
              width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', cursor: 'pointer'
            }}
          >
            <FiArrowLeft />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'center' }}>
            {tienda?.logoUrl && (
              <img
                src={toPublicUrl(tienda.logoUrl)}
                alt="logo"
                style={{
                  height: 44, width: 44, objectFit: 'contain',
                  background: '#fff', borderRadius: 10, padding: 4, boxShadow: '0 6px 16px rgba(0,0,0,.18)'
                }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: .2 }}>
                {tienda?.nombre || p?.tienda?.nombre || 'Tienda'}
              </div>
              {tienda?.descripcion && (
                <div style={{ fontSize: 13, opacity: .9, maxWidth: 580, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tienda.descripcion}
                </div>
              )}
            </div>
          </div>

          <div style={{ width: 42 }} />
        </div>
      </header>

      {/* ======= Contenido principal ======= */}
      <main style={{ maxWidth: 1200, margin: '1.75rem auto 2.5rem', padding: '0 1rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 1fr', gap: 28 }}>
          {/* Galería */}
          <section>
            <div style={{
              position: 'relative', borderRadius: 14, overflow: 'hidden',
              boxShadow: '0 16px 40px rgba(0,0,0,.08)', background: '#fff'
            }}>
              {sortedImages?.length ? (
                <>
                  <div style={{ position: 'relative', aspectRatio: '1/1' }}>
                    <img
                      src={toPublicUrl(sortedImages[currentImageIndex]?.url)}
                      alt={sortedImages[currentImageIndex]?.alt || p.nombre}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={(e) => { e.currentTarget.src = ''; e.currentTarget.alt = 'Sin imagen'; }}
                    />
                    {sortedImages.length > 1 && (
                      <>
                        <button onClick={() => setCurrentImageIndex(i => (i - 1 + sortedImages.length) % sortedImages.length)}
                                style={navBtn('left')}><FiChevronLeft size={20} /></button>
                        <button onClick={() => setCurrentImageIndex(i => (i + 1) % sortedImages.length)}
                                style={navBtn('right')}><FiChevronRight size={20} /></button>
                      </>
                    )}
                    {descPct > 0 && (
                      <div style={discountBadge}>-{descPct}%</div>
                    )}
                  </div>

                  {sortedImages.length > 1 && (
                    <div style={{
                      display: 'flex', gap: 10, padding: 12, overflowX: 'auto', background: '#fff'
                    }}>
                      {sortedImages.map((img, idx) => (
                        <button key={idx}
                                onClick={() => setCurrentImageIndex(idx)}
                                style={{
                                  width: 72, height: 72, flex: '0 0 auto',
                                  borderRadius: 10, overflow: 'hidden',
                                  border: idx === currentImageIndex ? `2px solid ${primaryColor}` : '1px solid #e5e7eb',
                                  padding: 0, cursor: 'pointer', background: '#fff'
                                }}>
                          <img src={toPublicUrl(img.url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{
                  aspectRatio: '1/1', display: 'grid', placeItems: 'center',
                  color: '#9ca3af', background: '#f3f4f6'
                }}>Sin imagen</div>
              )}
            </div>

            {/* Ficha técnica / atributos */}
            {(p.atributos?.length || p.sku || p.marca) && (
              <div style={cardBox}>
                <h3 style={cardTitle}><FiTag style={{ marginRight: 8 }} /> Detalles del producto</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  {p.sku && <KV k="SKU" v={p.sku} />}
                  {p.marca && <KV k="Marca" v={p.marca} />}
                  {p.condicion && <KV k="Condición" v={p.condicion} />}
                  {p.gtin && <KV k="GTIN" v={p.gtin} />}
                  {p.pesoGramos && <KV k="Peso" v={`${p.pesoGramos} g`} />}
                  {(p.altoCm || p.anchoCm || p.largoCm) && (
                    <KV k="Dimensiones" v={[p.altoCm, p.anchoCm, p.largoCm].filter(Boolean).join(' × ') + ' cm'} />
                  )}
                  {(p.atributos || []).map((a, i) => (
                    <KV key={i} k={a.clave} v={a.valor} />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Info / compra */}
          <section>
            <div style={cardBox}>
              {/* Categorías (breadcrumbs simples) */}
              {p.categorias?.length > 0 && (
                <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 6 }}>
                  {p.categorias.map(pc => pc.categoria?.nombre).filter(Boolean).join(' • ')}
                </div>
              )}

              <h1 style={{ margin: '2px 0 8px', fontWeight: 800, fontSize: 28, lineHeight: 1.15 }}>{p.nombre}</h1>

              {/* Rating (avg + count) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ display: 'flex', color: '#f59e0b' }}>
                  {[...Array(5)].map((_, i) => (
                    <FiStar key={i} fill={i < Math.round(currentAvg.avg || 0) ? '#f59e0b' : 'none'} />
                  ))}
                </div>
                <span style={{ fontSize: 13, color: '#6b7280' }}>
                  {Number(currentAvg.avg || 0).toFixed(1)} · {currentAvg.count || 0} reseñas
                </span>
              </div>

              {/* Precio */}
              {Number.isFinite(precioFinal) && (
                <div style={{ margin: '10px 0 18px', display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 30, fontWeight: 900, color: primaryColor }}>
                    ${precioFinal.toFixed(2)}
                  </span>
                  {(descPct > 0 || precioComparativo > 0) && (
                    <span style={{ fontSize: 18, color: '#9ca3af', textDecoration: 'line-through' }}>
                      ${ (precioComparativo || precioNumber).toFixed(2) }
                    </span>
                  )}
                  {descPct > 0 && (
                    <span style={{
                      background: '#ef4444', color: '#fff', borderRadius: 999,
                      padding: '4px 10px', fontWeight: 700, fontSize: 13
                    }}>
                      -{descPct}%
                    </span>
                  )}
                </div>
              )}

              {/* Descripción */}
              <p style={{ color: '#4b5563', lineHeight: 1.6, marginTop: 6 }}>
                {p.descripcion || 'Este producto no tiene descripción disponible.'}
              </p>

              {/* Stock / alerta */}
              {stockInfo.low && (
                <div style={{
                  marginTop: 12, background: '#fff7ed', border: '1px solid #fed7aa',
                  color: '#9a3412', padding: '10px 12px', borderRadius: 10, fontSize: 14
                }}>
                  ¡Quedan pocas unidades disponibles!
                </div>
              )}

              {/* Cantidad + acciones */}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                  <label style={{ fontWeight: 700 }}>Cantidad</label>
                  <div style={{
                    display: 'flex', alignItems: 'center', border: '1px solid #e5e7eb',
                    borderRadius: 12, overflow: 'hidden'
                  }}>
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                            style={qtyBtn}>-</button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      min="1"
                      style={qtyInput}
                    />
                    <button onClick={() => setQuantity(q => q + 1)}
                            style={qtyBtn}>+</button>
                  </div>
                  {Number.isFinite(stockInfo.stock) && (
                    <span style={{ fontSize: 13, color: '#6b7280' }}>
                      {stockInfo.stock} en stock
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleAddToCart}
                    disabled={!stockInfo.canBuy || addedToCart}
                    style={{
                      flex: '1 1 220px',
                      padding: '14px 18px',
                      borderRadius: 12,
                      border: 'none',
                      background: stockInfo.canBuy ? headerGradient : '#9ca3af',
                      color: contrast,
                      fontWeight: 800,
                      cursor: stockInfo.canBuy ? 'pointer' : 'not-allowed',
                      boxShadow: '0 10px 24px rgba(0,0,0,.12)'
                    }}
                  >
                    {addedToCart ? (<><FiCheck style={{ marginRight: 8 }} /> ¡Agregado!</>) :
                      (<><FiShoppingCart style={{ marginRight: 8 }} /> Agregar al carrito</>)}
                  </button>
                  <button title="Favorito" style={ghostBtn(primaryColor)}><FiHeart /></button>
                  <button title="Compartir" onClick={share} style={ghostBtn(primaryColor)}><FiShare2 /></button>
                </div>
              </div>
            </div>

            {/* Envíos / garantías */}
            {(tienda?.envioCobertura || tienda?.devoluciones || p?.diasPreparacion) && (
              <div style={cardBox}>
                <h3 style={cardTitle}>Beneficios</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 14 }}>
                  <Benefit icon={<FiTruck />} title={`Cobertura: ${tienda?.envioCobertura || 'Consultar'}`}
                           subtitle={tienda?.envioTiempo || 'Tiempo estimado variable'} />
                  <Benefit icon={<FiShield />} title="Devoluciones"
                           subtitle={tienda?.devoluciones ? 'Aceptadas con política' : 'Consultar política'} />
                  {p?.diasPreparacion && (
                    <Benefit icon={<FiClock />} title="Preparación"
                             subtitle={`${p.diasPreparacion} día(s) hábiles`} />
                  )}
                </div>
              </div>
            )}

            {/* Reseñas y calificaciones */}
            <div style={cardBox}>
              <h3 style={{ ...cardTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
                Opiniones de clientes
                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                  ({currentAvg.count || 0})
                </span>
              </h3>

              {/* Formulario */}
              <form onSubmit={submitReview} style={{
                border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, marginBottom: 16, background: '#fafafa'
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                  <label style={{ fontWeight: 700 }}>Tu calificación:</label>
                  <StarInput
                    value={newReview.rating}
                    onChange={(v) => setNewReview((prev) => ({ ...prev, rating: v }))}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 10, marginTop: 10 }}>
                  <input
                    placeholder="Tu nombre (opcional)"
                    value={newReview.authorName}
                    onChange={(e) => setNewReview((prev) => ({ ...prev, authorName: e.target.value }))}
                    style={textInput}
                  />
                  <input
                    type="email"
                    placeholder="Tu email (opcional)"
                    value={newReview.authorEmail}
                    onChange={(e) => setNewReview((prev) => ({ ...prev, authorEmail: e.target.value }))}
                    style={textInput}
                  />
                </div>

                <textarea
                  placeholder="Escribe tu experiencia con este producto…"
                  value={newReview.comment}
                  onChange={(e) => setNewReview((prev) => ({ ...prev, comment: e.target.value }))}
                  rows={4}
                  style={{ ...textInput, marginTop: 10, resize: 'vertical' }}
                />

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                  <button type="submit" disabled={submitting} style={{
                    padding: '10px 14px', borderRadius: 10, border: 'none',
                    background: submitting ? '#9ca3af' : grad('#10b981', '#059669'),
                    color: '#fff', fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer'
                  }}>
                    {submitting ? 'Enviando…' : 'Publicar reseña'}
                  </button>
                </div>
              </form>

              {/* Lista de reseñas */}
              {revLoading ? (
                <div className="muted">Cargando reseñas…</div>
              ) : revError ? (
                <div className="alert-error" role="alert" style={{ color: '#b91c1c' }}>{revError}</div>
              ) : reviews.length === 0 ? (
                <div style={{ color: '#6b7280' }}>Aún no hay reseñas. ¡Sé el primero en opinar!</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
                  {reviews.map((r) => (
                    <li key={r.id} style={{
                      border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fff'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ display: 'flex', color: '#f59e0b' }}>
                            {[...Array(5)].map((_, i) => (
                              <FiStar key={i} fill={i < Number(r.rating || 0) ? '#f59e0b' : 'none'} />
                            ))}
                          </div>
                          <strong>{r.authorName || 'Anónimo'}</strong>
                        </div>
                        <small style={{ color: '#6b7280' }}>{formatDate(r.createdAt)}</small>
                      </div>
                      {r.comment && <p style={{ margin: '6px 0 0', color: '#374151', lineHeight: 1.5 }}>{r.comment}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Vendedor */}
            <div style={cardBox}>
              <h3 style={cardTitle}>Vendido por</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {tienda?.logoUrl && (
                  <img
                    src={toPublicUrl(tienda.logoUrl)}
                    alt="logo tienda"
                    style={{ width: 56, height: 56, objectFit: 'contain', background: '#fff', borderRadius: 12, padding: 6 }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800 }}>{tienda?.nombre || p?.tienda?.nombre || 'Tienda'}</div>
                  {tienda?.categoria && (
                    <div style={{ color: '#6b7280', fontSize: 13 }}>{tienda.categoria}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {tienda?.telefonoContacto && (
                    <a href={`tel:${tienda.telefonoContacto}`} title="Llamar" style={miniPill(primaryColor)}><FiPhone /></a>
                  )}
                  {tienda?.email && (
                    <a href={`mailto:${tienda.email}`} title="Email" style={miniPill(primaryColor)}><FiMail /></a>
                  )}
                  {tienda?.redes?.facebook && (
                    <a href={tienda.redes.facebook} target="_blank" rel="noreferrer"
                       title="Facebook" style={miniPill('#1877F2')}>f</a>
                  )}
                  {tienda?.redes?.instagram && (
                    <a href={tienda.redes.instagram} target="_blank" rel="noreferrer"
                       title="Instagram" style={miniPill('#E1306C')}>◎</a>
                  )}
                  {tienda?.redes?.tiktok && (
                    <a href={tienda.redes.tiktok} target="_blank" rel="noreferrer"
                       title="TikTok" style={miniPill('#000')}>♫</a>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* estilos mínimos para botones de navegación */}
      <style>{`
        @media (max-width: 900px){
          main>div{ grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

/* ======= Subcomponentes & estilos inline reutilizables ======= */

const cardBox = {
  background: '#fff',
  borderRadius: 14,
  padding: 18,
  boxShadow: '0 16px 40px rgba(0,0,0,.08)',
  marginBottom: 18,
};
const cardTitle = { margin: 0, marginBottom: 12, fontSize: 16, fontWeight: 800 };

const navBtn = (side) => ({
  position: 'absolute',
  [side]: 10,
  top: '50%',
  transform: 'translateY(-50%)',
  width: 42,
  height: 42,
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,.08)',
  background: 'rgba(255,255,255,.9)',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  boxShadow: '0 10px 24px rgba(0,0,0,.12)'
});

const discountBadge = {
  position: 'absolute',
  top: 10,
  right: 10,
  background: '#ef4444',
  color: '#fff',
  padding: '6px 10px',
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 12
};

const qtyBtn = {
  width: 40, height: 40, border: 'none', background: '#f3f4f6',
  cursor: 'pointer', display: 'grid', placeItems: 'center', fontWeight: 800
};
const qtyInput = {
  width: 64, height: 40, border: 'none', borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb',
  textAlign: 'center', fontWeight: 700, outline: 'none'
};
const ghostBtn = (color) => ({
  padding: '12px 14px',
  borderRadius: 12,
  background: 'transparent',
  border: `1px solid ${color}`,
  color,
  cursor: 'pointer',
  fontWeight: 700,
  minWidth: 54
});
const miniPill = (bg) => ({
  width: 36, height: 36, display: 'grid', placeItems: 'center',
  borderRadius: 10, background: bg, color: '#fff', textDecoration: 'none',
  fontWeight: 900, boxShadow: '0 6px 16px rgba(0,0,0,.12)'
});
const textInput = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  outline: 'none',
  background: '#fff'
};

function KV({ k, v }) {
  return (
    <div style={{
      background: '#f9fafb', border: '1px solid #f1f5f9', borderRadius: 10, padding: '10px 12px'
    }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>{k}</div>
      <div style={{ fontWeight: 700 }}>{v}</div>
    </div>
  );
}

function Benefit({ icon, title, subtitle }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 8 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center',
        background: '#f5f3ff', color: '#6d28d9'
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>{subtitle}</div>
      </div>
    </div>
  );
}

/* ======= Input de estrellas ======= */
function StarInput({ value = 0, onChange }) {
  const [hover, setHover] = useState(0);
  const v = hover || value || 0;

  return (
    <div style={{ display: 'inline-flex', gap: 4, cursor: 'pointer' }}
         onMouseLeave={() => setHover(0)} aria-label="Selecciona tu calificación">
      {[1,2,3,4,5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange?.(n)}
          style={{
            width: 28, height: 28, borderRadius: 8,
            border: '1px solid #e5e7eb', background: '#fff',
            display: 'grid', placeItems: 'center'
          }}
          title={`${n} estrella${n>1?'s':''}`}
          aria-pressed={value === n}
        >
          <FiStar fill={n <= v ? '#f59e0b' : 'none'} color="#f59e0b" />
        </button>
      ))}
      <span style={{ marginLeft: 8, color: '#6b7280', fontWeight: 700 }}>
        {v ? `${v}/5` : ''}
      </span>
    </div>
  );
}

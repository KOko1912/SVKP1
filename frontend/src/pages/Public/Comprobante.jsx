// frontend/src/pages/Public/Comprobante.jsx
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiChevronLeft, FiImage, FiUpload, FiCheckCircle, FiRefreshCw,
  FiAlertTriangle, FiMessageCircle
} from 'react-icons/fi';

const API   = (import.meta.env.VITE_API_URL    || 'http://localhost:5000').replace(/\/$/, '');
const FILES = (import.meta.env.VITE_FILES_BASE || API).replace(/\/$/, '');

/* =========================
   Helpers de dinero
   ========================= */
const money = (n, currency = 'MXN', locale = 'es-MX') =>
  (n == null ? '' : new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(n) || 0));

const toMajor = (v) => {
  // Si viene 18500 (centavos) => 185; si ya viene 185 => 185
  if (v == null) return 0;
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  // Heurística conservadora: si hay campo ...Cents úsalo; si no, solo divide si parece centavos (entero grande)
  return Number.isInteger(n) && Math.abs(n) >= 1000 ? n / 100 : n;
};

const numOrNull = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Devuelve { amount, currency } a partir de la respuesta del backend
const pickTotal = (pedido) => {
  const cur =
    pedido?.totals?.currency ||
    pedido?.currency ||
    pedido?.moneda ||
    'MXN';

  // 1) Preferir centavos si existen
  const cents =
    numOrNull(pedido?.totals?.totalCents) ??
    numOrNull(pedido?.totalCents) ??
    null;

  if (cents != null) return { amount: cents / 100, currency: cur };

  // 2) Si no, usar total mayor (con heurística)
  const major =
    numOrNull(pedido?.totals?.total) ??
    numOrNull(pedido?.total) ??
    numOrNull(pedido?.monto) ??
    null;

  if (major != null) return { amount: toMajor(major), currency: cur };

  // 3) Último recurso: sumar ítems
  let sumCents = 0;
  if (Array.isArray(pedido?.items)) {
    for (const it of pedido.items) {
      const qty = numOrNull(it?.cantidad ?? it?.qty ?? 1) || 1;
      const itemCents =
        numOrNull(it?.totalCents) ??
        (numOrNull(it?.priceCents) != null ? numOrNull(it?.priceCents) * qty : null) ??
        (numOrNull(it?.precioCents) != null ? numOrNull(it?.precioCents) * qty : null) ??
        null;
      if (itemCents != null) {
        sumCents += itemCents;
        continue;
      }
      const itemMajor =
        numOrNull(it?.total) ??
        numOrNull(it?.price) ??
        numOrNull(it?.precio) ??
        null;
      if (itemMajor != null) sumCents += Math.round(toMajor(itemMajor) * 100) * qty;
    }
  }
  return { amount: sumCents / 100, currency: cur };
};

/* =========================
   Helpers de URL/files
   ========================= */
const toPublicSrc = (u) => {
  const v = typeof u === 'string'
    ? u
    : (u?.url || u?.media?.url || u?.path || u?.src || u?.href || u?.filepath || '');
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `${FILES}${v.startsWith('/') ? '' : '/'}${v}`;
};

/* Fetch sin lanzar excepciones */
async function tryJson(url, init) {
  try {
    const r = await fetch(url, init);
    const t = await r.text();
    let d = null; try { d = JSON.parse(t); } catch {}
    if (!r.ok || !d) return null;
    return d;
  } catch { return null; }
}

/* ------------------------------
   Upload a carpeta por tienda
   ------------------------------ */
async function uploadImage(file, { tiendaId, pedidoId }) {
  const folder = tiendaId
    ? `tiendas/${tiendaId}/comprobantes${pedidoId ? `/${pedidoId}` : ''}`
    : 'misc';
  // 1) Preferido: Supabase
  try {
    const fd = new FormData();
    fd.append('file', file);
    const qs = new URLSearchParams({ folder, visibility: 'private' });
    const r = await fetch(`${API}/api/media?${qs.toString()}`, { method: 'POST', body: fd });
    const data = await r.json();
    if (r.ok && data) return data; // { ok, media:{ id, url, ... } }
  } catch {}
  // 2) Fallback local (solo DEV)
  try {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch(`${API}/api/v1/upload/digital`, { method: 'POST', body: fd });
    const data = await r.json();
    if (r.ok && data) return data; // { ok, url }
  } catch {}
  return null;
}

function extractMediaId(resp) {
  if (!resp) return null;
  return resp.media?.id ?? resp.mediaId ?? resp.id ?? resp?.data?.id ?? null;
}
function extractMediaUrl(resp) {
  if (!resp) return null;
  return resp.media?.url ?? resp.url ?? resp?.data?.url ?? resp?.publicUrl ?? null;
}

/* Armar URL canónica de esta página (hash / history) */
function makeComprobanteSelfUrl(token) {
  const origin = window.location.origin;
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  const hashMode = (import.meta.env.VITE_ROUTER_MODE === 'hash') || window.location.hash?.startsWith('#/');
  return hashMode ? `${origin}${base}/#/comprobante/${token}` : `${origin}${base}/comprobante/${token}`;
}

/* Recoger galería de un producto (producto.imagenes o variantes[i].imagenes) */
function pickGalleryFromProducto(p) {
  const urls = [];
  if (Array.isArray(p?.imagenes)) {
    for (const it of p.imagenes) {
      const u = it?.url || it?.media?.url || it?.path || it;
      if (u) urls.push(u);
    }
  }
  if (!urls.length && Array.isArray(p?.variantes)) {
    for (const v of p.variantes) {
      for (const it of (v?.imagenes || [])) {
        const u = it?.url || it?.media?.url || it?.path || it;
        if (u) urls.push(u);
      }
    }
  }
  return urls.map(toPublicSrc);
}

/* Obtener producto por ID (con fallback por compatibilidad) */
async function fetchProductoSeguro(id) {
  let p = await tryJson(`${API}/api/v1/productos/${encodeURIComponent(id)}`);
  if (p && !p.error) return p;
  p = await tryJson(`${API}/api/v1/productos/public/by-id/${encodeURIComponent(id)}`);
  return p && !p.error ? p : null;
}

/* Resolver URL del comprobante con varios intentos */
async function resolveProofUrl(pedido) {
  // si ya viene embebida en el pedido
  const direct =
    pedido?.proof?.url ||
    pedido?.proofUrl ||
    pedido?.proofMedia?.url ||
    pedido?.comprobanteUrl ||
    null;
  if (direct) return direct;

  const id = pedido?.proofMediaId || pedido?.proof?.mediaId || null;
  if (!id) return '';

  // 1) GET /api/media/:id (si existe)
  let d = await tryJson(`${API}/api/media/${id}`);
  if (d?.media?.url || d?.url) return d.media?.url || d.url;

  // 2) GET /api/media/${id}/signed (si existe y es privado)
  d = await tryJson(`${API}/api/media/${id}/signed`);
  if (d?.url) return d.url;

  // 3) GET /api/media/signed/${id} (nombres alternos)
  d = await tryJson(`${API}/api/media/signed/${id}`);
  if (d?.url) return d.url;

  return '';
}

export default function Comprobante() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [pedido, setPedido] = useState(null);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [uploadedInfo, setUploadedInfo] = useState(null); // { mediaId, url }
  const [proofUrl, setProofUrl] = useState('');            // persistente tras recarga

  const [requestBusy, setRequestBusy] = useState(false);
  const [requestMsg, setRequestMsg] = useState('');

  const tiendaPhone = pedido?.tienda?.telefonoContacto?.replace(/\D/g, '') || '';

  const mainItem = useMemo(() => (pedido?.items?.[0] || null), [pedido?.items]);

  const { amount: totalAmount, currency: totalCurrency } = useMemo(
    () => pickTotal(pedido || {}),
    [pedido]
  );
  const totalFmt = money(totalAmount, totalCurrency);

  const [producto, setProducto] = useState(null);
  const [principalImg, setPrincipalImg] = useState('');

  // bloqueos cuando está en revisión
  const isInReview = useMemo(() => {
    const s = String(pedido?.status || '').toUpperCase();
    const p = String(pedido?.paymentStatus || '').toUpperCase();
    const flags = new Set(['EN_REVISION', 'REVISION', 'REVIEW', 'IN_REVIEW', 'PENDIENTE_REVISION']);
    return Boolean(pedido?.requested) || flags.has(s) || flags.has(p);
  }, [pedido]);

  // 1) Cargar pedido + resolver imágenes
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true); setErr('');
      const d = await tryJson(`${API}/api/orders/public/${encodeURIComponent(token)}`);
      if (cancel) return;
      if (!d || d.error) {
        setErr(d?.error || 'No se encontró el pedido.');
        setPedido(null);
        setLoading(false);
        return;
      }
      setPedido(d);

      // Resolver URL del comprobante persistido
      const url = await resolveProofUrl(d);
      if (!cancel && url) setProofUrl(url);

      // Cargar producto (miniatura del encabezado)
      const pid = d?.items?.[0]?.productoId ?? d?.items?.[0]?.productId;
      if (pid != null) {
        const p = await fetchProductoSeguro(pid);
        if (!cancel && p) {
          setProducto(p);
          const gal = pickGalleryFromProducto(p);
          setPrincipalImg(gal[0] || '');
        }
      }
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [token]);

  function onFileChange(e) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setUploadErr('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f ? URL.createObjectURL(f) : '');
  }

  async function onUpload() {
    if (!file) {
      setUploadErr('Selecciona una imagen primero.');
      return;
    }
    setUploadBusy(true);
    setUploadErr('');
    try {
      const tiendaId  = pedido?.tienda?.id ?? pedido?.tiendaId ?? null;
      const pedidoId  = pedido?.id ?? null;

      const resp = await uploadImage(file, { tiendaId, pedidoId });
      const mediaId = extractMediaId(resp);
      const mediaUrl = extractMediaUrl(resp);
      if (!mediaId) throw new Error('No se pudo obtener el ID del archivo');

      // Registrar comprobante en el pedido
      const r = await fetch(`${API}/api/orders/public/${encodeURIComponent(token)}/proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) throw new Error(d?.error || 'Error registrando comprobante');

      setUploadedInfo({ mediaId, url: mediaUrl });
      setProofUrl(mediaUrl || ''); // queda visible sin esperar refresh

      // Refrescar pedido
      const d2 = await tryJson(`${API}/api/orders/public/${encodeURIComponent(token)}`);
      if (d2) setPedido(d2);

      setRequestMsg('Comprobante registrado. Ahora puedes solicitar revisión.');
      // limpiar selección local
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    } catch (e) {
      setUploadErr(e?.message || 'Falló la subida o el registro del comprobante.');
    } finally {
      setUploadBusy(false);
    }
  }

  async function onRequest() {
    setRequestBusy(true);
    setRequestMsg('');
    try {
      const r = await fetch(`${API}/api/orders/public/${encodeURIComponent(token)}/request`, { method: 'POST' });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) throw new Error(d?.error || 'No se pudo solicitar la revisión.');
      const msg = d.positionMessage || (d.position ? `Tu número en la fila: ${d.position}` : 'Solicitud enviada.');
      setRequestMsg(msg);
      // refrescar pedido (para que requested=true bloquee los controles)
      const d2 = await tryJson(`${API}/api/orders/public/${encodeURIComponent(token)}`);
      if (d2) setPedido(d2);
    } catch (e) {
      setRequestMsg('');
      setErr(e?.message || 'Error al solicitar revisión.');
    } finally {
      setRequestBusy(false);
    }
  }

  function openWhatsApp() {
    const selfUrl = makeComprobanteSelfUrl(token);
    const lines = [
      'Hola 👋',
      'Ya realicé el pago y subí el comprobante.',
      'Por favor, revisa mi pedido 🙏',
      `Comprobante: ${selfUrl}`,
    ];
    const msg = encodeURIComponent(lines.join('\n'));
    const wa = tiendaPhone ? `https://wa.me/${tiendaPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(wa, '_blank', 'noopener,noreferrer');
  }

  if (loading) {
    return (
      <div className="pp-loading">
        <div className="pp-spinner" />
        <p>Cargando pedido…</p>
      </div>
    );
  }

  if (err || !pedido) {
    return (
      <div className="pp-error">
        <p>{err || 'Pedido no disponible.'}</p>
        <button className="btn" onClick={() => navigate(-1)}><FiChevronLeft /> Volver</button>
      </div>
    );
  }

  const hasProof = Boolean(pedido.proofMediaId || uploadedInfo?.mediaId || proofUrl);
  const tiendaLogo = toPublicSrc(pedido?.tienda?.logo?.url || pedido?.tienda?.logoUrl);

  return (
    <div className="pp-container" style={{ padding: '1rem' }}>
      <button className="btn btn-ghost" onClick={() => navigate(-1)}><FiChevronLeft /> Volver</button>

      <div className="card" style={{ marginTop: '1rem', padding: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Comprobante de pago</h2>

        {/* Resumen */}
        <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display:'grid', gridTemplateColumns:'100px 1fr', gap:'1rem', alignItems:'center' }}>
            <div className="pp-thumb-frame" style={{ width:100, height:100, position:'relative' }}>
              {principalImg ? (
                <img src={principalImg} alt="Producto" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:5 }} />
              ) : tiendaLogo ? (
                <img src={tiendaLogo} alt="Tienda" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:5 }} />
              ) : (
                <div className="pp-main-placeholder" style={{ height:100, display:'grid', placeItems:'center' }}>
                  <FiImage />
                  <div><small>Sin imagen</small></div>
                </div>
              )}
            </div>
            <div>
              <div><strong>Tienda:</strong> {pedido?.tienda?.nombre || '-'}</div>
              <div><strong>Pedido:</strong> {mainItem?.nombre || 'Producto'}</div>
              <div><strong>Cantidad:</strong> {mainItem?.cantidad || 1}</div>
              <div><strong>Total:</strong> {totalFmt || '-'}</div>
              {pedido?.token && (
                <div style={{ marginTop: '.25rem', wordBreak:'break-all' }}>
                  <small>Comprobante: {makeComprobanteSelfUrl(pedido.token)}</small>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Estado actual */}
        <div className="card" style={{ padding:'1rem', marginBottom:'1rem' }}>
          <div style={{ display:'grid', gap:'.35rem' }}>
            <div><strong>Estado pedido:</strong> {pedido.status}</div>
            <div><strong>Estado de pago:</strong> {pedido.paymentStatus}</div>
            {pedido.requested && (
              <div style={{ display:'flex', alignItems:'center', gap:'.5rem' }}>
                <FiCheckCircle /> <strong>Solicitud enviada</strong>
              </div>
            )}
            {pedido.position && (
              <div style={{ display:'flex', alignItems:'center', gap:'.5rem' }}>
                <FiRefreshCw /> {pedido.positionMessage || `Tu número en la fila: ${pedido.position}`}
              </div>
            )}
            {isInReview && (
              <div style={{ display:'flex', alignItems:'center', gap:'.5rem', color:'var(--text-2)' }}>
                <FiRefreshCw /> El comprobante está en revisión.
              </div>
            )}
          </div>
        </div>

        {/* Subida de comprobante */}
        <div className="card" style={{ padding:'1rem', marginBottom:'1rem' }}>
          <h3 style={{ marginTop: 0 }}>1) Sube tu comprobante</h3>
          <p style={{ marginTop: 0, color:'var(--text-2)' }}>
            Imagen del recibo/transferencia (JPG/PNG).
            {isInReview && <><br /><em>Está en revisión: no puedes cambiar el archivo por ahora.</em></>}
          </p>

          <div style={{ display:'grid', gridTemplateColumns:'160px 1fr', gap:'1rem', alignItems:'center' }}>
            <div style={{
              width:160, height:160, border:'1px dashed var(--border-color)', borderRadius:8,
              overflow:'hidden', display:'grid', placeItems:'center', background:'rgba(255,255,255,.04)'
            }}>
              {previewUrl ? (
                <img src={previewUrl} alt="Previsualización" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              ) : proofUrl ? (
                <img src={toPublicSrc(proofUrl)} alt="Comprobante" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              ) : hasProof ? (
                <div style={{ textAlign:'center', padding:'1rem' }}>
                  <FiCheckCircle />
                  <div style={{ marginTop:'.25rem' }}><small>Comprobante registrado</small></div>
                </div>
              ) : (
                <div style={{ textAlign:'center', padding:'1rem' }}>
                  <FiImage />
                  <div style={{ marginTop:'.25rem' }}><small>Sin imagen</small></div>
                </div>
              )}
            </div>

            <div style={{ display:'grid', gap:'.5rem' }}>
              <input
                type="file"
                accept="image/*"
                onChange={onFileChange}
                disabled={uploadBusy || isInReview}
              />
              {uploadErr && (
                <div style={{ color:'var(--danger, #dc2626)' }}>
                  <FiAlertTriangle /> {uploadErr}
                </div>
              )}
              <div style={{ display:'flex', gap:'.5rem' }}>
                <button
                  className="btn btn-primary"
                  onClick={onUpload}
                  disabled={uploadBusy || !file || isInReview}
                  title={isInReview ? 'Comprobante en revisión' : 'Subir y registrar comprobante'}
                >
                  {uploadBusy ? 'Subiendo…' : (<><FiUpload /> Subir comprobante</>)}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setFile(null); setPreviewUrl(''); setUploadErr('');
                  }}
                  disabled={uploadBusy || isInReview}
                >
                  Limpiar
                </button>
              </div>
              {(proofUrl) && (
                <a
                  href={toPublicSrc(proofUrl)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration:'underline' }}
                >
                  Ver comprobante
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Solicitar revisión */}
        <div className="card" style={{ padding:'1rem', marginBottom:'1rem' }}>
          <h3 style={{ marginTop: 0 }}>2) Solicitar revisión</h3>
          <p style={{ marginTop: 0, color:'var(--text-2)' }}>
            Cuando envíes la solicitud, entrarás a la fila de la tienda. Te mostraremos tu turno aquí.
          </p>

          <div style={{ display:'flex', gap:'.5rem', alignItems:'center' }}>
            <button
              className="btn btn-primary"
              onClick={onRequest}
              disabled={requestBusy || pedido.requested}
              title="Enviar solicitud al vendedor"
            >
              {requestBusy ? 'Enviando…' : 'Solicitar revisión'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={async () => {
                const d = await tryJson(`${API}/api/orders/public/${encodeURIComponent(token)}`);
                if (d) {
                  setPedido(d);
                  const u = await resolveProofUrl(d);
                  if (u) setProofUrl(u);
                }
              }}
              title="Actualizar estado"
            >
              <FiRefreshCw /> Actualizar
            </button>
            {requestMsg && <span style={{ marginLeft:'.5rem' }}>{requestMsg}</span>}
          </div>
        </div>

        {/* Contacto por WhatsApp */}
        <div className="card" style={{ padding:'1rem' }}>
          <h3 style={{ marginTop: 0 }}>¿Dudas? Contacta al vendedor</h3>
          <div style={{ display:'flex', gap:'.5rem', alignItems:'center' }}>
            <button className="btn" onClick={openWhatsApp} disabled={!tiendaPhone}>
              <FiMessageCircle /> Abrir WhatsApp
            </button>
            {!tiendaPhone && <small style={{ color:'var(--text-3)' }}>Esta tienda no tiene WhatsApp configurado.</small>}
          </div>
        </div>
      </div>
    </div>
  );
}

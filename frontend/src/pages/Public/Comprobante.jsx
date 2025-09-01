// frontend/src/pages/Public/Comprobante.jsx
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiChevronLeft, FiImage, FiUpload, FiCheckCircle, FiRefreshCw,
  FiAlertTriangle, FiMessageCircle, FiMaximize2, FiX, FiUser, FiPhone
} from 'react-icons/fi';
import NavBarUsuario from '../Usuario/NavBarUsuario.jsx';

const API   = (import.meta.env.VITE_API_URL    || 'http://localhost:5000').replace(/\/$/, '');
const FILES = (import.meta.env.VITE_FILES_BASE || API).replace(/\/$/, '');
// si tienes un endpoint para firmar, define en .env:
// VITE_MEDIA_SIGNED_URL_TEMPLATE="/api/media/signed/{id}"
// o por query: VITE_MEDIA_SIGNED_URL_TEMPLATE="/api/v1/upload/signed-url?id={id}"
const SIGNED_URL_TPL = (import.meta.env.VITE_MEDIA_SIGNED_URL_TEMPLATE || '').trim();

/* ===== Dinero ===== */
const money = (n, currency = 'MXN', locale = 'es-MX') =>
  (n == null ? '' : new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(n) || 0));

const toMajor = (v) => {
  if (v == null) return 0;
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Number.isInteger(n) && Math.abs(n) >= 1000 ? n / 100 : n;
};
const numOrNull = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const pickTotal = (pedido) => {
  const cur = pedido?.totals?.currency || pedido?.currency || pedido?.moneda || 'MXN';
  const cents = numOrNull(pedido?.totals?.total) ?? numOrNull(pedido?.total) ?? null;
  if (cents != null) return { amount: toMajor(cents), currency: cur };
  let sumCents = 0;
  if (Array.isArray(pedido?.items)) {
    for (const it of pedido.items) {
      const qty = numOrNull(it?.cantidad ?? 1) || 1;
      const itemCents = numOrNull(it?.total);
      if (itemCents != null) { sumCents += itemCents; continue; }
    }
  }
  return { amount: toMajor(sumCents), currency: cur };
};

/* ===== URL & fetch ===== */
const toPublicSrc = (u) => {
  const v = typeof u === 'string'
    ? u
    : (u?.url || u?.media?.url || u?.path || u?.src || u?.href || u?.filepath || '');
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `${FILES}${v.startsWith('/') ? '' : '/'}${v}`;
};
async function tryJson(url, init) {
  try {
    const r = await fetch(url, init);
    const t = await r.text();
    let d = null; try { d = JSON.parse(t); } catch {}
    if (!r.ok || !d || d.error) return null;
    return d;
  } catch { return null; }
}

/* ===== Usuario (leer de localStorage) ===== */
function readCurrentUser() {
  try {
    return (
      JSON.parse(localStorage.getItem('usuario') || 'null') ||
      JSON.parse(localStorage.getItem('svk_user') || 'null') ||
      JSON.parse(localStorage.getItem('ventasvk_user') || 'null') ||
      JSON.parse(localStorage.getItem('user') || 'null') ||
      null
    );
  } catch { return null; }
}
function userIdFromStorage() {
  try {
    const u =
      JSON.parse(localStorage.getItem('usuario') || 'null') ||
      JSON.parse(localStorage.getItem('svk_user') || 'null') ||
      JSON.parse(localStorage.getItem('ventasvk_user') || 'null') ||
      JSON.parse(localStorage.getItem('user') || 'null') ||
      null;
    if (u?.id) return Number(u.id);
  } catch {}
  const ids = [
    localStorage.getItem('svk_user_id'),
    localStorage.getItem('user_id')
  ].map(x => Number(x)).filter(n => Number.isFinite(n) && n > 0);
  return ids[0] || null;
}

/* ===== Upload ===== */
async function uploadImage(file, { tiendaId, pedidoId }) {
  const folder = tiendaId ? `tiendas/${tiendaId}/comprobantes${pedidoId ? `/${pedidoId}` : ''}` : 'misc';
  try {
    const fd = new FormData();
    fd.append('file', file);
    const qs = new URLSearchParams({ folder, visibility: 'private' });
    const r = await fetch(`${API}/api/media?${qs.toString()}`, { method: 'POST', body: fd });
    const data = await r.json();
    if (r.ok && data) return data; // { ok, media:{ id, url? }, ... }
  } catch {}
  try {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch(`${API}/api/v1/upload/digital`, { method: 'POST', body: fd });
    const data = await r.json();
    if (r.ok && data) return data; // { ok, url }
  } catch {}
  return null;
}
const extractMediaId  = (resp) => resp?.media?.id ?? resp?.mediaId ?? resp?.id ?? resp?.data?.id ?? null;
const extractMediaUrl = (resp) => resp?.media?.url ?? resp?.url ?? resp?.data?.url ?? resp?.publicUrl ?? resp?.signedUrl ?? null;

/* ===== Self URL ===== */
function makeComprobanteSelfUrl(token) {
  const origin = window.location.origin;
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  const hashMode = (import.meta.env.VITE_ROUTER_MODE === 'hash') || window.location.hash?.startsWith('#/');
  return hashMode ? `${origin}${base}/#/comprobante/${token}` : `${origin}${base}/comprobante/${token}`;
}

/* ===== Producto helpers ===== */
const pickGalleryFromProducto = (p) => {
  const urls = [];
  if (Array.isArray(p?.imagenes)) for (const it of p.imagenes) urls.push(it?.url || it?.media?.url || it?.path || it);
  if (!urls.length && Array.isArray(p?.variantes))
    for (const v of p.variantes) for (const it of (v?.imagenes || [])) urls.push(it?.url || it?.media?.url || it?.path || it);
  return urls.map(toPublicSrc);
};
async function fetchProductoSeguro(id) {
  let p = await tryJson(`${API}/api/v1/productos/${encodeURIComponent(id)}`);
  if (p && !p.error) return p;
  p = await tryJson(`${API}/api/v1/productos/public/by-id/${encodeURIComponent(id)}`);
  return p && !p.error ? p : null;
}

/* ===== Persistencia local del comprobante (para sobrevivir recargas) ===== */
const keyByToken = (t) => `svkp:proof-url:token:${t}`;
const keyByMedia = (id) => `svkp:proof-url:media:${id}`;
function saveProofUrl(token, mediaId, url) {
  if (!url) return;
  try {
    if (token)   localStorage.setItem(keyByToken(token), url);
    if (mediaId) localStorage.setItem(keyByMedia(mediaId), url);
  } catch {}
}
function loadProofUrl(token, mediaId) {
  try {
    return (token   && localStorage.getItem(keyByToken(token))) ||
           (mediaId && localStorage.getItem(keyByMedia(mediaId))) || '';
  } catch { return ''; }
}
const fillTpl = (tpl, id) => tpl.replace('{id}', encodeURIComponent(id));

/* ===== Resolver URL del comprobante sin spamear 404 ===== */
async function resolveProofUrl(pedido) {
  // 1) Directo del pedido
  const direct =
    pedido?.proof?.url || pedido?.proof?.publicUrl || pedido?.proof?.signedUrl ||
    pedido?.proofUrl || pedido?.proofMedia?.url || pedido?.comprobanteUrl ||
    pedido?.proof?.path || pedido?.proofPath || null;
  if (direct) return direct;

  // 2) LocalStorage (guardado al subir)
  const mid =
    pedido?.proofMediaId || pedido?.proof?.mediaId ||
    pedido?.proofId || pedido?.comprobanteMediaId || null;
  const cached = loadProofUrl(pedido?.token, mid);
  if (cached) return cached;

  // 3) Endpoint configurable (si existe en tu backend)
  if (SIGNED_URL_TPL && mid) {
    const url = fillTpl(`${API}${SIGNED_URL_TPL.startsWith('/') ? '' : '/'}${SIGNED_URL_TPL}`, mid);
    const d = await tryJson(url);
    const out = d?.url || d?.signedUrl || d?.publicUrl || d?.media?.url || d?.data?.url || '';
    if (out) return out;
  }

  // 4) Nada
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
  const [uploadedInfo, setUploadedInfo] = useState(null);
  const [proofUrl, setProofUrl] = useState('');   // persistente tras recarga

  const [requestBusy, setRequestBusy] = useState(false);
  const [requestMsg, setRequestMsg] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [attachBusy, setAttachBusy] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneErr, setPhoneErr] = useState('');

  const user = useMemo(() => readCurrentUser(), []);
  const userId = useMemo(() => userIdFromStorage(), []);
  const isLogged = Boolean(userId);

  const tiendaPhone = pedido?.tienda?.telefonoContacto?.replace(/\D/g, '') || '';
  const mainItem = useMemo(() => (pedido?.items?.[0] || null), [pedido?.items]);
  const { amount: totalAmount, currency: totalCurrency } = useMemo(() => pickTotal(pedido || {}), [pedido]);
  const totalFmt = money(totalAmount, totalCurrency);

  const [principalImg, setPrincipalImg] = useState('');

  const isInReview = useMemo(() => Boolean(pedido?.requested), [pedido]);

  // Headers para endpoints protegidos de attach-user
  const vendorHeaders = useMemo(() => {
    const h = { 'Content-Type': 'application/json' };
    if (userId) h['x-user-id'] = String(userId);
    return h;
  }, [userId]);

  // Adjunta usuario si está logueado (y opcionalmente el teléfono)
  async function attachUserIfPossible(extraPhone = '') {
    try {
      setAttachBusy(true);
      setPhoneErr('');
      const body = {};
      if (userId) body.userId = userId;
      if (extraPhone) body.phone = extraPhone.replace(/\D/g, '');

      const r = await fetch(`${API}/api/orders/public/${encodeURIComponent(token)}/attach-user`, {
        method: 'POST',
        headers: vendorHeaders,
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d) throw new Error(d?.error || 'No se pudo adjuntar el usuario');
      // refrescar pedido
      const fresh = await tryJson(`${API}/api/orders/public/${encodeURIComponent(token)}`);
      if (fresh) setPedido(fresh);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      setAttachBusy(false);
    }
  }

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true); setErr('');
      const d = await tryJson(`${API}/api/orders/public/${encodeURIComponent(token)}`);
      if (cancel) return;
      if (!d) {
        setErr('No se encontró el pedido.');
        setPedido(null);
        setLoading(false);
        return;
      }
      setPedido(d);

      // 1) URL del comprobante (directo / cache / endpoint configurado)
      const url = await resolveProofUrl(d);
      if (!cancel && url) setProofUrl(url);

      // 2) miniatura
      const pid = d?.items?.[0]?.productoId ?? d?.items?.[0]?.productId;
      if (pid != null) {
        const p = await fetchProductoSeguro(pid);
        if (!cancel && p) {
          const gal = pickGalleryFromProducto(p);
          setPrincipalImg(gal[0] || '');
        }
      }

      // 3) si está logueado, intentar adjuntar de inmediato
      if (!cancel && userId) {
        await attachUserIfPossible('');
      }

      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [token, userId]);

  function onFileChange(e) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setUploadErr('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f ? URL.createObjectURL(f) : '');
  }

  async function onUpload() {
    if (!file) { setUploadErr('Selecciona una imagen primero.'); return; }
    setUploadBusy(true);
    setUploadErr('');
    try {
      const tiendaId = pedido?.tienda?.id ?? pedido?.tiendaId ?? null;
      const pedidoId = pedido?.id ?? null;

      const resp = await uploadImage(file, { tiendaId, pedidoId });
      const mediaId = extractMediaId(resp);
      const mediaUrl = extractMediaUrl(resp);
      if (!mediaId) throw new Error('No se pudo obtener el ID del archivo');

      // Registrar comprobante
      const r = await fetch(`${API}/api/orders/public/${encodeURIComponent(token)}/proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) throw new Error(d?.error || 'Error registrando comprobante');

      // Mostrar y persistir (para siguientes recargas)
      setUploadedInfo({ mediaId, url: mediaUrl });
      if (mediaUrl) {
        setProofUrl(mediaUrl);
        saveProofUrl(token, mediaId, mediaUrl);
      }

      // refrescar pedido
      const d2 = await tryJson(`${API}/api/orders/public/${encodeURIComponent(token)}`);
      if (d2) setPedido(d2);

      setRequestMsg('Comprobante registrado. Ahora puedes solicitar revisión.');
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    } catch (e) {
      setUploadErr(e?.message || 'Falló la subida o el registro del comprobante.');
    } finally {
      setUploadBusy(false);
    }
  }

  // Validación simple de teléfono (8+ dígitos)
  const phoneOk = useMemo(() => (phone.replace(/\D/g, '').length >= 8), [phone]);

  async function onRequest() {
    try {
      setErr('');
      setRequestBusy(true);
      setRequestMsg('');

      // Si el pedido no tiene buyerPhone, obligar a capturar antes
      const needsPhone = !((pedido?.buyerPhone || '').replace(/\D/g, '').length >= 8);
      if (needsPhone) {
        if (!phoneOk) {
          setPhoneErr('Ingresa un número de teléfono válido (mín. 8 dígitos).');
          setRequestBusy(false);
          return;
        }
        // Adjuntar usuario (si hay) y/o teléfono capturado
        const ok = await attachUserIfPossible(phone);
        if (!ok) {
          setErr('No se pudo guardar tu teléfono. Intenta otra vez.');
          setRequestBusy(false);
          return;
        }
      }

      const r = await fetch(`${API}/api/orders/public/${encodeURIComponent(token)}/request`, { method: 'POST' });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) throw new Error(d?.error || 'No se pudo solicitar la revisión.');
      const msg = d.positionMessage || 'Solicitud enviada.';
      setRequestMsg(msg);

      const d2 = await tryJson(`${API}/api/orders/public/${encodeURIComponent(token)}`);
      if (d2) setPedido(d2);
    } catch (e) {
      setRequestMsg('');
      setErr(e?.message || 'Error al solicitar revisión.');
    } finally {
      setRequestBusy(false);
    }
  }

  async function regenerateLink() {
    if (!pedido) return;
    const url = await resolveProofUrl(pedido);
    if (url) {
      setProofUrl(url);
      const mid = pedido?.proofMediaId || pedido?.proof?.mediaId || null;
      saveProofUrl(token, mid, url);
    }
  }

  if (loading) {
    return (<div className="pp-loading"><div className="pp-spinner" /><p>Cargando pedido…</p></div>);
  }

  if (err || !pedido) {
    return (
      <div className="pp-error">
        <p>{err || 'Pedido no disponible.'}</p>
        <button className="btn" onClick={() => navigate(-1)}><FiChevronLeft /> Volver</button>
      </div>
    );
  }

  const hasProofId  = Boolean(pedido?.proofMediaId || pedido?.proof?.mediaId);
  const hasProofUrl = Boolean(proofUrl);
  const hasProof    = Boolean(hasProofId || uploadedInfo?.mediaId || proofUrl);
  const tiendaLogo  = toPublicSrc(pedido?.tienda?.logo?.url || pedido?.tienda?.logoUrl);

  const needsBuyerPhone = !((pedido?.buyerPhone || '').replace(/\D/g, '').length >= 8);

  return (
    <div>
      {/* NavBarUsuario visible si hay usuario */}
      {isLogged && <NavBarUsuario />}

      <div className="pp-container" style={{ padding: '1rem', marginTop: isLogged ? 60 : 0 }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}><FiChevronLeft /> Volver</button>

        <div className="card" style={{ marginTop: '1rem', padding: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Comprobante de pago</h2>

          {/* Resumen */}
          <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display:'grid', gridTemplateColumns:'100px 1fr', gap:'1rem', alignItems:'center' }}>
              <div style={{ width:100, height:100 }}>
                {principalImg ? (
                  <img src={principalImg} alt="Producto" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:5 }} />
                ) : tiendaLogo ? (
                  <img src={tiendaLogo} alt="Tienda" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:5 }} />
                ) : (
                  <div style={{ height:100, display:'grid', placeItems:'center' }}>
                    <FiImage /><div><small>Sin imagen</small></div>
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

          {/* Estado */}
          <div className="card" style={{ padding:'1rem', marginBottom:'1rem' }}>
            <div style={{ display:'grid', gap:'.35rem' }}>
              <div><strong>Estado pedido:</strong> {pedido.status}</div>
              <div><strong>Estado de pago:</strong> {pedido.paymentStatus}</div>
              {pedido.requested && (<div style={{ display:'flex', alignItems:'center', gap:'.5rem' }}><FiCheckCircle /><strong>Solicitud enviada</strong></div>)}
              {/* position y message son null a propósito (no existen en schema) */}
            </div>
          </div>

          {/* Datos de comprador (auto-adjuntar usuario + teléfono) */}
          <div className="card" style={{ padding:'1rem', marginBottom:'1rem' }}>
            <h3 style={{ marginTop: 0 }}><FiUser /> Tus datos</h3>
            {isLogged ? (
              <div style={{ color:'var(--text-2)', marginBottom:'.5rem' }}>
                Estás logueado. Adjuntamos tu cuenta al pedido automáticamente.
              </div>
            ) : (
              <div style={{ color:'var(--text-2)', marginBottom:'.5rem' }}>
                No has iniciado sesión. Puedes continuar dejando un teléfono para que la tienda te contacte.
              </div>
            )}

            <div style={{ display:'grid', gap:'.5rem', maxWidth: 420 }}>
              <label style={{ display:'grid', gap:6 }}>
                <span><FiPhone /> Teléfono de contacto {needsBuyerPhone && <span style={{color:'var(--danger,#dc2626)'}}>*</span>}</span>
                <input
                  type="tel"
                  placeholder="Ej. 55 1234 5678"
                  value={phone}
                  onChange={(e)=>{ setPhone(e.target.value); setPhoneErr(''); }}
                  disabled={attachBusy}
                />
              </label>
              {phoneErr && (<div style={{ color:'var(--danger, #dc2626)' }}><FiAlertTriangle /> {phoneErr}</div>)}
              <div>
                <button
                  className="btn"
                  onClick={() => attachUserIfPossible(phone)}
                  disabled={attachBusy || (!phone && !isLogged)}
                  title="Guardar datos de comprador en este pedido"
                >
                  {attachBusy ? 'Guardando…' : 'Guardar datos'}
                </button>
              </div>
              {pedido?.buyerUserId && (
                <small style={{ color:'var(--text-3)' }}>
                  Pedido ligado al usuario #{pedido.buyerUserId}{pedido?.buyerName ? ` · ${pedido.buyerName}` : ''}
                </small>
              )}
              {pedido?.buyerPhone && (
                <small style={{ color:'var(--text-3)' }}>
                  Teléfono guardado: {pedido.buyerPhone}
                </small>
              )}
            </div>
          </div>

          {/* Subida/visualización */}
          <div className="card" style={{ padding:'1rem', marginBottom:'1rem' }}>
            <h3 style={{ marginTop: 0 }}>1) Sube tu comprobante</h3>
            <p style={{ marginTop: 0, color:'var(--text-2)' }}>
              Imagen del recibo/transferencia (JPG/PNG).
              {isInReview && <><br /><em>Está en revisión: no puedes cambiar el archivo por ahora.</em></>}
            </p>

            <div style={{ display:'grid', gridTemplateColumns:'160px 1fr', gap:'1rem', alignItems:'center' }}>
              <div
                style={{
                  width:160, height:160, border:'1px dashed var(--border-color)', borderRadius:8,
                  overflow:'hidden', display:'grid', placeItems:'center', background:'rgba(255,255,255,.04)',
                  cursor: (proofUrl || previewUrl) ? 'zoom-in' : 'default'
                }}
                onClick={() => { if (proofUrl || previewUrl) setShowModal(true); }}
                title={(proofUrl || previewUrl) ? 'Ver en grande' : undefined}
              >
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
                <input type="file" accept="image/*" onChange={onFileChange} disabled={uploadBusy || isInReview} />
                {uploadErr && (<div style={{ color:'var(--danger, #dc2626)' }}><FiAlertTriangle /> {uploadErr}</div>)}
                <div style={{ display:'flex', gap:'.5rem', flexWrap:'wrap' }}>
                  <button className="btn btn-primary" onClick={onUpload} disabled={uploadBusy || !file || isInReview}>
                    {uploadBusy ? 'Subiendo…' : (<><FiUpload /> Subir comprobante</>)}
                  </button>
                  <button className="btn btn-ghost" onClick={() => { if (previewUrl) URL.revokeObjectURL(previewUrl); setFile(null); setPreviewUrl(''); setUploadErr(''); }} disabled={uploadBusy || isInReview}>
                    Limpiar
                  </button>
                  {hasProofId && !hasProofUrl && (
                    <button className="btn" onClick={regenerateLink} title="Generar enlace para ver el comprobante">
                      <FiRefreshCw /> Generar enlace
                    </button>
                  )}
                  {hasProofUrl && (
                    <a href={toPublicSrc(proofUrl)} target="_blank" rel="noreferrer" className="btn btn-ghost"><FiMaximize2 /> Ver comprobante</a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Solicitar revisión */}
          <div className="card" style={{ padding:'1rem', marginBottom:'1rem' }}>
            <h3 style={{ marginTop: 0 }}>2) Solicitar revisión</h3>
            <p style={{ marginTop: 0, color:'var(--text-2)' }}>
              Para entrar a la fila de revisión, necesitamos un teléfono válido para que la tienda te contacte si hace falta.
            </p>
            <div style={{ display:'flex', gap:'.5rem', alignItems:'center', flexWrap:'wrap' }}>
              <button className="btn btn-primary" onClick={onRequest} disabled={requestBusy || pedido.requested}>
                {requestBusy ? 'Enviando…' : 'Solicitar revisión'}
              </button>
              <button
                className="btn btn-ghost"
                onClick={async () => {
                  const d = await tryJson(`${API}/api/orders/public/${encodeURIComponent(token)}`);
                  if (d) {
                    setPedido(d);
                    const u = await resolveProofUrl(d);
                    if (u) { setProofUrl(u); saveProofUrl(token, d?.proofMediaId || d?.proof?.mediaId, u); }
                  }
                }}
              >
                <FiRefreshCw /> Actualizar
              </button>
              {requestMsg && <span style={{ marginLeft:'.5rem' }}>{requestMsg}</span>}
            </div>
          </div>

          {/* WhatsApp */}
          <div className="card" style={{ padding:'1rem' }}>
            <h3 style={{ marginTop: 0 }}>¿Dudas? Contacta al vendedor</h3>
            <div style={{ display:'flex', gap:'.5rem', alignItems:'center' }}>
              <button className="btn" onClick={() => {
                const selfUrl = makeComprobanteSelfUrl(token);
                const msg = encodeURIComponent(['Hola 👋','Ya realicé el pago y subí el comprobante.','Por favor, revisa mi pedido 🙏',`Comprobante: ${selfUrl}`].join('\n'));
                const wa = tiendaPhone ? `https://wa.me/${tiendaPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
                window.open(wa, '_blank', 'noopener,noreferrer');
              }} disabled={!tiendaPhone}>
                <FiMessageCircle /> Abrir WhatsApp
              </button>
              {!tiendaPhone && <small style={{ color:'var(--text-3)' }}>Esta tienda no tiene WhatsApp configurado.</small>}
            </div>
          </div>
        </div>

        {/* Modal imagen grande */}
        {showModal && (previewUrl || proofUrl) && (
          <div onClick={() => setShowModal(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', display:'grid', placeItems:'center', zIndex:1000, padding:'2rem' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ position:'relative', maxWidth:'min(95vw, 1000px)', maxHeight:'85vh' }}>
              <button className="btn btn-ghost" style={{ position:'absolute', top:8, right:8 }} onClick={() => setShowModal(false)}><FiX /></button>
              <img src={previewUrl || toPublicSrc(proofUrl)} alt="Comprobante" style={{ width:'100%', height:'100%', objectFit:'contain', borderRadius:8 }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

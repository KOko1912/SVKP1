// frontend/src/pages/Vendedor/Finanzas/Inicio.jsx
import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  FiCheckCircle, FiXCircle, FiEye, FiRefreshCw, FiClock, FiPhone, FiMail, FiUser, FiDollarSign, FiMessageCircle, FiX
} from "react-icons/fi";
import "./Finanzaz.css";

/* ===================== Bases ===================== */
const API   = (import.meta.env.VITE_API_URL    || "http://localhost:5000").replace(/\/$/, "");
const FILES = (import.meta.env.VITE_FILES_BASE || API).replace(/\/$/, "");

/* ===================== Helpers ===================== */
// Igual que en Vendedor/Perfil.jsx
function vendorHeaders() {
  try {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
    if (usuario?.id) return { "Content-Type": "application/json", "x-user-id": usuario.id };
  } catch {}
  const id =
    JSON.parse(localStorage.getItem("svk_user") || "null")?.id ||
    JSON.parse(localStorage.getItem("ventasvk_user") || "null")?.id ||
    JSON.parse(localStorage.getItem("user") || "null")?.id ||
    localStorage.getItem("svk_user_id") ||
    localStorage.getItem("user_id");
  return id ? { "Content-Type": "application/json", "x-user-id": Number(id) } : { "Content-Type": "application/json" };
}

async function apiGet(path) {
  const res = await fetch(`${API}${path}`, { headers: vendorHeaders(), credentials: "include" });
  if (res.status === 401) {
    Swal.fire({ icon: "warning", title: "Sesión requerida", text: "Inicia sesión para ver Finanzas." });
    window.location.hash = "#/login";
    throw new Error('{"error":"No autorizado"}');
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiJSON(path, method, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: vendorHeaders(),
    credentials: "include",
    body: JSON.stringify(body || {}),
  });
  if (res.status === 401) {
    Swal.fire({ icon: "warning", title: "Sesión requerida", text: "Inicia sesión para continuar." });
    window.location.hash = "#/login";
    throw new Error('{"error":"No autorizado"}');
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function formatMoneyMXN(cents) {
  const n = Number(cents || 0) / 100;
  try { return new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(n); }
  catch { return `MXN ${n.toFixed(2)}`; }
}

function ts(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString();
}

function opcionesToStr(opciones) {
  try {
    if (!opciones) return "";
    if (Array.isArray(opciones)) return opciones.join(", ");
    if (typeof opciones === "object") return Object.entries(opciones).map(([k,v])=>`${k}: ${v}`).join(" | ");
    return String(opciones);
  } catch { return ""; }
}

/** Devuelve una URL usable en <img> que redirige al archivo en Supabase */
function resolveMediaUrl(mediaId) {
  if (!mediaId) return null;
  return `${API}/api/media/${mediaId}`;
}

/* =====================================================
   Finanzas / Inicio: Entrada de pedidos + acciones
   ===================================================== */
export default function FinanzasInicio() {
  const [loading, setLoading] = useState(true);
  const [tienda, setTienda]   = useState(null);
  const [items, setItems]     = useState([]); // pedidos
  const [error, setError]     = useState("");
  const [act, setAct]         = useState({}); // estado de acción por pedidoId

  // Modal comprobante
  const [showProof, setShowProof] = useState(false);
  const [proofSrc, setProofSrc]   = useState("");

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      // 1) Obtener mi tienda
      const me = await apiGet("/api/tienda/me");
      const t = me?.tienda || me;
      if (!t?.id) throw new Error("No se pudo cargar la tienda del vendedor");
      setTienda(t);

      // 2) Pedidos pendientes/en proceso
      const qs = new URLSearchParams({ tiendaId: String(t.id), status: "PENDIENTE,EN_PROCESO" });
      const list = await apiGet(`/api/orders/vendor/requests?${qs.toString()}`);
      const arr = Array.isArray(list) ? list : (Array.isArray(list?.items) ? list.items : []);
      setItems(arr);
    } catch (e) {
      console.error(e);
      setError("No se pudo cargar la bandeja de pedidos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  /* ----------------- Stock helpers ----------------- */
  async function getProductoFull(productoId) {
    return apiGet(`/api/v1/productos/${productoId}`);
  }

  async function patchProductoInventario(productoId, newStock) {
    return apiJSON(`/api/v1/productos/${productoId}`, "PATCH", { inventario: { stock: Number(newStock) } });
  }

  async function patchVarianteInventario(varianteId, newStock) {
    return apiJSON(`/api/v1/productos/variantes/${varianteId}`, "PATCH", { inventario: { stock: Number(newStock) } });
  }

  async function decrementInventoryForPedido(pedido) {
    for (const it of (pedido.items || [])) {
      const productoId = Number(it.productoId);
      const varianteId = it.varianteId != null ? Number(it.varianteId) : null;
      const qty        = Math.max(1, Number(it.cantidad || 1));

      const full = await getProductoFull(productoId);
      if (!full) continue;

      if (varianteId) {
        const v = (full.variantes || []).find(x => Number(x.id) === varianteId);
        const current = Number(v?.inventario?.stock ?? 0);
        const next    = Math.max(0, current - qty);
        await patchVarianteInventario(varianteId, next);
      } else {
        const current = Number(full?.inventario?.stock ?? 0);
        const next    = Math.max(0, current - qty);
        await patchProductoInventario(productoId, next);
      }
    }
  }

  /* ----------------- Acciones pedido ----------------- */
  async function decide(pedido, decision) {
    const id = Number(pedido.id);
    setAct(x => ({ ...x, [id]: true }));
    try {
      if (decision === "ACCEPT" || decision === "ACCEPT_CASH") {
        await decrementInventoryForPedido(pedido);
      }
      await apiJSON(`/api/orders/${id}/decision`, "PATCH", { decision });

      await Swal.fire({
        icon: "success",
        title: decision === "REJECT" ? "Pedido rechazado" : "Pedido confirmado",
        text: decision === "REJECT"
          ? "Se notificará al cliente por WhatsApp si corresponde."
          : "Stock actualizado y pedido marcado como pagado.",
        timer: 1600, showConfirmButton: false
      });

      await loadAll();
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: "error", title: "Ups", text: "No se pudo aplicar la acción. Revisa la consola." });
    } finally {
      setAct(x => ({ ...x, [id]: false }));
    }
  }

  /** Abre el comprobante en un modal (usa redirect del backend) */
  function openProof(pedido) {
    if (!pedido?.proofMediaId) {
      Swal.fire({ icon: "info", title: "Sin comprobante", text: "Este pedido no tiene comprobante asociado." });
      return;
    }
    const src = resolveMediaUrl(pedido.proofMediaId);
    setProofSrc(src || "");
    setShowProof(true);
  }

  const totalPendiente = useMemo(() => {
    const sum = items.reduce((acc, p) => acc + Number(p?.totals?.total ?? p.total ?? 0), 0);
    return formatMoneyMXN(sum);
  }, [items]);

  /* ----------------- UI ----------------- */
  if (loading) {
    return <div className="finanzas-wrap"><div className="p-4 text-sm" style={{color:"var(--gray-300)"}}>Cargando Finanzas…</div></div>;
  }

  if (error) {
    return (
      <div className="finanzas-wrap">
        <div className="state-error">
          {error}
          <button className="btn btn-ghost" style={{marginLeft:12}} onClick={loadAll}>
            <FiRefreshCw /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="finanzas-wrap">
      {/* Header */}
      <div className="finanzas-head">
        <div>
          <h1>Finanzas · Entrada de pedidos</h1>
          <p className="finanzas-sub">
            Tienda: <b>{tienda?.nombre}</b> · Pendiente por confirmar: <b>{totalPendiente}</b>
          </p>
        </div>
        <button onClick={loadAll} className="btn-refresh">
          <FiRefreshCw className="animate-spin-slow" /> Actualizar
        </button>
      </div>

      {/* Lista de pedidos */}
      <div className="orders-grid">
        {items.length === 0 && (
          <div className="empty">No hay solicitudes en revisión.</div>
        )}

        {items.map((p) => {
          // Heurística para detectar si el comprador es usuario registrado
          const isUser =
            Boolean(p?.buyerUserId || p?.userId || p?.buyer?.id) ||
            (p?.buyerEmail && p.buyerEmail !== "-" && p.buyerEmail.includes("@"));

          const phoneDigits = (p?.buyerPhone || "").toString().replace(/\D/g, "");
          const waUrl = phoneDigits
            ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
                [
                  "Hola 👋",
                  `Soy ${tienda?.nombre || "la tienda"}.`,
                  `Sobre tu pedido #${p.id}:`,
                  `Total: ${formatMoneyMXN(p?.totals?.total ?? p.total)}`,
                  "¿Podemos ayudarte en algo más?"
                ].join("\n")
              )}`
            : null;

          return (
            <article key={p.id} className="order-card">
              {/* Header tarjeta */}
              <header className="order-card__head">
                <div className="badges">
                  <span className="badge badge--status">{p.status}</span>
                  <span className="badge badge--payment">{p.paymentStatus}</span>
                  {p.position != null && (
                    <span className="badge badge--queue">Turno: {p.position}</span>
                  )}
                </div>
                <div className="order-meta">
                  <FiClock />
                  <span>Creado: {ts(p.createdAt)}</span>
                  {p.requestedAt && <span>· Solicitado: {ts(p.requestedAt)}</span>}
                </div>
              </header>

              {/* Comprador */}
              <section className="order-card__buyer">
                {isUser ? (
                  <>
                    <div title="Cliente registrado"><FiUser />{p.buyerName || "-" } <span className="badge badge--queue" style={{marginLeft:8}}>Usuario</span></div>
                    <div><FiPhone />{p.buyerPhone || "-"}</div>
                    <div><FiMail />{p.buyerEmail || "-"}</div>
                  </>
                ) : (
                  <>
                    <div title="Cliente invitado"><FiUser />Invitado <span className="badge badge--status" style={{marginLeft:8}}>Sin cuenta</span></div>
                    <div style={{gridColumn:"span 2 / span 2"}}><FiPhone />{p.buyerPhone || "-"}</div>
                  </>
                )}
              </section>

              {/* Items */}
              <section className="order-items">
                {(p.items || []).map(it => (
                  <div
                    key={it.id ?? `${it.productoId}-${it.varianteId ?? "base"}`}
                    className="order-item"
                  >
                    <div>
                      <div className="order-item__name">{it.nombre || `Producto ${it.productoId}`}</div>
                      {!!it.opciones && (
                        <div className="order-item__opt">{opcionesToStr(it.opciones)}</div>
                      )}
                    </div>
                    <div className="order-item__qty">
                      x{it.cantidad}
                      <div className="order-item__money">{formatMoneyMXN(it.total)}</div>
                    </div>
                  </div>
                ))}

                <div className="order-totals">
                  <div className="order-row">
                    <span><FiDollarSign /> Subtotal</span>
                    <strong>{formatMoneyMXN(p?.totals?.subTotal ?? p.subTotal)}</strong>
                  </div>
                  {Number((p?.totals?.shippingCost ?? p.shippingCost) || 0) > 0 && (
                    <div className="order-row">
                      <span>Envío</span>
                      <strong>{formatMoneyMXN(p?.totals?.shippingCost ?? p.shippingCost)}</strong>
                    </div>
                  )}
                  <div className="order-row order-row--total">
                    <span>Total</span>
                    <strong>{formatMoneyMXN(p?.totals?.total ?? p.total)}</strong>
                  </div>
                </div>
              </section>

              {/* Acciones */}
              <footer className="order-actions">
                <button
                  disabled={!p.proofMediaId || !!act[p.id]}
                  onClick={() => openProof(p)}
                  className="btn btn-ghost"
                  title={p.proofMediaId ? "Ver comprobante" : "Sin comprobante"}
                >
                  <FiEye /> Ver comprobante
                </button>

                <button
                  disabled={!!act[p.id]}
                  onClick={() => decide(p, "ACCEPT")}
                  className="btn btn-success"
                >
                  <FiCheckCircle /> Aceptar (con comprobante)
                </button>

                <button
                  disabled={!!act[p.id]}
                  onClick={() => decide(p, "ACCEPT_CASH")}
                  className="btn btn-primary"
                >
                  <FiCheckCircle /> Aceptar en efectivo
                </button>

                <button
                  disabled={!!act[p.id]}
                  onClick={() => decide(p, "REJECT")}
                  className="btn btn-danger"
                >
                  <FiXCircle /> Rechazar
                </button>

                {/* WhatsApp */}
                <a
                  className="btn btn-ghost"
                  href={waUrl || undefined}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => { if (!waUrl) e.preventDefault(); }}
                  title={waUrl ? "Enviar WhatsApp" : "No hay teléfono del comprador"}
                  style={{ marginLeft: "auto" }}
                >
                  <FiMessageCircle /> WhatsApp
                </a>
              </footer>

              {p.positionMessage && (
                <div className="foot-note">{p.positionMessage}</div>
              )}
            </article>
          );
        })}
      </div>

      {/* Nota técnica */}
      <p className="foot-note" style={{marginTop:12}}>
        Nota: Para que <b>Ver comprobante</b> funcione con Supabase, el backend debe exponer <code>GET /api/media/:id</code>.
      </p>

      {/* ===== Modal comprobante ===== */}
      {showProof && proofSrc && (
        <div
          onClick={() => setShowProof(false)}
          style={{
            position:"fixed", inset:0, background:"rgba(0,0,0,.85)", display:"grid",
            placeItems:"center", zIndex: 1000, padding:"2rem"
          }}
        >
          <div
            onClick={(e)=>e.stopPropagation()}
            style={{ position:"relative", maxWidth:"min(95vw, 1100px)", maxHeight:"85vh" }}
          >
            <button
              className="btn btn-ghost"
              style={{ position:"absolute", top:8, right:8 }}
              onClick={() => setShowProof(false)}
              aria-label="Cerrar"
            >
              <FiX />
            </button>
            <img
              src={proofSrc}
              alt="Comprobante"
              style={{ width:"100%", height:"100%", objectFit:"contain", borderRadius:8, background:"#000" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

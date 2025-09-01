// frontend/src/pages/Usuario/MisCompras.jsx
import React, { useEffect, useMemo, useState } from "react";
import NavBarUsuario from "./NavBarUsuario";
import {
  FiSearch,
  FiRefreshCw,
  FiDollarSign,
  FiClock,
  FiPackage,
  FiTruck,
  FiCheckCircle,
  FiXCircle,
  FiImage,
  FiExternalLink,
  FiShoppingBag,
} from "react-icons/fi";
import Swal from "sweetalert2";

/* ===================== Base ===================== */
const API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

/* ===================== Helpers ===================== */
function userHeaders() {
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

async function apiTry(path) {
  try {
    const r = await fetch(`${API}${path}`, { headers: userHeaders(), credentials: "include" });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

function moneyMXN(cents) {
  const n = Number(cents || 0) / 100;
  try { return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n); }
  catch { return `MXN ${n.toFixed(2)}`; }
}
const ts = (d) => (d ? new Date(d).toLocaleString() : "-");
const resolveMediaUrl = (id) => (id ? `${API}/api/media/${id}` : null);
function makeComprobanteSelfUrl(token) {
  const origin = window.location.origin;
  const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
  const hashMode = (import.meta.env.VITE_ROUTER_MODE === "hash") || window.location.hash?.startsWith("#/");
  return token ? (hashMode ? `${origin}${base}/#/comprobante/${token}` : `${origin}${base}/comprobante/${token}`) : "";
}

/* ===================== UI bits ===================== */
function Badge({ tone = "muted", children }) {
  return (
    <span
      className="badge"
      style={{
        fontSize: 12,
        padding: "4px 8px",
        borderRadius: 999,
        background:
          tone === "success" ? "rgba(16,185,129,.15)"
          : tone === "warning" ? "rgba(245,158,11,.15)"
          : tone === "danger" ? "rgba(239,68,68,.15)"
          : "rgba(148,163,184,.15)",
        color:
          tone === "success" ? "#10b981"
          : tone === "warning" ? "#f59e0b"
          : tone === "danger" ? "#ef4444"
          : "#94a3b8",
        border:
          tone === "success" ? "1px solid rgba(16,185,129,.25)"
          : tone === "warning" ? "1px solid rgba(245,158,11,.25)"
          : tone === "danger" ? "1px solid rgba(239,68,68,.25)"
          : "1px solid rgba(148,163,184,.25)",
      }}
    >
      {children}
    </span>
  );
}

function Section({ title, right, children }) {
  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <div className="card-header" style={{ display: "flex", alignItems: "center" }}>
        <h3 className="card-title" style={{ marginRight: 8 }}>{title}</h3>
        <div style={{ marginLeft: "auto" }}>{right}</div>
      </div>
      <div className="card-body">{children}</div>
    </section>
  );
}

/* ===================== Página ===================== */
export default function MisCompras() {
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState([]); // compras del usuario
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("activas"); // activas | entregadas | rechazadas

  const userId =
    JSON.parse(localStorage.getItem("usuario") || "null")?.id ||
    JSON.parse(localStorage.getItem("svk_user") || "null")?.id ||
    JSON.parse(localStorage.getItem("ventasvk_user") || "null")?.id ||
    JSON.parse(localStorage.getItem("user") || "null")?.id ||
    null;

  const loadAll = async () => {
    if (!userId) {
      Swal.fire({ icon: "info", title: "Inicia sesión", text: "Necesitas iniciar sesión para ver tus compras." });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Intentos (compat con distintos backends)
      const candidates = [
        `/api/orders/user-purchases?userId=${userId}`,
        `/api/orders/mine`,
        `/api/orders/by-user?userId=${userId}`,
        `/api/orders/search?buyerUserId=${userId}`,
        `/api/orders?buyerUserId=${userId}`,
        // variantes con /pedidos
        `/api/pedidos/user-purchases?userId=${userId}`,
        `/api/pedidos/mine`,
        `/api/pedidos/by-user?userId=${userId}`,
        `/api/pedidos/search?buyerUserId=${userId}`,
        `/api/pedidos?buyerUserId=${userId}`,
      ];

      let data = null;
      for (const path of candidates) {
        const d = await apiTry(path);
        if (Array.isArray(d)) { data = d; break; }
        if (Array.isArray(d?.items)) { data = d.items; break; }
      }

      setAll(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setAll([]);
      Swal.fire({ icon: "error", title: "No se pudieron cargar tus compras" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  // Normalización defensiva
  const normalize = (p) => {
    const total = Number(p?.totals?.total ?? p.total ?? 0);
    const tiendaName = p?.tienda?.nombre || p?.storeName || p?.tiendaNombre || "Tienda";
    return { ...p, __total: total, __created: p.decidedAt || p.createdAt, __tiendaName: tiendaName };
  };

  const filtradas = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = all.map(normalize);

    let arr = [];
    if (tab === "activas") {
      arr = list.filter((p) =>
        ["EN_PROCESO", "CONFIRMADA", "ENVIADA", "PENDIENTE", "VERIFICANDO"].includes(
          String(p.status || "").toUpperCase()
        )
      );
    } else if (tab === "entregadas") {
      arr = list.filter((p) => String(p.status || "").toUpperCase() === "ENTREGADA");
    } else {
      arr = list.filter((p) => {
        const st = String(p.status || "").toUpperCase();
        const ps = String(p.paymentStatus || "").toUpperCase();
        return st === "CANCELADA" || ps === "RECHAZADA";
      });
    }

    if (!s) return arr;
    return arr.filter(
      (p) =>
        `${p.id}`.includes(s) ||
        (p.__tiendaName || "").toLowerCase().includes(s) ||
        (p.items || []).some((it) => (it?.nombre || "").toLowerCase().includes(s))
    );
  }, [all, q, tab]);

  const totalTab = useMemo(() => filtradas.reduce((acc, p) => acc + Number(p.__total), 0), [filtradas]);

  return (
    <>
      <NavBarUsuario />

      <div style={{ padding: "12px 16px", maxWidth: 1200, margin: "0 auto" }}>
        {/* Header + filtros */}
        <div
          className="card"
          style={{ marginBottom: 12, padding: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
        >
          <div className="tabs" role="tablist" aria-label="Filtros de compras">
            <button
              role="tab"
              aria-selected={tab === "activas"}
              className={`tab ${tab === "activas" ? "active" : ""}`}
              onClick={() => setTab("activas")}
              title="En proceso / confirmadas / enviadas / pendientes"
            >
              <FiTruck style={{ marginRight: 6 }} />
              Activas
            </button>
            <button
              role="tab"
              aria-selected={tab === "entregadas"}
              className={`tab ${tab === "entregadas" ? "active" : ""}`}
              onClick={() => setTab("entregadas")}
              title="Marcadas como ENTREGADA"
            >
              <FiCheckCircle style={{ marginRight: 6 }} />
              Entregadas
            </button>
            <button
              role="tab"
              aria-selected={tab === "rechazadas"}
              className={`tab ${tab === "rechazadas" ? "active" : ""}`}
              onClick={() => setTab("rechazadas")}
              title="Canceladas o pago rechazado"
            >
              <FiXCircle style={{ marginRight: 6 }} />
              Rechazadas
            </button>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 260 }}>
            <div className="input-with-icon" style={{ position: "relative" }}>
              <FiSearch
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  opacity: 0.6,
                }}
              />
              <input
                type="search"
                placeholder="Buscar #id / tienda / producto"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{ paddingLeft: 34, minWidth: 240 }}
              />
            </div>
            <button className="btn" onClick={loadAll} title="Actualizar">
              <FiRefreshCw />
            </button>
          </div>
        </div>

        {/* Resumen */}
        <div className="card" style={{ marginBottom: 12, padding: "12px 16px" }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ minWidth: 200 }}>
              <div className="muted" style={{ fontSize: 13 }}>Total en esta vista</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{moneyMXN(totalTab)}</div>
            </div>
            <div style={{ minWidth: 160 }}>
              <div className="muted" style={{ fontSize: 13 }}>Compras encontradas</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{filtradas.length}</div>
            </div>
          </div>
        </div>

        {/* Lista */}
        <Section
          title={
            tab === "activas" ? "Tus compras activas"
            : tab === "entregadas" ? "Compras entregadas"
            : "Pedidos rechazados / cancelados"
          }
          right={<span className="muted" style={{ fontSize: 12 }}>(se muestran precios en MXN)</span>}
        >
          {loading && <div style={{ padding: "16px 8px", textAlign: "center" }}>Cargando…</div>}

          {!loading && filtradas.length === 0 && (
            <div style={{ padding: "16px 8px", textAlign: "center" }}>No hay compras para mostrar.</div>
          )}

          {!loading && filtradas.length > 0 && (
            <div
              className="orders-grid"
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}
            >
              {filtradas.map((p) => {
                const total = moneyMXN(p.__total);
                const tienda = p.__tiendaName;
                const proofUrl = resolveMediaUrl(p.proofMediaId);
                const publicUrl = makeComprobanteSelfUrl(p.token);

                const st = String(p.status || "").toUpperCase();
                const ps = String(p.paymentStatus || "").toUpperCase();
                let tone = "muted";
                if (st === "ENTREGADA") tone = "success";
                else if (st === "CANCELADA" || ps === "RECHAZADA") tone = "danger";
                else if (st === "ENVIADA" || st === "CONFIRMADA") tone = "warning";

                return (
                  <article key={p.id} className="card" style={{ padding: 12 }}>
                    <header style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <FiShoppingBag />
                      <strong style={{ fontSize: 14 }}>{tienda}</strong>
                      <div style={{ marginLeft: "auto" }}>
                        <Badge tone={tone}>{p.status} · {p.paymentStatus}</Badge>
                      </div>
                    </header>

                    <div className="muted" style={{ fontSize: 12 }}>
                      <FiClock style={{ marginRight: 6 }} />
                      {ts(p.__created)}
                    </div>

                    <div style={{ marginTop: 8 }}>
                      {(p.items || []).map((it) => (
                        <div
                          key={it.id ?? `${it.productoId}-${it.varianteId ?? "b"}`}
                          className="muted"
                          style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}
                        >
                          <span>{it.nombre || `Producto ${it.productoId}`} ×{it.cantidad}</span>
                          <span>{moneyMXN(it.total)}</span>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: 10,
                        paddingTop: 8,
                        borderTop: "1px dashed var(--gray-700, #2b2f36)",
                        alignItems: "center",
                      }}
                    >
                      <span className="muted" style={{ fontSize: 12 }}>
                        <FiDollarSign style={{ marginRight: 6 }} /> Total
                      </span>
                      <strong>{total}</strong>
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      {proofUrl && (
                        <a className="btn btn-ghost" href={proofUrl} target="_blank" rel="noreferrer" title="Ver comprobante">
                          <FiImage /> Comprobante
                        </a>
                      )}
                      {publicUrl && (
                        <a className="btn btn-ghost" href={publicUrl} target="_blank" rel="noreferrer" title="Ver resumen">
                          <FiExternalLink /> Resumen
                        </a>
                      )}

                      {st === "ENVIADA" && (
                        <span className="muted" style={{ fontSize: 12 }}>
                          <FiPackage style={{ marginRight: 6 }} /> En camino
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </>
  );
}

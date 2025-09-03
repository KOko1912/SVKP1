// frontend/src/pages/Vendedor/Finanzas/Ingresos.jsx
import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { jsPDF } from "jspdf";
import {
  FiCalendar, FiDownload, FiRefreshCw, FiSearch, FiUser, FiPhone,
  FiImage, FiPackage, FiX
} from "react-icons/fi";
import Swal from "sweetalert2";
import "./Finanzaz.css";
import FinanzasNabvar from "./FinanzasNabvar.jsx";

dayjs.locale("es");

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

/* ===== Helpers auth header ===== */
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
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function apiJSON(path, method, body) {
  const res = await fetch(`${API}${path}`, {
    method, headers: vendorHeaders(), credentials: "include", body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function moneyMXN(cents) {
  const n = Number(cents || 0) / 100;
  try { return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n); }
  catch { return `MXN ${n.toFixed(2)}`; }
}

async function fetchImageAsDataURL(url) {
  try {
    const r = await fetch(url, { mode: "cors" });
    const b = await r.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(b);
    });
  } catch { return null; }
}

function rangePreset(preset) {
  const now = dayjs();
  if (preset === "day")   return { from: now.startOf("day"),   to: now.endOf("day") };
  if (preset === "week")  return { from: now.startOf("week"),  to: now.endOf("week") };
  if (preset === "month") return { from: now.startOf("month"), to: now.endOf("month") };
  if (preset === "year")  return { from: now.startOf("year"),  to: now.endOf("year") };
  return { from: now.startOf("day"), to: now.endOf("day") };
}

export default function Ingresos() {
  const [loading, setLoading] = useState(true);
  const [tienda, setTienda] = useState(null);
  const [rows, setRows] = useState([]);
  const [preset, setPreset] = useState("day");
  const [from, setFrom] = useState(rangePreset("day").from.format("YYYY-MM-DD"));
  const [to, setTo] = useState(rangePreset("day").to.format("YYYY-MM-DD"));
  const [q, setQ] = useState("");

  // responsive: tabla en desktop, tarjetas en móvil
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.matchMedia("(max-width: 600px)").matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 600px)");
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener?.("change", onChange);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Modal de comprobante
  const [showProof, setShowProof] = useState(false);
  const [proofSrc, setProofSrc] = useState("");

  const loadAll = async () => {
    setLoading(true);
    try {
      const me = await apiGet("/api/tienda/me");
      const t = me?.tienda || me;
      if (!t?.id) throw new Error("No se pudo cargar la tienda del vendedor");
      setTienda(t);

      const params = new URLSearchParams({
        tiendaId: String(t.id),
        from: dayjs(from).startOf("day").toISOString(),
        to: dayjs(to).endOf("day").toISOString(),
        paymentStatus: "PAGADA",
        status: "EN_PROCESO,CONFIRMADA,ENVIADA,ENTREGADA",
      });
      const list = await apiGet(`/api/orders/vendor/income?${params.toString()}`);
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
      setRows([]);
      Swal.fire({ icon: "error", title: "No se pudo cargar ingresos" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    if (preset !== "custom") {
      const { from: f, to: t } = rangePreset(preset);
      setFrom(f.format("YYYY-MM-DD"));
      setTo(t.format("YYYY-MM-DD"));
    }
  }, [preset]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      `${r.id}`.includes(s) ||
      (r?.buyerName || "").toLowerCase().includes(s) ||
      (r?.buyerPhone || "").toLowerCase().includes(s) ||
      (r?.items || []).some(it => (it?.nombre || "").toLowerCase().includes(s))
    );
  }, [rows, q]);

  const total = useMemo(() => {
    return visible.reduce((acc, r) => acc + Number(r?.totals?.total ?? r.total ?? 0), 0);
  }, [visible]);

  async function markDelivered(id) {
    try {
      await apiJSON(`/api/orders/${id}/delivered`, "PATCH");
      Swal.fire({ icon: "success", title: "Pedido marcado como ENTREGADA", timer: 1400, showConfirmButton: false });
      await loadAll();
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: "error", title: "No se pudo marcar como ENTREGADA" });
    }
  }

  async function onExportPDF() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    const pad = 40;

    // Portada
    doc.setFontSize(20);
    doc.text("Reporte de Ingresos", w/2, 90, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Tienda: ${tienda?.nombre || "-"}`, w/2, 120, { align: "center" });
    doc.text(`Rango: ${dayjs(from).format("DD/MM/YYYY")} - ${dayjs(to).format("DD/MM/YYYY")}`, w/2, 140, { align: "center" });
    doc.text(`Ventas aceptadas: ${visible.length}`, w/2, 160, { align: "center" });
    doc.text(`Total: ${moneyMXN(total)}`, w/2, 180, { align: "center" });

    // Detalle por venta
    for (let i = 0; i < visible.length; i++) {
      const r = visible[i];
      if (i > 0) doc.addPage();

      doc.setFontSize(14);
      doc.text(`Venta #${r.id}`, pad, 70);
      doc.setFontSize(11);
      doc.text(`Fecha: ${dayjs(r.decidedAt || r.createdAt).format("DD/MM/YYYY HH:mm")}`, pad, 90);

      // Cliente
      doc.setFontSize(12);
      doc.text("Cliente", pad, 120);
      doc.setFontSize(11);
      doc.text(`Nombre: ${r.buyerName || "-"}`, pad, 140);
      doc.text(`Teléfono: ${r.buyerPhone || "-"}`, pad, 158);
      if (r.buyerEmail) doc.text(`Email: ${r.buyerEmail}`, pad, 176);

      // Items
      doc.setFontSize(12);
      doc.text("Producto(s)", pad, 210);
      let y = 230;
      (r.items || []).forEach((it) => {
        doc.setFontSize(11);
        doc.text(`• ${it.nombre || "Producto"}  x${it.cantidad}`, pad, y);
        doc.text(`${moneyMXN(it.total)}`, w - pad, y, { align: "right" });
        y += 18;
      });

      // Totales
      y += 8;
      doc.setFontSize(11);
      doc.text("Subtotal:", w - 180, y);
      doc.text(`${moneyMXN(r?.totals?.subTotal ?? r.subTotal)}`, w - pad, y, { align: "right" });
      y += 16;
      doc.text("Envío:", w - 180, y);
      doc.text(`${moneyMXN(r?.totals?.shippingCost ?? r.shippingCost)}`, w - pad, y, { align: "right" });
      y += 16;
      doc.setFontSize(13);
      doc.text("Total:", w - 180, y);
      doc.text(`${moneyMXN(r?.totals?.total ?? r.total)}`, w - pad, y, { align: "right" });

      // Comprobante
      if (r.proofMediaId) {
        const proofUrl = `${API}/api/media/${r.proofMediaId}`;
        const dataURL = await fetchImageAsDataURL(proofUrl);
        if (dataURL) {
          const imgW = w - pad*2;
          const imgH = 300;
          const yImg = y + 30;
          doc.setFontSize(12);
          doc.text("Comprobante:", pad, y + 20);
          doc.addImage(dataURL, "JPEG", pad, yImg, imgW, imgH, undefined, "FAST");
        }
      }

      doc.setFontSize(9);
      doc.text(`SystemVkode · Reporte generado ${dayjs().format("DD/MM/YYYY HH:mm")}`, pad, 820);
    }

    doc.save(`Ingresos_${tienda?.nombre || "Tienda"}_${dayjs(from).format("YYYYMMDD")}-${dayjs(to).format("YYYYMMDD")}.pdf`);
  }

  function openProof(row) {
    if (!row?.proofMediaId) {
      Swal.fire({ icon: "info", title: "Sin comprobante", text: "Este pedido no tiene comprobante." });
      return;
    }
    setProofSrc(`${API}/api/media/${row.proofMediaId}`);
    setShowProof(true);
  }

  /* ------------ UI helpers (móvil: tarjetas) ------------ */
  const RowCard = ({ r }) => (
    <article className="order-card" style={{ marginBottom: 10 }}>
      <header className="order-card__head">
        <div className="badges">
          <span className="badge badge--payment">{r.paymentStatus || "PAGADA"}</span>
          <span className="badge badge--status">{r.status}</span>
        </div>
        <div className="order-meta">
          {dayjs(r.decidedAt || r.createdAt).format("DD/MM/YYYY HH:mm")}
        </div>
      </header>

      <section className="order-card__buyer">
        <div><FiUser /> {r.buyerName || "-"}</div>
        <div><FiPhone /> {r.buyerPhone || "-"}</div>
        <div><b>Total:</b>&nbsp;{moneyMXN(r?.totals?.total ?? r.total)}</div>
      </section>

      <section className="order-items">
        {(r.items || []).map((it) => (
          <div key={it.id} className="order-item">
            <div>
              <div className="order-item__name">{it.nombre || "Producto"}</div>
              <div className="order-item__opt">x{it.cantidad}</div>
            </div>
            <div className="order-item__qty">
              <div className="order-item__money">{moneyMXN(it.total)}</div>
            </div>
          </div>
        ))}
        <div className="order-totals">
          <div className="order-row"><span>Subtotal</span><strong>{moneyMXN(r?.totals?.subTotal ?? r.subTotal)}</strong></div>
          {!!Number(r?.totals?.shippingCost ?? r.shippingCost) && (
            <div className="order-row"><span>Envío</span><strong>{moneyMXN(r?.totals?.shippingCost ?? r.shippingCost)}</strong></div>
          )}
          <div className="order-row order-row--total"><span>Total</span><strong>{moneyMXN(r?.totals?.total ?? r.total)}</strong></div>
        </div>
      </section>

      <footer className="order-actions">
        <button className="btn btn-ghost" onClick={() => openProof(r)}>
          <FiImage /> Ver comprobante
        </button>
        {r.status !== "ENTREGADA" ? (
          <button className="btn btn-primary" onClick={() => markDelivered(r.id)}>
            <FiPackage /> Entregado
          </button>
        ) : null}
      </footer>
    </article>
  );

  /* ------------ RENDER ------------ */
  return (
    <>
      <FinanzasNabvar />

      <div className="finanzas-wrap">
        {/* Head */}
        <div className="finanzas-head">
          <div>
            <h1>Finanzas · Ingresos</h1>
            <p className="finanzas-sub">
              Tienda: <b>{tienda?.nombre || "-"}</b> · Total mostrado: <b>{moneyMXN(total)}</b>
            </p>
          </div>
          <div className="btns" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn" onClick={() => loadAll()}><FiRefreshCw /> Actualizar</button>
            <button className="btn btn-success" onClick={onExportPDF}><FiDownload /> Exportar PDF</button>
          </div>
        </div>

        {/* Filtros */}
        <div className="card" style={{ padding: "1rem", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FiCalendar /> Período:
              <select value={preset} onChange={(e)=>setPreset(e.target.value)}>
                <option value="day">Día</option>
                <option value="week">Semana</option>
                <option value="month">Mes</option>
                <option value="year">Año</option>
                <option value="custom">Personalizado</option>
              </select>
            </label>

            <label>Desde:
              <input type="date" value={from} onChange={(e)=>{ setFrom(e.target.value); setPreset("custom"); }} />
            </label>
            <label>Hasta:
              <input type="date" value={to} onChange={(e)=>{ setTo(e.target.value); setPreset("custom"); }} />
            </label>
            <button className="btn" onClick={loadAll}><FiSearch /> Filtrar</button>

            <div style={{ flex: 1 }} />
            <input
              type="search"
              placeholder="Buscar cliente / producto / #id"
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              style={{ minWidth: 220, flex: isMobile ? "1 1 100%" : "0 0 auto" }}
            />
          </div>
        </div>

        {/* Desktop: tabla / Mobile: tarjetas */}
        {!isMobile ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th><th>Fecha</th><th>Cliente</th><th>Teléfono</th>
                  <th>Producto(s)</th><th>Total</th><th>Estado</th><th>Comprobante</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={9} style={{ textAlign:"center", padding:"1rem" }}>Cargando…</td></tr>
                )}
                {!loading && visible.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign:"center", padding:"1rem" }}>Sin resultados</td></tr>
                )}
                {!loading && visible.map(r => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{dayjs(r.decidedAt || r.createdAt).format("DD/MM/YYYY HH:mm")}</td>
                    <td><FiUser /> {r.buyerName || "-"}</td>
                    <td><FiPhone /> {r.buyerPhone || "-"}</td>
                    <td>
                      {(r.items || []).map(it => (
                        <div key={it.id} className="muted">
                          {it.nombre} x{it.cantidad}
                        </div>
                      ))}
                    </td>
                    <td><b>{moneyMXN(r?.totals?.total ?? r.total)}</b></td>
                    <td>{r.status}</td>
                    <td>
                      <button className="btn btn-ghost" onClick={() => openProof(r)}>
                        <FiImage /> Ver
                      </button>
                    </td>
                    <td>
                      {r.status !== "ENTREGADA" ? (
                        <button className="btn btn-primary" onClick={() => markDelivered(r.id)} title="Marcar como ENTREGADA">
                          <FiPackage /> Entregado
                        </button>
                      ) : <span className="muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ textAlign:"right" }}><b>Total</b></td>
                  <td colSpan={4}><b>{moneyMXN(total)}</b></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {loading && <div className="empty">Cargando…</div>}
            {!loading && visible.length === 0 && <div className="empty">Sin resultados</div>}
            {!loading && visible.map(r => <RowCard key={r.id} r={r} />)}
            {!loading && visible.length > 0 && (
              <div className="card" style={{ padding: "0.9rem 1rem", fontWeight: 800 }}>
                Total: {moneyMXN(total)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de comprobante (igual que Inicio) */}
      {showProof && proofSrc && (
        <div
          onClick={() => setShowProof(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,.85)",
            display: "grid", placeItems: "center", zIndex: 1000, padding: "2rem"
          }}
        >
          <div onClick={(e)=>e.stopPropagation()} style={{ position: "relative", maxWidth: "min(95vw, 1000px)", maxHeight: "85vh" }}>
            <button className="btn btn-ghost" style={{ position: "absolute", top: 8, right: 8 }} onClick={() => setShowProof(false)} aria-label="Cerrar">
              <FiX />
            </button>
            <img src={proofSrc} alt="Comprobante" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 8 }} />
          </div>
        </div>
      )}
    </>
  );
}

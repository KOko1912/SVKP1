// frontend/src/pages/Vendedor/Finanzas/Inicio.jsx
import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import MascotWarmupLoader from "../../../components/MascotWarmupLoader.jsx";

import {
  FiCheckCircle, FiXCircle, FiEye, FiRefreshCw, FiClock, FiPhone, FiMail, FiUser,
  FiDollarSign, FiMessageCircle, FiX
} from "react-icons/fi";
import FinanzasNabvar from "./FinanzasNabvar.jsx";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar
} from "recharts";
import "./Finanzaz.css";

/* ===================== Bases ===================== */
const API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

/* ===================== Helpers ===================== */
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
function ts(dateStr) { if (!dateStr) return ""; const d = new Date(dateStr); return d.toLocaleString(); }
function opcionesToStr(opciones) {
  try {
    if (!opciones) return "";
    if (Array.isArray(opciones)) return opciones.join(", ");
    if (typeof opciones === "object") return Object.entries(opciones).map(([k,v])=>`${k}: ${v}`).join(" | ");
    return String(opciones);
  } catch { return ""; }
}
function resolveMediaUrl(mediaId) { return mediaId ? `${API}/api/media/${mediaId}` : null; }

const onlyDigits = (s='') => String(s).replace(/\D/g,'');
const prettifyPhone = (s='') => {
  const d = onlyDigits(s);
  if (d.length === 10) return `+52 ${d.slice(0,3)} ${d.slice(3,6)} ${d.slice(6)}`;
  if (d.length === 12) return `+${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5,8)} ${d.slice(8)}`;
  if (d.length === 13) return `+${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5,9)} ${d.slice(9)}`;
  return s || "-";
};
function makeComprobanteSelfUrl(token) {
  const origin = window.location.origin;
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  const hashMode = (import.meta.env.VITE_ROUTER_MODE === 'hash') || window.location.hash?.startsWith('#/');
  return token ? (hashMode ? `${origin}${base}/#/comprobante/${token}` : `${origin}${base}/comprobante/${token}`) : '';
}
const isAbs = (u) => /^https?:\/\//i.test(String(u || ''));
const toPublicUrl = (u) => {
  if (!u) return "";
  const s = String(u).replace(/\\/g, "/");
  if (isAbs(s)) return s;
  const p = s.startsWith("/") ? s : `/${s}`;
  return `${API}${encodeURI(p)}`;
};

/* ===================== Util: rangos e instancias ===================== */
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const startOfDay = (d) => new Date(new Date(d).setHours(0,0,0,0));
const endOfDay   = (d) => new Date(new Date(d).setHours(23,59,59,999));

/* ===================================================== */
export default function FinanzasInicio() {
  const [loading, setLoading] = useState(true);
  const [tienda, setTienda]   = useState(null);

  // Bandeja (pendientes)
  const [items, setItems]     = useState([]);
  const [error, setError]     = useState("");
  const [act, setAct]         = useState({});

  // Ingresos (ENTREGADA + PAGADA)
  const [ingresos, setIngresos] = useState([]);
  const [incomePreset, setIncomePreset] = useState("month"); // day|week|month|year
  const [showProof, setShowProof] = useState(false);
  const [proofSrc, setProofSrc]   = useState("");

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      // 1) Mi tienda
      const me = await apiGet("/api/tienda/me");
      const t = me?.tienda || me;
      if (!t?.id) throw new Error("No se pudo cargar la tienda del vendedor");
      setTienda(t);

      // 2) Pendientes (bandeja)
      const qs = new URLSearchParams({ tiendaId: String(t.id), status: "PENDIENTE" });
      const list = await apiGet(`/api/orders/vendor/requests?${qs.toString()}`);
      const arr = Array.isArray(list) ? list : (Array.isArray(list?.items) ? list.items : []);
      setItems(arr);

      // 3) Ingresos entregados últimos 90 días (para series)
      const to = endOfDay(new Date());
      const from = addDays(to, -90);
      const params = new URLSearchParams({
        tiendaId: String(t.id),
        from: from.toISOString(),
        to: to.toISOString(),
        paymentStatus: "PAGADA",
        status: "ENTREGADA"
      });
      const incomeList = await apiGet(`/api/orders/vendor/income?${params.toString()}`);
      setIngresos(Array.isArray(incomeList) ? incomeList : []);
    } catch (e) {
      console.error(e);
      setError("No se pudo cargar la bandeja o ingresos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  /* ===================== Inventario / Acciones ===================== */
  async function getProductoFull(productoId) { return apiGet(`/api/v1/productos/${productoId}`); }
  async function patchProductoInventario(productoId, newStock) { return apiJSON(`/api/v1/productos/${productoId}`, "PATCH", { inventario: { stock: Number(newStock) } }); }
  async function patchVarianteInventario(varianteId, newStock) { return apiJSON(`/api/v1/productos/variantes/${varianteId}`, "PATCH", { inventario: { stock: Number(newStock) } }); }

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

  async function decide(pedido, decision) {
    const id = Number(pedido.id);
    setAct(x => ({ ...x, [id]: true }));
    try {
      if (decision === "ACCEPT" || decision === "ACCEPT_CASH") {
        await decrementInventoryForPedido(pedido);
      }
      await apiJSON(`/api/orders/${id}/decision`, "PATCH", { decision });

      const msg =
        decision === "REJECT" ? "Pedido rechazado"
        : decision === "ACCEPT_CASH" ? "Pedido aceptado (contra entrega)"
        : "Pedido aceptado (comprobante)";
      const sub = decision === "REJECT"
        ? "Se notificará al cliente por WhatsApp si corresponde."
        : "Stock actualizado y pedido marcado como pagada.";

      await Swal.fire({ icon: "success", title: msg, text: sub, timer: 1600, showConfirmButton: false });
      await loadAll();
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: "error", title: "Ups", text: "No se pudo aplicar la acción. Revisa la consola." });
    } finally {
      setAct(x => ({ ...x, [id]: false }));
    }
  }

  function openProof(pedido) {
    if (!pedido?.proofMediaId) {
      Swal.fire({ icon: "info", title: "Sin comprobante", text: "Este pedido no tiene comprobante asociado." });
      return;
    }
    const url = resolveMediaUrl(pedido.proofMediaId);
    setProofSrc(url);
    setShowProof(true);
  }

  /* ======= KPIs pendientes ======= */
  const totalsRaw = useMemo(() => items.map(p => Number(p?.totals?.total ?? p.total ?? 0)), [items]);
  const totalPendienteNum = useMemo(() => totalsRaw.reduce((a,b)=>a+b,0), [totalsRaw]);
  const totalPendiente = useMemo(() => formatMoneyMXN(totalPendienteNum), [totalPendienteNum]);
  const pedidosCount = items.length;
  const avgTicket = pedidosCount ? formatMoneyMXN(Math.round(totalPendienteNum / pedidosCount)) : formatMoneyMXN(0);

  // Serie por día (pendientes)
  const byDayPending = useMemo(() => {
    const m = new Map();
    items.forEach(p => {
      const d = new Date(p.createdAt);
      const k = d.toLocaleDateString("es-MX", { day:"2-digit", month:"2-digit" });
      const v = Number(p?.totals?.total ?? p.total ?? 0);
      m.set(k, (m.get(k) || 0) + v);
    });
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value: value/100 }))
      .sort((a,b) => {
        const [da,ma] = a.name.split("/").map(Number);
        const [db,mb] = b.name.split("/").map(Number);
        return ma===mb ? da-db : ma-mb;
      });
  }, [items]);

  // Top productos (pendientes)
  const topProductsPending = useMemo(() => {
    const m = new Map();
    items.forEach(p => {
      (p.items || []).forEach(it => {
        const key = it.nombre || `#${it.productoId}`;
        m.set(key, (m.get(key) || 0) + Number(it.total || 0));
      });
    });
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value: value/100 }))
      .sort((a,b)=>b.value-a.value)
      .slice(0,5);
  }, [items]);

  /* ======= KPIs ingresos (ENTREGADA + PAGADA) ======= */
  const ingresosTotalNum = useMemo(
    () => ingresos.reduce((acc, r) => acc + Number(r?.totals?.total ?? r.total ?? 0), 0),
    [ingresos]
  );
  const ingresosTotalFmt = useMemo(() => formatMoneyMXN(ingresosTotalNum), [ingresosTotalNum]);
  const ingresosPedidos = ingresos.length;
  const ingresosAvg = ingresosPedidos ? formatMoneyMXN(Math.round(ingresosTotalNum / ingresosPedidos)) : formatMoneyMXN(0);

  // Agrupadores
  const fmtDayKey = (d) => d.toLocaleDateString("es-MX", { day:"2-digit", month:"2-digit" });
  const fmtWeekKey = (d) => {
    const x = startOfDay(d);
    const day = x.getDay() || 7;
    const monday = addDays(x, -(day-1));
    const sunday = addDays(monday, 6);
    return `${monday.toLocaleDateString("es-MX",{day:"2-digit",month:"2-digit"})} - ${sunday.toLocaleDateString("es-MX",{day:"2-digit",month:"2-digit"})}`;
  };
  const fmtMonthKey = (d) => d.toLocaleDateString("es-MX", { month:"short", year:"numeric" });
  const fmtYearKey  = (d) => String(d.getFullYear());

  const seriesIngresos = useMemo(() => {
    const map = new Map();
    const picker = incomePreset === "day" ? fmtDayKey
                 : incomePreset === "week" ? fmtWeekKey
                 : incomePreset === "month" ? fmtMonthKey
                 : fmtYearKey;
    ingresos.forEach(r => {
      const base = new Date(r.decidedAt || r.createdAt || r.updatedAt || Date.now());
      const key = picker(base);
      const v = Number(r?.totals?.total ?? r.total ?? 0);
      map.set(key, (map.get(key) || 0) + v);
    });
    const toOrderDate = (k) => {
      if (incomePreset === "week") {
        const [a] = k.split(" ");
        const [d,m] = a.split("/").map(s=>parseInt(s,10));
        const year = new Date().getFullYear();
        return new Date(year, (m||1)-1, d||1);
      }
      if (incomePreset === "month") {
        const [mon, year] = k.replace(".", "").split(" ");
        const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
        const idx = months.indexOf(mon?.toLowerCase()?.slice(0,3));
        return new Date(parseInt(year||`${new Date().getFullYear()}`,10), Math.max(0, idx), 1);
      }
      if (incomePreset === "year") return new Date(parseInt(k,10), 0, 1);
      const [d,m] = k.split("/").map(Number);
      const y = new Date().getFullYear();
      return new Date(y,(m||1)-1,d||1);
    };

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: value/100, _od: toOrderDate(name).getTime() }))
      .sort((a,b)=>a._od-b._od)
      .map(({_od, ...rest})=>rest);
  }, [ingresos, incomePreset]);

  const topProductsIngresos = useMemo(() => {
    const m = new Map();
    ingresos.forEach(p => {
      (p.items || []).forEach(it => {
        const key = it.nombre || `#${it.productoId}`;
        m.set(key, (m.get(key) || 0) + Number(it.total || 0));
      });
    });
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value: value/100 }))
      .sort((a,b)=>b.value-a.value)
      .slice(0,5);
  }, [ingresos]);

  // Header visual (portada + logo)
  const portadaUrl = useMemo(() => toPublicUrl(tienda?.portadaUrl || tienda?.portada || ""), [tienda]);
  const logoUrl = useMemo(() => {
    const direct = tienda?.logoUrl || tienda?.logo?.url || "";
    return toPublicUrl(direct);
  }, [tienda]);

  /* ===================== UI ===================== */
  if (loading) {
    return (
      <>
        <FinanzasNabvar />
       {/* Loader con mascota (usa Portal y cubre la pantalla completa) */}
       <MascotWarmupLoader
         brand="SystemVkode"
         logoSrc="/SVKP.png"
         mascotSrc="/mascota-svk-transparente.png"   // tu PNG con fondo transparente
         healthcheckUrl={`${API}/health`}            // opcional; si no existe, puedes quitar esta prop
         compactAt={600}                              // breakpoint móvil
       />
      </>
    );
  }

  if (error) {
    return (
      <>
        <FinanzasNabvar />
        <div className="finanzas-wrap">
          <div className="state-error">
            {error}
            <button className="btn btn-ghost" style={{marginLeft:12}} onClick={loadAll}>
              <FiRefreshCw /> Reintentar
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <FinanzasNabvar />

      {/* ===== HERO / PORTADA (dentro del contenedor para evitar overflow) ===== */}
      <div className="finanzas-wrap">
        <div
          className="finz-hero"
          style={{
            position: "relative",
            borderRadius: 16,
            overflow: "hidden",
            background: portadaUrl
              ? `linear-gradient(180deg, rgba(0,0,0,.45), rgba(0,0,0,.35)), url("${portadaUrl}") center/cover no-repeat`
              : "linear-gradient(135deg, var(--primary), var(--secondary))",
            minHeight: 120,
            display: "flex",
            alignItems: "center",
            padding: "16px 20px"
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              style={{
                width: 64, height: 64, objectFit: "contain",
                background: "rgba(255,255,255,.85)", borderRadius: 12, padding: 8, marginRight: 12
              }}
              onError={(e)=>{ e.currentTarget.style.display="none"; }}
            />
          ) : null}
          <div style={{ color: "#fff" }}>
            <div style={{ opacity:.9, fontSize:12, letterSpacing:.5 }}>Panel de Finanzas</div>
            <h1 style={{ margin: "2px 0 2px", fontSize: 22, fontWeight: 700 }}>
              {tienda?.nombre || "Mi Tienda"}
            </h1>
            <div style={{ opacity:.9, fontSize:13 }}>
              Pedidos pendientes por confirmar · <b>{totalPendiente}</b>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={loadAll} className="btn btn-ghost" style={{ color:"#fff", borderColor:"rgba(255,255,255,.4)" }}>
            <FiRefreshCw /> Actualizar
          </button>
        </div>

        {/* ===== KPIs PENDIENTES + GRÁFICAS ===== */}
        <div className="kpi-grid">
          {/* KPIs pendientes */}
          <div className="card span-3">
            <div className="card-header"><h3 className="card-title">Monto pendiente</h3></div>
            <div className="card-body">
              <div className="big-number">{totalPendiente}</div>
              <div className="muted">Suma de pedidos en revisión</div>
            </div>
          </div>
          <div className="card span-3">
            <div className="card-header"><h3 className="card-title">Pedidos</h3></div>
            <div className="card-body">
              <div className="big-number">{pedidosCount}</div>
              <div className="muted">En la bandeja</div>
            </div>
          </div>
          <div className="card span-3">
            <div className="card-header"><h3 className="card-title">Ticket promedio</h3></div>
            <div className="card-body">
              <div className="big-number">{avgTicket}</div>
              <div className="muted">Con base en pendientes</div>
            </div>
          </div>

          {/* Tendencia por día (pendientes) */}
          <div className="card span-6">
            <div className="card-header">
              <h3 className="card-title">Tendencia por día (pendientes)</h3>
              <p className="card-subtitle">Monto de pedidos aún no confirmados</p>
            </div>
            <div className="card-body chart">
              {byDayPending.length === 0 ? (
                <div className="muted">Sin datos suficientes</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={byDayPending} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15}/>
                    <XAxis dataKey="name" fontSize={12}/>
                    <YAxis width={52} fontSize={12}/>
                    <Tooltip formatter={(v)=>`$${Number(v).toLocaleString("es-MX",{minimumFractionDigits:2})}`} />
                    <Area type="monotone" dataKey="value" stroke="var(--primary)" fill="url(#g1)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top productos (pendientes) */}
          <div className="card span-6">
            <div className="card-header">
              <h3 className="card-title">Top productos (pendientes)</h3>
              <p className="card-subtitle">Por monto</p>
            </div>
            <div className="card-body chart">
              {topProductsPending.length === 0 ? (
                <div className="muted">Sin datos suficientes</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProductsPending} margin={{ top: 4, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15}/>
                    <XAxis dataKey="name" fontSize={11} interval={0} angle={-10} height={48}/>
                    <YAxis width={52} fontSize={12}/>
                    <Tooltip formatter={(v)=>`$${Number(v).toLocaleString("es-MX",{minimumFractionDigits:2})}`} />
                    <Bar dataKey="value" stroke="var(--primary)" fill="var(--primary)" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* ===== KPIs INGRESOS ENTREGADOS + GRÁFICAS ===== */}
        <div className="kpi-grid kpi-grid--spaced">
          <div className="card span-3">
            <div className="card-header"><h3 className="card-title">Ingresos (90 días)</h3></div>
            <div className="card-body">
              <div className="big-number">{ingresosTotalFmt}</div>
              <div className="muted">Acumulado ENTREGADA + PAGADA</div>
            </div>
          </div>
          <div className="card span-3">
            <div className="card-header"><h3 className="card-title">Ventas entregadas</h3></div>
            <div className="card-body">
              <div className="big-number">{ingresosPedidos}</div>
              <div className="muted">En el periodo mostrado</div>
            </div>
          </div>
          <div className="card span-3">
            <div className="card-header"><h3 className="card-title">Ticket promedio</h3></div>
            <div className="card-body">
              <div className="big-number">{ingresosAvg}</div>
              <div className="muted">Pedidos entregados</div>
            </div>
          </div>

          <div className="card span-3">
            <div className="card-header"><h3 className="card-title">Agrupar por</h3></div>
            <div className="card-body">
              <select value={incomePreset} onChange={(e)=>setIncomePreset(e.target.value)} className="form-select">
                <option value="day">Día</option>
                <option value="week">Semana</option>
                <option value="month">Mes</option>
                <option value="year">Año</option>
              </select>
              <div className="muted" style={{ marginTop:6 }}>Últimos 90 días (o año para “Año”)</div>
            </div>
          </div>

          <div className="card span-8">
            <div className="card-header">
              <h3 className="card-title">Ingresos por {incomePreset === "day" ? "día" : incomePreset === "week" ? "semana" : incomePreset === "month" ? "mes" : "año"}</h3>
              <p className="card-subtitle">Incluye solo pedidos ENTREGADA con pago PAGADA</p>
            </div>
            <div className="card-body chart tall">
              {seriesIngresos.length === 0 ? (
                <div className="muted">Sin datos aún. Marca pedidos como ENTREGADA en la sección Ingresos.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={seriesIngresos} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15}/>
                    <XAxis dataKey="name" fontSize={12}/>
                    <YAxis width={62} fontSize={12}/>
                    <Tooltip formatter={(v)=>`$${Number(v).toLocaleString("es-MX",{minimumFractionDigits:2})}`} />
                    <Area type="monotone" dataKey="value" stroke="var(--primary)" fill="url(#g2)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="card span-4">
            <div className="card-header">
              <h3 className="card-title">Top productos (ingresos)</h3>
              <p className="card-subtitle">Basado en pedidos ENTREGADA</p>
            </div>
            <div className="card-body chart tall">
              {topProductsIngresos.length === 0 ? (
                <div className="muted">Sin datos suficientes</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProductsIngresos} margin={{ top: 4, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15}/>
                    <XAxis dataKey="name" fontSize={11} interval={0} angle={-10} height={56}/>
                    <YAxis width={62} fontSize={12}/>
                    <Tooltip formatter={(v)=>`$${Number(v).toLocaleString("es-MX",{minimumFractionDigits:2})}`} />
                    <Bar dataKey="value" stroke="var(--primary)" fill="var(--primary)" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* ===== LISTA DE PEDIDOS (PENDIENTES) ===== */}
        <div className="orders-grid">
          {items.length === 0 && (<div className="empty">No hay solicitudes en revisión.</div>)}

          {items.map((p) => {
            const phoneRaw = onlyDigits(p?.buyerPhone || "");
            const phonePretty = prettifyPhone(p?.buyerPhone || "");
            const canWhatsApp = phoneRaw.length >= 8;
            const waUrl = canWhatsApp
              ? `https://wa.me/${phoneRaw}?text=${encodeURIComponent(
                  [
                    `Hola ${p?.buyerName || ''}`.trim(),
                    `Soy ${tienda?.nombre || 'la tienda'}.`,
                    `Sobre tu pedido #${p.id}: ${formatMoneyMXN(p?.totals?.total ?? p.total)}`,
                    p?.token ? `Comprobante: ${makeComprobanteSelfUrl(p.token)}` : ''
                  ].filter(Boolean).join('\n')
                )}`
              : '';

            const isRegistered = !!p?.buyerUserId;

            return (
              <article key={p.id} className="order-card">
                <header className="order-card__head">
                  <div className="badges">
                    <span className="badge badge--status">{p.status}</span>
                    <span className="badge badge--payment">{p.paymentStatus}</span>
                  </div>
                  <div className="order-meta">
                    <FiClock />
                    <span>Creado: {ts(p.createdAt)}</span>
                    {p.requestedAt && <span>· Solicitado: {ts(p.requestedAt)}</span>}
                  </div>
                </header>

                <section className="order-card__buyer">
                  <div title={isRegistered ? `Usuario #${p.buyerUserId}` : 'No registrado'}>
                    <FiUser />
                    {isRegistered ? (<>Usuario #{p.buyerUserId}{p.buyerName ? ` · ${p.buyerName}` : ''}</>) : (<>No registrado</>)}
                  </div>
                  <div><FiPhone />{phonePretty}</div>
                  <div><FiMail />{p.buyerEmail || "-"}</div>
                </section>

                <section className="order-items">
                  {(p.items || []).map(it => (
                    <div key={it.id ?? `${it.productoId}-${it.varianteId ?? "base"}`} className="order-item">
                      <div>
                        <div className="order-item__name">{it.nombre || `Producto ${it.productoId}`}</div>
                        {!!it.opciones && (<div className="order-item__opt">{opcionesToStr(it.opciones)}</div>)}
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

                <footer className="order-actions">
                  <button disabled={!!act[p.id]} onClick={() => openProof(p)} className="btn btn-ghost">
                    <FiEye /> Ver comprobante
                  </button>
                  <button disabled={!!act[p.id]} onClick={() => decide(p, "ACCEPT")} className="btn btn-success">
                    <FiCheckCircle /> Aceptar (con comprobante)
                  </button>
                  <button disabled={!!act[p.id]} onClick={() => decide(p, "ACCEPT_CASH")} className="btn btn-primary">
                    <FiCheckCircle /> Aceptar en efectivo
                  </button>
                  <button disabled={!!act[p.id]} onClick={() => decide(p, "REJECT")} className="btn btn-danger">
                    <FiXCircle /> Rechazar
                  </button>

                  <div style={{ flex: 1 }} />

                  <button
                    className="btn"
                    disabled={!canWhatsApp}
                    onClick={() => window.open(waUrl, "_blank", "noopener,noreferrer")}
                    title={canWhatsApp ? "Contactar por WhatsApp" : "Sin teléfono del comprador"}
                  >
                    <FiMessageCircle /> WhatsApp comprador
                  </button>
                </footer>
              </article>
            );
          })}
        </div>

        {/* Modal de comprobante */}
        {showProof && proofSrc && (
          <div
            onClick={() => setShowProof(false)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', display:'grid', placeItems:'center', zIndex:1000, padding:'2rem' }}
          >
            <div onClick={(e)=>e.stopPropagation()} style={{ position:'relative', maxWidth:'min(95vw, 1000px)', maxHeight:'85vh' }}>
              <button className="btn btn-ghost" style={{ position:'absolute', top:8, right:8 }} onClick={() => setShowProof(false)} aria-label="Cerrar">
                <FiX />
              </button>
              <img src={proofSrc} alt="Comprobante" style={{ width:'100%', height:'100%', objectFit:'contain', borderRadius:8 }} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

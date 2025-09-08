import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

/* --- tips --- */
const TIPS = [
  "💡 Sube imágenes < 500 KB para cargar más rápido.",
  "📦 Gestiona productos y variantes desde tu panel.",
  "📊 Revisa Finanzas para ver tus ingresos.",
  "💬 Comparte tu link público y cobra por WhatsApp.",
  "⚡ Usa títulos cortos y claros en tus productos.",
];

/* --- hook: media query --- */
function useMQ(q) {
  const [match, setMatch] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(q).matches : false
  );
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setMatch(m.matches);
    on(); m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, [q]);
  return match;
}

export default function MascotWarmupLoader({
  brand = "SystemVkode",
  logoSrc = "/SVKP.png",
  mascotSrc = "/mascota-svk-transparente.png",
  healthcheckUrl,
  pollMs = 2500,
  softMsgMs = 10000,
  showRetryAtMs = 30000,
  compactAt = 600,                // ← breakpoint móvil
}) {
  const isNarrow = useMQ(`(max-width:${compactAt}px)`);

  const [elapsed, setElapsed] = useState(0);
  const [tip, setTip] = useState(0);
  const [alive, setAlive] = useState(false);

  const progress = useMemo(() => Math.min(0.85, elapsed / (softMsgMs * 1.15)), [elapsed, softMsgMs]);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 500), 500);
    const r = setInterval(() => setTip((i) => (i + 1) % TIPS.length), 3000);
    return () => { clearInterval(t); clearInterval(r); };
  }, []);

  useEffect(() => {
    if (!healthcheckUrl) return;
    let cancel = false;
    const ping = async () => {
      try { const res = await fetch(healthcheckUrl, { cache: "no-store" }); if (!cancel && res.ok) setAlive(true); } catch {}
    };
    ping(); const id = setInterval(ping, pollMs);
    return () => { cancel = true; clearInterval(id); };
  }, [healthcheckUrl, pollMs]);

  /* --- estilos dependientes de tamaño --- */
  const S = styles(isNarrow);

  const overlay = (
    <div style={S.backdrop}>
      <div style={S.bgA} /><div style={S.bgB} />
      <div style={S.container}>
        {/* bloque mascota */}
        <div style={S.left}>
          {mascotSrc && <img src={mascotSrc} alt="SVK Mascota" style={S.mascot} draggable={false} />}
          <div style={S.bubble}>
            <div style={S.bubbleTail} />
            <strong>SVK te ayuda:</strong>
            <div style={{ marginTop: 6 }}>{TIPS[tip]}</div>
          </div>
        </div>

        {/* bloque texto/progreso */}
        <div style={S.right}>
          {logoSrc && <img src={logoSrc} alt={brand} style={S.logo} />}
          <h1 style={S.title}>{brand}</h1>
          <p style={S.subtitle}>
            {elapsed >= softMsgMs && !alive
              ? "Encendiendo servidor… esto puede tardar unos segundos ⏳"
              : "Preparando tu experiencia de comercio inteligente"}
          </p>

          <div style={S.progressOuter}>
            <div style={{ ...S.progressInner, width: `${alive ? 100 : progress * 100}%` }} />
          </div>

          <div style={S.dots}>
            <span style={{ ...S.dot, animationDelay: "0s" }} />
            <span style={{ ...S.dot, animationDelay: ".2s" }} />
            <span style={{ ...S.dot, animationDelay: ".4s" }} />
          </div>

          {elapsed >= showRetryAtMs && !alive && (
            <button onClick={() => window.location.reload()} style={S.retryBtn}>Reintentar</button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes floaty { 0%,100%{ transform: translateY(0)} 50%{ transform: translateY(-8px)} }
        @keyframes dotBounce { 0%,100%{ transform: translateY(0); opacity:.6 } 50%{ transform: translateY(-6px); opacity:1 } }
      `}</style>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(overlay, document.body) : null;
}

/* -------- estilos responsivos -------- */
function styles(isNarrow) {
  return {
    backdrop: {
      position: "fixed", inset: 0, zIndex: 2147483647,
      background: "linear-gradient(135deg,#0A0A0F 0%,#1A1A2E 50%,#0F0F13 100%)",
      color: "#fff", overflow: "hidden",
      padding: isNarrow ? "max(12px, env(safe-area-inset-top)) 12px 16px" : "0",
    },
    bgA: { position: "absolute", width: 900, height: 900, borderRadius: "50%",
      background: "radial-gradient(closest-side, rgba(139,92,246,.16), transparent)",
      top: -280, left: -200, filter: "blur(4px)", animation: "floaty 6s ease-in-out infinite" },
    bgB: { position: "absolute", width: 900, height: 900, borderRadius: "50%",
      background: "radial-gradient(closest-side, rgba(6,182,212,.16), transparent)",
      bottom: -300, right: -200, filter: "blur(4px)", animation: "floaty 7s ease-in-out infinite" },

    /* layout: grid en desktop, columna en móvil */
    container: isNarrow
      ? { position: "relative", zIndex: 2, display: "flex", flexDirection: "column",
          alignItems: "center", gap: 16, width: "100%", margin: "10vh auto 0" }
      : { position: "relative", zIndex: 2, display: "grid",
          gridTemplateColumns: "minmax(260px, 420px) minmax(280px, 520px)",
          gap: 32, width: "min(980px, 92%)", margin: "8vh auto 0", alignItems: "center" },

    left: { position: "relative", display: "grid", placeItems: "center" },

    mascot: {
      width: isNarrow ? "min(240px, 65vw)" : "min(320px, 80%)",
      height: "auto",
      filter: "drop-shadow(0 12px 28px rgba(0,0,0,.5))",
      animation: "floaty 3.6s ease-in-out infinite",
      userSelect: "none",
    },

    /* burbuja centrada bajo la mascota en móvil; al costado en desktop */
    bubble: isNarrow
      ? { position: "relative", marginTop: 8, background: "rgba(255,255,255,.06)", padding: "10px 14px",
          borderRadius: 14, border: "1px solid rgba(255,255,255,.18)", backdropFilter: "blur(8px)",
          fontSize: 14, lineHeight: 1.35, maxWidth: "92%", textAlign: "left" }
      : { position: "absolute", bottom: -14, left: "50%", transform: "translateX(-40%)",
          background: "rgba(255,255,255,.06)", padding: "10px 14px",
          borderRadius: 14, border: "1px solid rgba(255,255,255,.18)", backdropFilter: "blur(8px)",
          fontSize: 14, lineHeight: 1.35, maxWidth: 320 },

    bubbleTail: isNarrow
      ? { display: "none" }
      : { position: "absolute", left: 24, bottom: "-10px", width: 14, height: 14, transform: "rotate(45deg)",
          background: "rgba(255,255,255,.06)", borderLeft: "1px solid rgba(255,255,255,.18)",
          borderBottom: "1px solid rgba(255,255,255,.18)" },

    right: { textAlign: isNarrow ? "center" : "center", width: isNarrow ? "100%" : "auto" },

    logo: { height: isNarrow ? 44 : 56, margin: "0 auto 8px", display: "block" },
    title: {
      margin: 0, fontWeight: 900, letterSpacing: "-.02em",
      background: "linear-gradient(135deg,#fff,#93C5FD)", WebkitBackgroundClip: "text", color: "transparent",
      fontSize: isNarrow ? "clamp(20px,6vw,28px)" : "clamp(24px,3.2vw,36px)"
    },
    subtitle: { marginTop: 6, opacity: .9, padding: isNarrow ? "0 8px" : 0 },

    progressOuter: {
      margin: isNarrow ? "12px auto 0" : "14px auto 0",
      width: isNarrow ? "92%" : "min(460px, 90%)",
      height: 8,
      background: "rgba(255,255,255,.12)", borderRadius: 999,
      border: "1px solid rgba(255,255,255,.12)", overflow: "hidden"
    },
    progressInner: {
      height: "100%", borderRadius: 999,
      background: "linear-gradient(90deg,#3B82F6,#10B981)"
    },

    dots: { display: "flex", justifyContent: "center", gap: 8, marginTop: 10 },
    dot: { width: 10, height: 10, borderRadius: "50%", background: "linear-gradient(135deg,#3B82F6,#10B981)", animation: "dotBounce 1.6s infinite ease-in-out" },

    retryBtn: {
      marginTop: 12, padding: "8px 14px", borderRadius: 12,
      border: "1px solid rgba(255,255,255,.25)", background: "transparent",
      color: "#fff", cursor: "pointer"
    },
  };
}

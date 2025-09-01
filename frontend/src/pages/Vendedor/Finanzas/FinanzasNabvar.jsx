// frontend/src/pages/Vendedor/Finanzas/FinanzasNabvar.jsx
import React, { useEffect, useState } from "react";
import {
  FiInbox,
  FiTrendingUp,
  FiUser,
  FiChevronLeft,
  FiExternalLink
} from "react-icons/fi";
import "./Finanzaz.css";

/**
 * Navbar de Finanzas
 * - Sticky, con sombra suave.
 * - Botón para volver a Perfil del vendedor.
 * - Pestañas: Entrada e Ingresos.
 * - Mantiene “look de desktop” en móviles gracias a overflow-x.
 */
export default function FinanzasNabvar() {
  const [active, setActive] = useState("inicio");

  useEffect(() => {
    const setFromHash = () => {
      const h = window.location.hash || "";
      if (/#\/vendedor\/finanzas(\/)?$/.test(h)) return setActive("inicio");
      if (/#\/vendedor\/finanzas\/ingresos(\/)?$/.test(h))
        return setActive("ingresos");
      setActive("inicio");
    };
    setFromHash();
    window.addEventListener("hashchange", setFromHash);
    return () => window.removeEventListener("hashchange", setFromHash);
  }, []);

  // Puedes ajustar aquí la ruta del perfil si tu router usa otra:
  const perfilHref = "#/vendedor/perfil";

  return (
    <nav
      className="finz-navbar"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        backdropFilter: "saturate(120%) blur(6px)",
        background: "var(--panel, rgba(16,16,20,.75))",
        borderBottom: "1px solid var(--line, rgba(255,255,255,.06))",
        boxShadow: "0 6px 20px rgba(0,0,0,.14)",
        padding: "8px 12px"
      }}
      aria-label="Navegación de finanzas"
    >
      {/* Barra superior */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          gap: 10
        }}
      >
        {/* Botón volver a Perfil */}
        <a
          href={perfilHref}
          className="finz-tab"
          title="Volver al perfil del vendedor"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid var(--line, rgba(255,255,255,.08))",
            background: "var(--card, rgba(255,255,255,.02))",
            whiteSpace: "nowrap"
          }}
        >
          <FiChevronLeft />
          <FiUser />
          <span style={{ fontWeight: 600 }}>Perfil</span>
        </a>

        {/* Título / “brand” del módulo */}
        <div
          style={{
            textAlign: "center",
            fontWeight: 700,
            letterSpacing: 0.2,
            userSelect: "none",
            pointerEvents: "none",
            opacity: 0.9
          }}
        >
          Panel de Finanzas
        </div>

        {/* Enlace para abrir en nueva pestaña (opcional) */}
        <a
          href="#/vendedor/finanzas"
          target="_blank"
          rel="noreferrer"
          title="Abrir Finanzas en una nueva pestaña"
          className="finz-tab"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid var(--line, rgba(255,255,255,.08))",
            background: "var(--card, rgba(255,255,255,.02))",
            whiteSpace: "nowrap"
          }}
        >
        
        </a>
      </div>

      {/* Tabs */}
      <div
        style={{
          marginTop: 10,
          display: "flex",
          gap: 8,
          alignItems: "center",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          paddingBottom: 2
        }}
        role="tablist"
      >
        <a
          href="#/vendedor/finanzas"
          role="tab"
          aria-selected={active === "inicio" ? "true" : "false"}
          className={`finz-tab ${active === "inicio" ? "is-active" : ""}`}
          style={tabStyle(active === "inicio")}
        >
          <FiInbox />
          <span>Entrada</span>
        </a>

        <a
          href="#/vendedor/finanzas/ingresos"
          role="tab"
          aria-selected={active === "ingresos" ? "true" : "false"}
          className={`finz-tab ${active === "ingresos" ? "is-active" : ""}`}
          style={tabStyle(active === "ingresos")}
        >
          <FiTrendingUp />
          <span>Ingresos</span>
        </a>
      </div>
    </nav>
  );
}

/** Estilo de pestañas (activo/inactivo) */
function tabStyle(active) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 12,
    border: active
      ? "1px solid var(--primary, #6d28d9)"
      : "1px solid var(--line, rgba(255,255,255,.08))",
    background: active
      ? "linear-gradient(135deg, var(--primary,#6d28d9), var(--secondary,#c026d3))"
      : "var(--card, rgba(255,255,255,.02))",
    color: active ? "#fff" : "inherit",
    fontWeight: 600,
    whiteSpace: "nowrap",
    transition: "all .2s ease"
  };
}

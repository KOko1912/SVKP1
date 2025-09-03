// frontend/src/pages/Vendedor/Finanzas/FinanzasNabvar.jsx
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FiInbox, FiTrendingUp, FiUser, FiChevronLeft } from "react-icons/fi";
import "./Finanzaz.css";

/**
 * Navbar fijo con medición exacta y spacer dinámico.
 * - Compacto y con tabs "pill" scrollables en móvil.
 * - No tapa el contenido de Inicio ni Ingresos.
 */
export default function FinanzasNabvar() {
  const [active, setActive] = useState("inicio");
  const [navH, setNavH] = useState(64); // fallback seguro
  const navRef = useRef(null);

  // Determina la pestaña activa desde el hash
  useEffect(() => {
    const setFromHash = () => {
      const h = window.location.hash || "";
      if (/#\/vendedor\/finanzas(\/)?$/.test(h)) return setActive("inicio");
      if (/#\/vendedor\/finanzas\/ingresos(\/)?$/.test(h)) return setActive("ingresos");
      setActive("inicio");
    };
    setFromHash();
    window.addEventListener("hashchange", setFromHash);
    return () => window.removeEventListener("hashchange", setFromHash);
  }, []);

  // Mide altura real del nav (incluye safe-area) y actualiza spacer + CSS var
  useLayoutEffect(() => {
    const measure = () => {
      if (!navRef.current) return;
      const h = Math.ceil(navRef.current.getBoundingClientRect().height || 64);
      setNavH(h);
      document.documentElement.style.setProperty("--finz-nav-h", `${h}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (navRef.current) ro.observe(navRef.current);
    window.addEventListener("resize", measure);
    const t = setTimeout(measure, 200); // por si cargan fuentes
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); clearTimeout(t); };
  }, []);

  return (
    <>
      <nav ref={navRef} className="finz-navbar" aria-label="Navegación de finanzas">
        <div className="finz-navbar-inner">
          {/* Fila compacta: volver + título */}
          <div className="finz-row">
            <a
              href="#/vendedor/perfil"
              className="finz-tab"
              title="Volver al perfil del vendedor"
              aria-label="Volver al perfil"
            >
              <FiChevronLeft />
              <FiUser />
              <span className="finz-text-strong">Perfil</span>
            </a>

            <div className="finz-title">Panel de Finanzas</div>
            <div /> {/* placeholder para balancear grid */}
          </div>

          {/* Tabs (pill) — centradas y con scroll horizontal en móvil */}
          <div className="finz-tabs" role="tablist">
            <a
              href="#/vendedor/finanzas"
              role="tab"
              aria-selected={active === "inicio" ? "true" : "false"}
              className={`finz-tab ${active === "inicio" ? "is-active" : ""}`}
            >
              <FiInbox />
              <span>Entrada</span>
            </a>

            <a
              href="#/vendedor/finanzas/ingresos"
              role="tab"
              aria-selected={active === "ingresos" ? "true" : "false"}
              className={`finz-tab ${active === "ingresos" ? "is-active" : ""}`}
            >
              <FiTrendingUp />
              <span>Ingresos</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Spacer: garantiza que nada quede oculto por el nav fijo */}
      <div className="finz-spacer" style={{ height: navH }} />
    </>
  );
}

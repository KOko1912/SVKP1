// E:\SVKP1\frontend\src\pages\Vendedor\Disenos\DisenoEstiloJaponesa.jsx
import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { buildProductoHref } from "../../../lib/productHref";
import {
  FiSearch,
  FiStar,
  FiShoppingBag,
  FiPhone,
  FiMail,
  FiMapPin,
  FiExternalLink,
  FiClock,
  FiHeart,
  FiLayers,
  FiGrid,
} from "react-icons/fi";
import "./japonesa.css";

/* ===== Props por defecto (alineado al editor) ===== */
const DEFAULT_BLOCK_PROPS = {
  hero:     { showLogo: true, showDescripcion: true, align: "center" },
  featured: { title: "Destacados", limit: 8 },
  grid:     { title: "Todos los productos", limit: 12, showFilter: true },
  category: { title: "", categoriaId: null, limit: 12, showFilter: true },
  product:  { productoId: null },
  banner:   { title: "Colección Especial", ctaText: "Descubrir", ctaUrl: "" },
  logo:     { shape: "rounded", frame: "thin" },
};

/**
 * Diseño Estilo Japonesa — limpio, tipografía Noto Serif JP, acentos vermellón y dorado.
 */
export default function DisenoEstiloJaponesa({
  tienda,
  productos = [],
  categorias = [],
  orderedBlocks = [],
  toPublicSrc,
}) {
  const [q, setQ] = useState("");
  const [catId, setCatId] = useState("all");
  const [scrollProgress, setScrollProgress] = useState(0);
  const heroRef = useRef(null);

  /* Portada / Logo y props del hero */
  const portada = toPublicSrc?.(tienda?.portada?.url || tienda?.portadaUrl) || "";
  const logo    = toPublicSrc?.(tienda?.logo?.url || tienda?.logoUrl) || "";
  const heroProps = {
    ...DEFAULT_BLOCK_PROPS.hero,
    ...(orderedBlocks.find((b) => b?.type === "hero")?.props || {}),
  };

  /* Categorías y búsqueda global */
  const catTabs = useMemo(
    () => [{ id: "all", nombre: "Todo" }, ...categorias],
    [categorias]
  );

  const filtered = useMemo(() => {
    let list = productos || [];
    if (catId !== "all") {
      const idNum = Number(catId);
      list = list.filter(
        (p) =>
          Array.isArray(p.categorias) &&
          p.categorias.some((pc) => Number(pc.categoriaId) === idNum)
      );
    }
    if (q.trim()) {
      const needle = q.toLowerCase().trim();
      list = list.filter((p) =>
        `${p?.nombre || ""} ${p?.descripcion || ""} ${p?.detalle || ""}`
          .toLowerCase()
          .includes(needle)
      );
    }
    return list;
  }, [productos, catId, q]);

  /* Scroll progress */
  useEffect(() => {
    const onScroll = () => {
      const top = window.scrollY;
      const doc = document.body.offsetHeight - window.innerHeight;
      setScrollProgress(doc > 0 ? top / doc : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const alignToFlex = (align) =>
    align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

  return (
    <div className="nippon-root">
      {/* Barra de progreso de scroll */}
      <div className="nippon-progress">
        <div
          className="nippon-progress-bar"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>

      {/* HERO */}
      <header
        ref={heroRef}
        className="nippon-hero"
        style={{
          backgroundImage: portada
            ? `linear-gradient(rgba(250,245,239,.86), rgba(250,245,239,.86)), url(${portada})`
            : "none",
        }}
      >
        <div className="nippon-hero-kumo" />
        <div
          className="nippon-hero-content"
          style={{ alignItems: alignToFlex(heroProps.align), textAlign: heroProps.align }}
        >
          {heroProps.showLogo && (
            logo ? (
              <div className="nippon-mon-frame">
                <img src={logo} alt="logo" className="nippon-mon" />
              </div>
            ) : (
              <div className="nippon-mon placeholder">
                <FiGrid size={28} />
              </div>
            )
          )}

          <h1 className="nippon-title">
            {tienda?.nombre || "Tienda Nippona"}
          </h1>

          {heroProps.showDescripcion && tienda?.descripcion ? (
            <p className="nippon-subtitle">{tienda.descripcion}</p>
          ) : null}

          <div className="nippon-ornament">
            <span className="nippon-line" />
            <span className="nippon-seal" />
            <span className="nippon-line" />
          </div>
        </div>

        <div className="nippon-wave" aria-hidden />
      </header>

      {/* NAV: búsqueda + categorías */}
      <nav className="nippon-nav">
        <div className="nippon-container nippon-nav-inner">
          <div className="nippon-search">
            <FiSearch className="nippon-search-icon" />
            <input
              className="nippon-search-input"
              type="search"
              placeholder="Buscar…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="nippon-underline" />
          </div>

          <div className="nippon-tabs">
            {catTabs.map((c) => {
              const active = String(catId) === String(c.id);
              return (
                <button
                  key={String(c.id)}
                  className={`nippon-chip ${active ? "active" : ""}`}
                  onClick={() => setCatId(String(c.id))}
                  title={c.nombre}
                >
                  {c.nombre}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <main className="nippon-main nippon-container">
        {Array.isArray(orderedBlocks) && orderedBlocks.length > 0 ? (
          <RenderBlocksNippon
            layout={orderedBlocks}
            productos={productos}
            categorias={categorias}
            tienda={tienda}
            toPublicSrc={toPublicSrc}
          />
        ) : (
          <>
            {productos.some((p) => p.destacado) && (
              <NipponSection title="Destacados" icon={<FiStar />}>
                <div className="nippon-grid">
                  {productos
                    .filter((p) => p.destacado)
                    .slice(0, 8)
                    .map((p) => (
                      <NipponProductCard key={p.id || p.uuid} p={p} toPublicSrc={toPublicSrc} />
                    ))}
                </div>
              </NipponSection>
            )}

            <NipponSection
              title={
                catId === "all"
                  ? q.trim()
                    ? `Resultados (${filtered.length})`
                    : "Todos los productos"
                  : `${
                      (
                        [{ id: "all", nombre: "Todo" }, ...categorias].find(
                          (x) => String(x.id) === String(catId)
                        ) || { nombre: "Categoría" }
                      ).nombre
                    } (${filtered.length})`
              }
              icon={<FiShoppingBag />}
            >
              {filtered.length ? (
                <div className="nippon-grid">
                  {filtered.map((p) => (
                    <NipponProductCard key={p.id || p.uuid} p={p} toPublicSrc={toPublicSrc} />
                  ))}
                </div>
              ) : (
                <div className="nippon-empty">
                  <FiShoppingBag size={38} />
                  <p>No se encontraron productos.</p>
                </div>
              )}
            </NipponSection>
          </>
        )}

        {/* Información */}
        <NipponSection title="Información" icon={<FiHeart />}>
          <div className="nippon-info">
            <div className="nip-card">
              <h3><FiPhone /> Contacto</h3>
              {tienda?.telefonoContacto && (
                <p><a href={`tel:${tienda.telefonoContacto}`}>{tienda.telefonoContacto}</a></p>
              )}
              {tienda?.email && (
                <p><a href={`mailto:${tienda.email}`}>{tienda.email}</a></p>
              )}
              {tienda?.ubicacionUrl && (
                <p>
                  <a href={tienda.ubicacionUrl} target="_blank" rel="noreferrer">
                    Ver ubicación <FiExternalLink />
                  </a>
                </p>
              )}
            </div>

            <div className="nip-card">
              <h3><FiClock /> Horario</h3>
              <NipponHours horario={tienda?.horario} />
            </div>
          </div>
        </NipponSection>
      </main>

      {/* FOOTER */}
      <footer className="nippon-footer">
        <div className="nippon-container nip-foot">
          <span>© {new Date().getFullYear()} {tienda?.nombre || "Tienda Nippona"}</span>
          <span className="nip-sep">•</span>
          <span>Hecho con calma y detalle</span>
        </div>
      </footer>
    </div>
  );
}

/* ====== Render de bloques guardados ====== */
function RenderBlocksNippon({
  layout = [],
  productos = [],
  categorias = [],
  tienda,
  toPublicSrc,
}) {
  const catName = (id) =>
    categorias.find((c) => Number(c.id) === Number(id))?.nombre || "Categoría";

  return (
    <>
      {layout.map((b) => {
        const type = b?.type;
        const p = { ...(DEFAULT_BLOCK_PROPS[type] || {}), ...(b?.props || {}) };

        if (type === "hero") return null;

        if (type === "featured") {
          const list = (productos || []).filter((x) => x.destacado).slice(0, p.limit ?? 8);
          if (!list.length) return null;
          return (
            <NipponSection key={b.id} title={p.title || "Destacados"} icon={<FiStar />}>
              <div className="nippon-grid">
                {list.map((prod) => (
                  <NipponProductCard key={prod.id || prod.uuid} p={prod} toPublicSrc={toPublicSrc} />
                ))}
              </div>
            </NipponSection>
          );
        }

        if (type === "grid") {
          const list = (productos || []).slice(0, p.limit ?? 12);
          if (!list.length) return null;
          return (
            <NipponSection key={b.id} title={p.title || "Todos los productos"} icon={<FiShoppingBag />}>
              <div className="nippon-grid">
                {list.map((prod) => (
                  <NipponProductCard key={prod.id || prod.uuid} p={prod} toPublicSrc={toPublicSrc} />
                ))}
              </div>
            </NipponSection>
          );
        }

        if (type === "category") {
          const id = Number(p.categoriaId);
          if (!id) return null;
          const list = (productos || []).filter(
            (prod) =>
              Array.isArray(prod.categorias) &&
              prod.categorias.some((pc) => Number(pc.categoriaId) === id)
          ).slice(0, p.limit ?? 12);
          if (!list.length) return null;
          return (
            <NipponSection key={b.id} title={p.title || catName(id)} icon={<FiShoppingBag />}>
              <div className="nippon-grid">
                {list.map((prod) => (
                  <NipponProductCard key={prod.id || prod.uuid} p={prod} toPublicSrc={toPublicSrc} />
                ))}
              </div>
            </NipponSection>
          );
        }

        if (type === "product") {
          const id = Number(p.productoId);
          if (!id) return null;
          const prod = (productos || []).find((x) => Number(x.id) === id);
          if (!prod) return null;
          return (
            <NipponSection key={b.id} title={prod.nombre || "Producto"} icon={<FiShoppingBag />}>
              <div className="nippon-grid">
                <NipponProductCard p={prod} toPublicSrc={toPublicSrc} />
              </div>
            </NipponSection>
          );
        }

        if (type === "banner") {
          const src = toPublicSrc?.(tienda?.bannerPromoUrl);
          return (
            <section key={b.id} className="nip-section">
              <div className="nip-head">
                <div className="nip-ico"><FiLayers /></div>
                <h2 className="nip-title">{p.title || "Colección Especial"}</h2>
                <div className="nip-line" />
              </div>

              <div
                className="nip-banner"
                style={{ backgroundImage: src ? `url(${src})` : undefined }}
              >
                {p.ctaText ? (
                  p.ctaUrl ? (
                    <a href={p.ctaUrl} target="_blank" rel="noreferrer" className="nip-cta">
                      {p.ctaText} <FiExternalLink />
                    </a>
                  ) : (
                    <em className="nip-cta muted">{p.ctaText}</em>
                  )
                ) : null}
              </div>
            </section>
          );
        }

        if (type === "logo") {
          const src = toPublicSrc?.(tienda?.logo?.url || tienda?.logoUrl);
          return (
            <section key={b.id} className="nip-section nip-center">
              {src ? <img src={src} alt="logo" className="nip-logo-block" /> : null}
            </section>
          );
        }

        return null;
      })}
    </>
  );
}

/* ====== Secciones y Cards ====== */
function NipponSection({ title, icon, children }) {
  return (
    <section className="nip-section">
      <div className="nip-head">
        <div className="nip-ico">{icon}</div>
        <h2 className="nip-title">{title}</h2>
        <div className="nip-line" />
      </div>
      {children}
    </section>
  );
}

function NipponProductCard({ p = {}, toPublicSrc }) {
  const img =
    toPublicSrc?.(
      [
        p?.imagenes?.find((x) => x?.isPrincipal)?.url,
        p?.imagenes?.[0]?.url,
        p?.imagen,
        p?.thumb,
        p?.foto,
        p?.cover,
      ].filter(Boolean)[0]
    ) || "";

  const categoria =
    p?.categoria?.nombre ||
    p?.categoria ||
    (Array.isArray(p?.categorias)
      ? p.categorias[0]?.nombre || p.categorias[0]?.categoria?.nombre
      : "") ||
    p?.category ||
    "";

  const conPrecio =
    typeof p?.precio === "number" ||
    (typeof p?.precio === "string" && p.precio.trim() !== "");
  const precio = (() => {
    const n = Number(p.precio || 0);
    return isFinite(n) ? `$${n.toFixed(2)}` : "";
  })();

  const to = buildProductoHref(p);

  const Media = ({ children }) =>
    to ? (
      <Link to={to} className="np-media" title="Ver detalles">
        {children}
      </Link>
    ) : (
      <div className="np-media">{children}</div>
    );

  return (
    <article className="np-card">
      <div className="np-frame" />
      <Media>
        {img ? (
          <img
            src={img}
            alt={p?.nombre || "producto"}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src =
                "data:image/svg+xml;utf8," +
                encodeURIComponent(
                  `<svg xmlns='http://www.w3.org/2000/svg' width='480' height='360'>
                     <rect width='100%' height='100%' fill='#FAF5EF'/>
                     <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
                      fill='#1F2544' font-family='Georgia' font-size='16'>Sin imagen</text>
                   </svg>`
                );
            }}
          />
        ) : (
          <div className="np-placeholder"><FiShoppingBag size={22} /></div>
        )}
        {p.destacado && <span className="np-badge"><FiStar /> Selección</span>}
      </Media>

      <div className="np-body">
        <div className="np-top">
          <h4 className="np-title">
            {to ? <Link to={to} className="np-link">{p?.nombre || p?.title || "Producto"}</Link> : (p?.nombre || p?.title || "Producto")}
          </h4>
          {categoria && <span className="np-chip">{categoria}</span>}
        </div>

        {p?.descripcion && (
          <p className="np-desc">
            {String(p.descripcion).length > 110
              ? `${String(p.descripcion).slice(0, 110)}…`
              : String(p.descripcion)}
          </p>
        )}

        <div className="np-foot">
          {conPrecio ? (
            <span className="np-price">{precio}</span>
          ) : (
            <span className="np-variants">Variantes disponibles</span>
          )}
          {to && <Link to={to} className="np-btn">Ver detalles</Link>}
        </div>
      </div>
    </article>
  );
}

function NipponHours({ horario = {} }) {
  const dias = [
    { id: "lun", label: "Lunes" },
    { id: "mar", label: "Martes" },
    { id: "mie", label: "Miércoles" },
    { id: "jue", label: "Jueves" },
    { id: "vie", label: "Viernes" },
    { id: "sab", label: "Sábado" },
    { id: "dom", label: "Domingo" },
  ];
  return (
    <div className="nip-hours">
      {dias.map((d) => (
        <Fragment key={d.id}>
          <span className="nip-hours-day">{d.label}</span>
          <span className="nip-hours-time">{horario?.[d.id] || "Cerrado"}</span>
        </Fragment>
      ))}
    </div>
  );
}

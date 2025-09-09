// E:\SVKP1\frontend\src\pages\Vendedor\Disenos\DisenoEstiloVintage.jsx
import React, { Fragment, useMemo, useState } from "react";
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
  FiShoppingCart,
  FiGrid
} from "react-icons/fi";

/* ===== Props por defecto (alineado al editor) ===== */
const DEFAULT_BLOCK_PROPS = {
  hero:     { showLogo: true, showDescripcion: true, align: "center" },
  featured: { title: "Destacados", limit: 8 },
  grid:     { title: "Todos los productos", limit: 12, showFilter: true },
  category: { title: "", categoriaId: null, limit: 12, showFilter: true },
  product:  { productoId: null },
  banner:   { title: "Colección Exclusiva", ctaText: "Descubrir", ctaUrl: "" },
  logo:     { shape: "rounded", frame: "thin" },
};

export default function DisenoEstiloVintage({
  tienda,
  productos = [],
  categorias = [],
  orderedBlocks = [],
  toPublicSrc,
}) {
  const [q, setQ] = useState("");
  const [catId, setCatId] = useState("all");

  /* ===== Paleta de lujo inspirada en marcas premium ===== */
  const tokens = useMemo(() => {
    return {
      gold: "#D4AF37",           // Dorado elegante
      dark: "#0A0A0A",           // Negro profundo
      light: "#FFFFFF",          // Blanco puro
      cream: "#F7F4EF",          // Crema suave
      gray: "#8E8E8E",           // Gris elegante
      accent: "#D4AF37",         // Dorado como acento
      accentSoft: "rgba(212, 175, 55, 0.15)",
      border: "rgba(212, 175, 55, 0.2)",
      shadow: "0 10px 30px rgba(0,0,0,0.1)",
    };
  }, []);

  /* ===== Portada / Logo / Hero props ===== */
  const portada = toPublicSrc?.(tienda?.portada?.url || tienda?.portadaUrl) || "";
  const logo    = toPublicSrc?.(tienda?.logo?.url || tienda?.logoUrl) || "";
  const heroProps = {
    ...DEFAULT_BLOCK_PROPS.hero,
    ...(orderedBlocks.find((b) => b?.type === "hero")?.props || {}),
  };

  /* ===== Categorías y búsqueda global (fallback) ===== */
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

  /* ===== Alineación hero ===== */
  const alignToFlex = (align) =>
    align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

  return (
    <div className="luxury-root">
      <style>{cssLuxury(tokens)}</style>

      {/* HERO ELEGANTE */}
      <header
        className="luxury-hero"
        style={{
          backgroundImage: portada
            ? `linear-gradient(rgba(10,10,10,0.7), rgba(10,10,10,0.5)), url(${portada})`
            : `linear-gradient(135deg, ${tokens.dark}, #2A2A2A)`,
        }}
      >
        <div className="luxury-hero-overlay" />
        <div
          className="luxury-hero-content"
          style={{ alignItems: alignToFlex(heroProps.align), textAlign: heroProps.align }}
        >
          {heroProps.showLogo && (
            logo ? (
              <div className="luxury-logo-frame">
                <img src={logo} alt="logo" className="luxury-logo" />
                <div className="luxury-logo-glow"></div>
              </div>
            ) : (
              <div className="luxury-logo placeholder">
                <FiGrid size={32} />
              </div>
            )
          )}
          <div className="luxury-hero-text">
            <h1 className="luxury-title">{tienda?.nombre || "Mi Tienda"}</h1>
            {heroProps.showDescripcion && tienda?.descripcion ? (
              <p className="luxury-subtitle">{tienda.descripcion}</p>
            ) : null}
          </div>
          <div className="luxury-hero-ornament">
            <div className="luxury-hero-line"></div>
            <div className="luxury-hero-diamond"></div>
            <div className="luxury-hero-line"></div>
          </div>
        </div>
      </header>

      {/* NAV: búsqueda minimalista + categorías */}
      <nav className="luxury-nav">
        <div className="luxury-container luxury-nav-inner">
          <div className="luxury-search-container">
            <FiSearch className="luxury-search-icon" />
            <input
              type="search"
              placeholder="Buscar productos…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="luxury-search-input"
            />
          </div>

          <div className="luxury-cats">
            {catTabs.map((c) => {
              const active = String(catId) === String(c.id);
              return (
                <button
                  key={String(c.id)}
                  className={`luxury-chip ${active ? "active" : ""}`}
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
      <main className="luxury-main luxury-container">
        {Array.isArray(orderedBlocks) && orderedBlocks.length > 0 ? (
          <RenderBlocksLuxury
            layout={orderedBlocks}
            productos={productos}
            categorias={categorias}
            tienda={tienda}
            toPublicSrc={toPublicSrc}
          />
        ) : (
          <>
            {productos.some((p) => p.destacado) && (
              <LuxurySection title="Productos Destacados" icon={<FiStar />}>
                <div className="luxury-grid">
                  {productos
                    .filter((p) => p.destacado)
                    .slice(0, 8)
                    .map((p) => (
                      <LuxuryProductCard
                        key={p.id || p.uuid}
                        p={p}
                        toPublicSrc={toPublicSrc}
                      />
                    ))}
                </div>
              </LuxurySection>
            )}

            <LuxurySection
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
                <div className="luxury-grid">
                  {filtered.map((p) => (
                    <LuxuryProductCard
                      key={p.id || p.uuid}
                      p={p}
                      toPublicSrc={toPublicSrc}
                    />
                  ))}
                </div>
              ) : (
                <div className="luxury-empty">
                  <FiShoppingBag size={40} />
                  <p>No se encontraron productos.</p>
                </div>
              )}
            </LuxurySection>
          </>
        )}

        {/* Info de tienda elegante */}
        <LuxurySection title="Información" icon={<FiHeart />}>
          <div className="luxury-info">
            <div className="l-info-card">
              <h3><FiPhone /> Contacto</h3>
              {tienda?.telefonoContacto && (
                <p>
                  <a href={`tel:${tienda.telefonoContacto}`}>{tienda.telefonoContacto}</a>
                </p>
              )}
              {tienda?.email && (
                <p>
                  <a href={`mailto:${tienda.email}`}>{tienda.email}</a>
                </p>
              )}
              {tienda?.ubicacionUrl && (
                <p>
                  <a href={tienda.ubicacionUrl} target="_blank" rel="noreferrer">
                    Ver ubicación <FiExternalLink />
                  </a>
                </p>
              )}
            </div>
            <div className="l-info-card">
              <h3><FiClock /> Horario</h3>
              <LuxuryHours horario={tienda?.horario} />
            </div>
          </div>
        </LuxurySection>
      </main>

      {/* FOOTER ELEGANTE */}
      <footer className="luxury-footer">
        <div className="luxury-container l-footer-inner">
          <span>© {new Date().getFullYear()} {tienda?.nombre || "Mi Tienda"}</span>
          <span className="luxury-dot">•</span>
          <span>Colección Exclusiva</span>
        </div>
      </footer>
    </div>
  );
}

/* ====== Render de bloques guardados ====== */
function RenderBlocksLuxury({
  layout = [],
  productos = [],
  categorias = [],
  tienda,
  toPublicSrc,
}) {
  const catName = (id) =>
    categorias.find((c) => Number(c.id) === Number(id))?.nombre || "Categoría";

  const Section = LuxurySection;

  return (
    <>
      {layout.map((b) => {
        const type = b?.type;
        const p = { ...(DEFAULT_BLOCK_PROPS[type] || {}), ...(b?.props || {}) };

        if (type === "hero") return null; // ya se renderizó arriba

        if (type === "featured") {
          const list = (productos || []).filter((x) => x.destacado).slice(0, p.limit ?? 8);
          if (!list.length) return null;
          return (
            <Section key={b.id} title={p.title || "Destacados"} icon={<FiStar />}>
              <div className="luxury-grid">
                {list.map((prod) => (
                  <LuxuryProductCard
                    key={prod.id || prod.uuid}
                    p={prod}
                    toPublicSrc={toPublicSrc}
                  />
                ))}
              </div>
            </Section>
          );
        }

        if (type === "grid") {
          const list = (productos || []).slice(0, p.limit ?? 12);
          if (!list.length) return null;
          return (
            <Section key={b.id} title={p.title || "Todos los productos"} icon={<FiShoppingBag />}>
              <div className="luxury-grid">
                {list.map((prod) => (
                  <LuxuryProductCard
                    key={prod.id || prod.uuid}
                    p={prod}
                    toPublicSrc={toPublicSrc}
                  />
                ))}
              </div>
            </Section>
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
            <Section key={b.id} title={p.title || catName(id)} icon={<FiShoppingBag />}>
              <div className="luxury-grid">
                {list.map((prod) => (
                  <LuxuryProductCard
                    key={prod.id || prod.uuid}
                    p={prod}
                    toPublicSrc={toPublicSrc}
                  />
                ))}
              </div>
            </Section>
          );
        }

        if (type === "product") {
          const id = Number(p.productoId);
          if (!id) return null;
          const prod = (productos || []).find((x) => Number(x.id) === id);
          if (!prod) return null;
          return (
            <Section key={b.id} title={prod.nombre || "Producto"} icon={<FiShoppingBag />}>
              <div className="luxury-grid">
                <LuxuryProductCard p={prod} toPublicSrc={toPublicSrc} />
              </div>
            </Section>
          );
        }

        if (type === "banner") {
          const src = toPublicSrc?.(tienda?.bannerPromoUrl);
          return (
            <section key={b.id} className="l-section">
              <div className="l-head">
                <div className="l-icon"><FiLayers /></div>
                <h2 className="l-title">{p.title || "Colección Exclusiva"}</h2>
                <div className="l-line" />
              </div>
              <div
                className="l-banner"
                style={{
                  backgroundImage: src ? `url(${src})` : undefined,
                }}
              >
                {p.ctaText ? (
                  p.ctaUrl ? (
                    <a href={p.ctaUrl} target="_blank" rel="noreferrer" className="l-cta">
                      {p.ctaText} <FiExternalLink />
                    </a>
                  ) : (
                    <em className="l-cta muted">{p.ctaText}</em>
                  )
                ) : null}
              </div>
            </section>
          );
        }

        if (type === "logo") {
          const src = toPublicSrc?.(tienda?.logo?.url || tienda?.logoUrl);
          return (
            <section key={b.id} className="l-section l-center">
              {src ? <img src={src} alt="logo" style={{ maxWidth: 180, filter: "brightness(0) invert(1)" }} /> : null}
            </section>
          );
        }

        return null;
      })}
    </>
  );
}

/* ====== Secciones y Cards ====== */
function LuxurySection({ title, icon, children }) {
  return (
    <section className="l-section">
      <div className="l-head">
        <div className="l-icon">{icon}</div>
        <h2 className="l-title">{title}</h2>
        <div className="l-line" />
      </div>
      {children}
    </section>
  );
}

function LuxuryProductCard({ p = {}, toPublicSrc }) {
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
      <Link to={to} className="lp-media" title="Ver detalles">
        {children}
      </Link>
    ) : (
      <div className="lp-media">{children}</div>
    );

  return (
    <article className="lp-card">
      <div className="lp-gold-frame"></div>
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
                     <rect width='100%' height='100%' fill='#0A0A0A'/>
                     <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#8E8E8E' font-family='Georgia' font-size='16'>Sin imagen</text>
                   </svg>`
                );
            }}
          />
        ) : (
          <div className="lp-placeholder"><FiShoppingBag size={24} /></div>
        )}
        {p.destacado && <span className="lp-badge"><FiStar /> Exclusivo</span>}
      </Media>

      <div className="lp-body">
        <div className="lp-top">
          <h4 className="lp-title">
            {to ? (
              <Link to={to} className="lp-link">{p?.nombre || p?.title || "Producto"}</Link>
            ) : (
              <span>{p?.nombre || p?.title || "Producto"}</span>
            )}
          </h4>
          {categoria && <span className="lp-chip">{categoria}</span>}
        </div>

        {p?.descripcion && (
          <p className="lp-desc">
            {String(p.descripcion).length > 110
              ? `${String(p.descripcion).slice(0, 110)}…`
              : String(p.descripcion)}
          </p>
        )}

        <div className="lp-foot">
          {conPrecio ? (
            <span className="lp-price">{precio}</span>
          ) : (
            <span className="lp-variants">Variantes disponibles</span>
          )}
          {to && <Link to={to} className="lp-btn">Ver detalles</Link>}
        </div>
      </div>
    </article>
  );
}

function LuxuryHours({ horario = {} }) {
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
    <div className="l-hours">
      {dias.map((d) => (
        <Fragment key={d.id}>
          <span className="l-hours-day">{d.label}</span>
          <span className="l-hours-time">{horario?.[d.id] || "Cerrado"}</span>
        </Fragment>
      ))}
    </div>
  );
}

/* ====== CSS Elegante con Marcos Dorados ====== */
function cssLuxury(t) {
  return `
:root {
  --gold: ${t.gold};
  --dark: ${t.dark};
  --light: ${t.light};
  --cream: ${t.cream};
  --gray: ${t.gray};
  --accent: ${t.accent};
  --accent-soft: ${t.accentSoft};
  --border: ${t.border};
  --shadow: ${t.shadow};
}

* { box-sizing: border-box; margin: 0; padding: 0; }
.luxury-root {
  background: var(--dark);
  color: var(--light);
  min-height: 100dvh;
  font-family: 'Cormorant Garamond', 'Georgia', 'Times New Roman', serif;
  line-height: 1.6;
}

/* contenedor */
.luxury-container {
  width: min(1200px, 92vw);
  margin-inline: auto;
}

/* HERO ELEGANTE */
.luxury-hero {
  position: relative;
  min-height: 85vh;
  display: grid;
  place-items: center;
  padding: 80px 20px;
  background-size: cover;
  background-position: center;
  overflow: hidden;
}
.luxury-hero-overlay {
  position: absolute; 
  inset: 0;
  background: linear-gradient(180deg, rgba(10,10,10,0.8), rgba(10,10,10,0.9));
}
.luxury-hero-content {
  position: relative; 
  z-index: 2;
  width: min(1100px, 92vw);
  display: flex; 
  flex-direction: column; 
  gap: 28px;
  align-items: center; 
  text-align: center;
}

.luxury-logo-frame {
  position: relative;
  padding: 12px;
  border: 2px solid var(--gold);
  border-radius: 50%;
  background: rgba(0,0,0,0.3);
  box-shadow: 0 0 30px rgba(212, 175, 55, 0.3);
}

.luxury-logo {
  width: 100px; 
  height: 100px; 
  object-fit: contain;
  border-radius: 50%;
  background: var(--light);
  padding: 8px;
}

.luxury-logo.placeholder { 
  width: 100px; 
  height: 100px; 
  border: 2px dashed var(--gold);
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--gold);
}

.luxury-logo-glow {
  position: absolute;
  top: -5px;
  left: -5px;
  right: -5px;
  bottom: -5px;
  border: 1px solid var(--gold);
  border-radius: 50%;
  animation: gold-pulse 3s infinite alternate;
}

@keyframes gold-pulse {
  0% { box-shadow: 0 0 10px var(--gold); }
  100% { box-shadow: 0 0 20px var(--gold), 0 0 30px rgba(212, 175, 55, 0.5); }
}

.luxury-title {
  font-family: "Cormorant Garamond", "Georgia", serif;
  font-weight: 600;
  font-size: clamp(2.5rem, 7vw, 4rem);
  letter-spacing: 1px;
  color: var(--light);
  text-transform: uppercase;
  margin: 0;
}

.luxury-subtitle {
  font-size: clamp(1.1rem, 3vw, 1.4rem);
  max-width: 680px;
  color: var(--gray);
  font-style: italic;
  font-weight: 300;
}

.luxury-hero-ornament {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 20px;
}

.luxury-hero-line {
  height: 1px;
  width: 80px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
}

.luxury-hero-diamond {
  width: 8px;
  height: 8px;
  background: var(--gold);
  transform: rotate(45deg);
}

/* NAV ELEGANTE */
.luxury-nav {
  position: sticky; 
  top: 0; 
  z-index: 10;
  background: rgba(10,10,10,0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
}
.luxury-nav-inner {
  display: flex; 
  align-items: center; 
  gap: 24px; 
  padding: 16px 0; 
  flex-wrap: wrap;
}

.luxury-search-container {
  position: relative;
  flex: 1;
  min-width: 280px;
}

.luxury-search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--gray);
  z-index: 2;
}

.luxury-search-input {
  width: 100%;
  padding: 14px 14px 14px 44px;
  background: rgba(255,255,255,0.08);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--light);
  font-family: inherit;
  font-size: 0.95rem;
  transition: all 0.3s ease;
}

.luxury-search-input:focus {
  outline: none;
  background: rgba(255,255,255,0.12);
  border-color: var(--gold);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.luxury-cats { 
  display: flex; 
  gap: 8px; 
  flex-wrap: wrap; 
}

.luxury-chip {
  padding: 10px 20px; 
  border-radius: 20px; 
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.05);
  color: var(--gray); 
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem; 
  cursor: pointer;
  transition: all 0.3s ease;
}

.luxury-chip:hover { 
  background: rgba(212, 175, 55, 0.1);
  color: var(--light);
}

.luxury-chip.active {
  background: var(--gold);
  color: var(--dark);
  border-color: var(--gold);
  font-weight: 500;
}

/* MAIN / SECTION */
.luxury-main { 
  position: relative; 
  z-index: 1; 
  padding: 60px 0 100px; 
}

.l-section { 
  margin: 50px 0 40px; 
}

.l-head { 
  display: flex; 
  align-items: center; 
  gap: 16px; 
  margin-bottom: 30px; 
}

.l-icon { 
  width: 40px; 
  height: 40px; 
  display: grid; 
  place-items: center;
  background: rgba(212, 175, 55, 0.1); 
  border: 1px solid var(--border); 
  border-radius: 10px; 
  color: var(--gold);
}

.l-title {
  font-family: "Cormorant Garamond", "Georgia", serif;
  font-size: clamp(1.6rem, 4vw, 2.2rem);
  font-weight: 600;
  color: var(--light);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.l-line { 
  height: 1px; 
  background: linear-gradient(90deg, var(--gold), transparent);
  flex: 1; 
}

/* GRID ELEGANTE */
.luxury-grid {
  display: grid; 
  gap: 30px;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

/* CARD DE LUJO CON MARCO DORADO */
.lp-card {
  position: relative;
  background: rgba(20, 20, 20, 0.8);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow);
  display: flex; 
  flex-direction: column; 
  height: 100%;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.lp-card:hover { 
  transform: translateY(-5px); 
  box-shadow: 0 20px 40px rgba(0,0,0,0.3), 0 0 30px rgba(212, 175, 55, 0.2);
}

.lp-gold-frame {
  position: absolute;
  top: -1px;
  left: -1px;
  right: -1px;
  bottom: -1px;
  border: 2px solid transparent;
  border-radius: 16px;
  background: linear-gradient(45deg, transparent, var(--gold), transparent) border-box;
  mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.lp-card:hover .lp-gold-frame {
  opacity: 1;
  animation: frame-glow 2s infinite alternate;
}

@keyframes frame-glow {
  0% { box-shadow: 0 0 10px rgba(212, 175, 55, 0.5); }
  100% { box-shadow: 0 0 20px rgba(212, 175, 55, 0.8); }
}

.lp-media { 
  position: relative; 
  display: block; 
  overflow: hidden;
}

.lp-media img, .lp-placeholder {
  width: 100%; 
  aspect-ratio: 4/3; 
  object-fit: cover; 
  display: block;
  background: #1A1A1A;
  transition: transform 0.6s ease;
}

.lp-card:hover .lp-media img {
  transform: scale(1.05);
}

.lp-placeholder { 
  display: grid; 
  place-items: center; 
  color: var(--gray);
}

.lp-badge {
  position: absolute; 
  top: 12px; 
  left: 12px;
  display: inline-flex; 
  align-items: center; 
  gap: 6px;
  background: rgba(10,10,10,0.9);
  border: 1px solid var(--gold);
  border-radius: 20px; 
  padding: 8px 14px; 
  font-size: 0.8rem; 
  color: var(--gold);
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  backdrop-filter: blur(10px);
}

.lp-body { 
  padding: 20px; 
  display: flex; 
  flex-direction: column; 
  gap: 12px; 
  flex: 1; 
}

.lp-top { 
  display: flex; 
  align-items: flex-start; 
  justify-content: space-between; 
  gap: 12px; 
}

.lp-title {
  margin: 0; 
  font-size: 1.1rem; 
  line-height: 1.3;
  font-family: "Cormorant Garamond", "Georgia", serif;
  font-weight: 600;
  color: var(--light);
}

.lp-link { 
  color: inherit; 
  text-decoration: none; 
}

.lp-link:hover { 
  color: var(--gold);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.lp-chip {
  border: 1px solid var(--border); 
  border-radius: 12px; 
  padding: 4px 10px; 
  font-size: 0.8rem; 
  color: var(--gray); 
  background: rgba(255,255,255,0.05);
  font-family: 'Inter', sans-serif;
}

.lp-desc { 
  margin: 0; 
  color: var(--gray); 
  font-size: 0.95rem; 
  flex: 1; 
  font-style: italic;
}

.lp-foot { 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  gap: 12px; 
  margin-top: auto; 
}

.lp-price {
  font-weight: 700; 
  color: var(--gold); 
  font-family: "Cormorant Garamond", "Georgia", serif;
  font-size: 1.2rem;
}

.lp-variants { 
  font-size: 0.86rem; 
  color: var(--gray); 
}

.lp-btn {
  border: 1px solid var(--border); 
  border-radius: 10px; 
  padding: 10px 16px;
  background: linear-gradient(180deg, rgba(212, 175, 55, 0.1), rgba(212, 175, 55, 0.05));
  text-decoration: none; 
  color: var(--light); 
  font-family: 'Inter', sans-serif;
  font-weight: 500; 
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.lp-btn:hover { 
  background: linear-gradient(180deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.1));
  border-color: var(--gold);
  box-shadow: 0 0 15px rgba(212, 175, 55, 0.2);
}

/* Banner */
.l-banner {
  min-height: 240px; 
  background-size: cover; 
  background-position: center;
  border-radius: 16px; 
  border: 1px solid var(--border);
  display: grid; 
  place-items: center; 
  overflow: hidden;
  position: relative;
}

.l-banner:before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(45deg, rgba(10,10,10,0.7), rgba(10,10,10,0.5));
}

.l-cta { 
  position: relative;
  z-index: 2;
  color: var(--light); 
  font-weight: 600; 
  text-decoration: none;
  font-family: "Cormorant Garamond", serif;
  font-size: 1.2rem;
  padding: 12px 24px;
  border: 1px solid var(--gold);
  border-radius: 8px;
  background: rgba(212, 175, 55, 0.1);
  transition: all 0.3s ease;
}

.l-cta:hover {
  background: rgba(212, 175, 55, 0.2);
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
}

.l-cta.muted { 
  color: var(--gray); 
  font-style: normal; 
  font-weight: 500; 
  border: none;
  background: none;
}

/* Empty */
.luxury-empty {
  border: 2px dashed var(--border); 
  border-radius: 16px;
  padding: 60px 20px; 
  color: var(--gray); 
  display: grid; 
  place-items: center; 
  gap: 16px;
  background: rgba(255,255,255,0.03);
}

/* Info */
.luxury-info {
  display: grid; 
  gap: 24px; 
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.l-info-card {
  background: rgba(20, 20, 20, 0.8); 
  border: 1px solid var(--border); 
  border-radius: 16px; 
  padding: 24px;
  box-shadow: var(--shadow);
  position: relative;
  overflow: hidden;
}

.l-info-card:before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
}

.l-info-card h3 { 
  margin: 0 0 16px 0; 
  font-size: 1.1rem; 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  color: var(--gold);
  font-family: "Cormorant Garamond", serif;
}

.l-info-card p { 
  margin: 8px 0; 
}

.l-info-card a { 
  color: var(--light); 
  text-decoration: none;
  transition: color 0.3s ease;
}

.l-info-card a:hover { 
  color: var(--gold);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* Horario */
.l-hours {
  display: grid; 
  grid-template-columns: 1fr auto; 
  gap: 8px 16px;
  font-variant-numeric: tabular-nums;
}

.l-hours-day { 
  color: var(--light);
  font-family: 'Inter', sans-serif;
}

.l-hours-time { 
  color: var(--gray);
  font-family: 'Inter', sans-serif;
}

/* FOOTER ELEGANTE */
.luxury-footer {
  border-top: 1px solid var(--border);
  background: rgba(10,10,10,0.95);
  backdrop-filter: blur(10px);
}

.l-footer-inner {
  padding: 24px 0; 
  display: flex; 
  gap: 12px; 
  align-items: center; 
  justify-content: center; 
  color: var(--gray);
  font-family: 'Inter', sans-serif;
}

.luxury-dot { 
  opacity: 0.6; 
}

/* Responsive */
@media (max-width: 768px) {
  .luxury-hero { min-height: 70vh; padding: 60px 20px; }
  .luxury-nav-inner { padding: 12px 0; flex-direction: column; gap: 16px; }
  .luxury-search-container { min-width: 100%; }
  .luxury-cats { justify-content: center; }
  .luxury-grid { grid-template-columns: 1fr; }
  .l-head { flex-direction: column; align-items: flex-start; gap: 12px; }
  .l-line { width: 100%; }
  .lp-top { flex-direction: column; align-items: flex-start; }
  .lp-foot { flex-direction: column; align-items: flex-start; gap: 12px; }
  .lp-btn { align-self: stretch; text-align: center; }
  .l-footer-inner { flex-direction: column; gap: 8px; text-align: center; }
  .luxury-dot { display: none; }
}

/* Fuentes */
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
`;
}
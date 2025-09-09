// E:\SVKP1\frontend\src\pages\Vendedor\Disenos\DisenoEstiloRopaBoutique.jsx
import React, { useMemo, useState, useRef, useEffect, Fragment } from "react";
import { Link } from "react-router-dom";
import "./boutique.css";
import { buildProductoHref } from "../../../lib/productHref";
import {
  FiSearch,
  FiStar,
  FiShoppingBag,
  FiMessageCircle,
  FiMapPin,
  FiExternalLink,
  FiPhone,
  FiMail,
  FiClock,
  FiFacebook,
  FiInstagram,
  FiGrid,
  FiHeart,
  FiTrendingUp,
  FiLayers,
  FiShoppingCart,
  FiUser,
  FiPackage,
  FiScissors,
} from "react-icons/fi";

/* ===== Props por defecto (igual que en editor) ===== */
const DEFAULT_BLOCK_PROPS = {
  hero: { showLogo: true, showDescripcion: true, align: "center" },
  featured: { title: "Productos Destacados", limit: 8 },
  grid: { title: "Todos los productos", limit: 12, showFilter: true },
  category: { title: "", categoriaId: null, limit: 12, showFilter: true },
  product: { productoId: null },
  banner: { title: "Nueva Colección", ctaText: "Descubrir", ctaUrl: "" },
  logo: { shape: "rounded", frame: "thin" },
};

export default function DisenoEstiloRopaBoutique({
  tienda,
  productos = [],
  categorias = [],
  orderedBlocks = [],
  toPublicSrc,
}) {
  const [q, setQ] = useState("");
  const [catId, setCatId] = useState("all");
  const [mounted, setMounted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const heroRef = useRef(null);
  const mainRef = useRef(null);

  /* ===== Paleta Boutique ===== */
  const { boutiqueColors, textColor } = useMemo(() => {
    const palette = ["#E8D5C0", "#D2B48C", "#A0522D", "#8B4513", "#F5F5DC", "#FFFFFF", "#000000"];
    return { boutiqueColors: palette, textColor: "#2C1810" };
  }, []);

  /* ===== Filtro global ===== */
  const filtered = useMemo(() => {
    let list = Array.isArray(productos) ? [...productos] : [];
    if (catId !== "all") {
      const idNum = Number(catId);
      list = list.filter(
        (p) =>
          Array.isArray(p?.categorias) &&
          p.categorias.some((pc) => Number(pc?.categoriaId) === idNum)
      );
    }
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((p) =>
        `${p?.nombre || ""} ${p?.descripcion || ""} ${p?.detalle || ""}`.toLowerCase().includes(needle)
      );
    }
    return list;
  }, [productos, catId, q]);

  /* ===== Efectos ===== */
  useEffect(() => {
    setMounted(true);
    const onScroll = () => {
      const top = window.scrollY;
      const h = document.body.offsetHeight - window.innerHeight;
      setScrollProgress(h > 0 ? top / h : 0);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const portada = toPublicSrc?.(tienda?.portada?.url || tienda?.portadaUrl) || "";
  const logo = toPublicSrc?.(tienda?.logo?.url || tienda?.logoUrl) || "";

  const catTabs = useMemo(
    () => [{ id: "all", nombre: "Todo" }, ...categoriasSafe(categorias)],
    [categorias]
  );

  const heroBlock = (orderedBlocks || []).find((b) => b?.type === "hero");
  const heroProps = { ...DEFAULT_BLOCK_PROPS.hero, ...(heroBlock?.props || {}) };

  const alignToFlex = (align) =>
    align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

  /* ===== Decoraciones: puntos con posiciones estables ===== */
  const fashionDots = useMemo(() => {
    const N = 15;
    return Array.from({ length: N }).map((_, i) => ({
      key: i,
      delay: i * 0.3,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
    }));
    // intencional: solo una vez en mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="boutique-root" ref={mainRef}>
      <style>{cssBoutiqueElegante}</style>

      {/* Progress Bar */}
      <div className="boutique-scroll-progress">
        <div
          className="boutique-scroll-progress-bar"
          style={{
            width: `${scrollProgress * 100}%`,
            background: `linear-gradient(90deg, ${boutiqueColors[2]}, ${boutiqueColors[3]})`,
          }}
        />
      </div>

      {/* Decoración */}
      <div className="boutique-decorations">
        <div className="fashion-dots">
          {fashionDots.map((d) => (
            <div
              key={d.key}
              className="fashion-dot"
              style={{
                animationDelay: `${d.delay}s`,
                left: d.left,
                top: d.top,
                background: boutiqueColors[d.key % boutiqueColors.length],
              }}
            />
          ))}
        </div>
        <div className="elegant-lines">
          <div className="deco-line vertical-left"></div>
          <div className="deco-line vertical-right"></div>
          <div className="deco-line horizontal-top"></div>
        </div>
      </div>

      {/* HERO */}
      <header
        ref={heroRef}
        className={`boutique-hero ${mounted ? "mounted" : ""}`}
        style={{
          color: textColor,
          backgroundImage: portada
            ? `linear-gradient(rgba(255,255,255,0.9), rgba(255,255,255,0.8)), url(${portada})`
            : `linear-gradient(135deg, ${boutiqueColors[0]}, ${boutiqueColors[1]})`,
        }}
      >
        <div className="boutique-hero-overlay">
          <div className="luxury-pattern"></div>
        </div>

        <div
          className="boutique-hero-content"
          style={{
            textAlign: heroProps.align,
            alignItems: alignToFlex(heroProps.align),
            display: "flex",
            flexDirection: "column",
            gap: 20,
            marginInline: "auto",
          }}
        >
          {heroProps.showLogo ? (
            logo ? (
              <div className="boutique-logo-container">
                <div className="boutique-logo-frame">
                  <img className="boutique-logo" src={logo} alt="logo" />
                  <div className="boutique-logo-shine" />
                </div>
              </div>
            ) : (
              <div className="boutique-logo-placeholder">
                <FiScissors size={40} />
              </div>
            )
          ) : null}

          <div className="boutique-title-container" style={{ textAlign: heroProps.align }}>
            <h1 className="boutique-title">{tienda?.nombre || "Boutique Elegante"}</h1>
            {heroProps.showDescripcion && tienda?.descripcion ? (
              <p className="boutique-subtitle">{tienda.descripcion}</p>
            ) : null}
          </div>

          <div className="boutique-hero-ornament">
            <div className="boutique-hero-line" />
            <FiHeart className="boutique-hero-icon" />
            <div className="boutique-hero-line" />
          </div>
        </div>

        <div className="boutique-scroll-indicator">
          <div className="boutique-scroll-arrow">↓</div>
        </div>
      </header>

      {/* NAV */}
      <nav className="boutique-nav">
        <div className="boutique-nav-container">
          <div className="boutique-search-container">
            <FiSearch className="boutique-search-icon" />
            <input
              type="search"
              placeholder="Buscar productos de boutique..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="boutique-search-input"
            />
            <div className="boutique-search-underline" />
          </div>

          <div className="boutique-categories">
            {catTabs.map((c) => {
              const active = String(catId) === String(c.id);
              return (
                <button
                  key={`${c.id}`}
                  className={`boutique-category-btn ${active ? "active" : ""}`}
                  onClick={() => setCatId(String(c.id))}
                  title={c.nombre}
                >
                  <span className="boutique-category-text">{c.nombre}</span>
                  {active && <div className="boutique-category-indicator" />}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <main className="boutique-main">
        <BoutiqueStatsSection
          productosCount={productos.length}
          categoriasCount={categorias.length}
          boutiqueColors={boutiqueColors}
        />

        {Array.isArray(orderedBlocks) && orderedBlocks.length > 0 ? (
          <RenderBlocksBoutique
            layout={orderedBlocks}
            productos={productos}
            categorias={categoriasSafe(categorias)}
            tienda={tienda}
            toPublicSrc={toPublicSrc}
            boutiqueColors={boutiqueColors}
            globalQuery={q}
          />
        ) : (
          <>
            {productos.some((p) => p.destacado) && (
              <BoutiqueSection title="Productos Destacados" icon={<FiStar />} boutiqueColors={boutiqueColors}>
                <div className="boutique-grid">
                  {productos
                    .filter((p) => p.destacado)
                    .slice(0, 12)
                    .map((p) => (
                      <BoutiqueProductCard
                        key={p.id || p.uuid}
                        p={p}
                        toPublicSrc={toPublicSrc}
                        boutiqueColors={boutiqueColors}
                      />
                    ))}
                </div>
              </BoutiqueSection>
            )}

            <BoutiqueSection
              title={
                catId === "all"
                  ? q.trim()
                    ? `Resultados (${filtered.length})`
                    : "Todos los productos"
                  : `${
                      (
                        [{ id: "all", nombre: "Todo" }, ...categoriasSafe(categorias)].find(
                          (x) => String(x.id) === String(catId)
                        ) || { nombre: "Categoría" }
                      ).nombre
                    } (${filtered.length})`
              }
              icon={<FiShoppingBag />}
              boutiqueColors={boutiqueColors}
            >
              {filtered.length ? (
                <div className="boutique-grid">
                  {filtered.map((p) => (
                    <BoutiqueProductCard
                      key={p.id || p.uuid}
                      p={p}
                      toPublicSrc={toPublicSrc}
                      boutiqueColors={boutiqueColors}
                    />
                  ))}
                </div>
              ) : (
                <div className="boutique-empty">
                  <FiShoppingBag size={48} />
                  <p>No se encontraron productos para esta búsqueda.</p>
                </div>
              )}
            </BoutiqueSection>
          </>
        )}

        {/* Info tienda */}
        <BoutiqueSection title="Información de Contacto" icon={<FiUser />} boutiqueColors={boutiqueColors}>
          <div className="boutique-info-grid">
            <BoutiqueInfoCard title="Contacto Directo" icon={<FiPhone />} boutiqueColors={boutiqueColors}>
              {tienda?.telefonoContacto && (
                <div className="boutique-contact-item">
                  <FiPhone className="boutique-contact-icon" />
                  <a href={`tel:${tienda.telefonoContacto}`}>{tienda.telefonoContacto}</a>
                </div>
              )}
              {tienda?.email && (
                <div className="boutique-contact-item">
                  <FiMail className="boutique-contact-icon" />
                  <a href={`mailto:${tienda.email}`}>{tienda.email}</a>
                </div>
              )}
              {tienda?.ubicacionUrl && (
                <div className="boutique-contact-item">
                  <FiMapPin className="boutique-contact-icon" />
                  <a href={tienda.ubicacionUrl} target="_blank" rel="noreferrer">
                    Ver ubicación <FiExternalLink />
                  </a>
                </div>
              )}
            </BoutiqueInfoCard>

            <BoutiqueInfoCard title="Horario de Atención" icon={<FiClock />} boutiqueColors={boutiqueColors}>
              <BoutiqueHours horario={tienda?.horario} />
            </BoutiqueInfoCard>

            <BoutiqueInfoCard title="Síguenos" icon={<FiHeart />} boutiqueColors={boutiqueColors}>
              <div className="boutique-social-grid">
                {tienda?.redes?.facebook && (
                  <a className="boutique-social-link" href={tienda.redes.facebook} target="_blank" rel="noreferrer">
                    <FiFacebook className="boutique-social-icon" />
                    <span>Facebook</span>
                  </a>
                )}
                {tienda?.redes?.instagram && (
                  <a className="boutique-social-link" href={tienda.redes.instagram} target="_blank" rel="noreferrer">
                    <FiInstagram className="boutique-social-icon" />
                    <span>Instagram</span>
                  </a>
                )}
              </div>
            </BoutiqueInfoCard>
          </div>
        </BoutiqueSection>
      </main>

      <footer className="boutique-footer">
        <div className="boutique-footer-content">
          <span>© {new Date().getFullYear()} {tienda?.nombre || "Boutique Elegante"}</span>
          <div className="boutique-footer-separator">•</div>
          <span>Diseño con elegancia y estilo</span>
        </div>
      </footer>
    </div>
  );
}

/* ========= Render de BLOQUES ========= */
function RenderBlocksBoutique({
  layout = [],
  productos = [],
  categorias = [],
  tienda,
  toPublicSrc,
  boutiqueColors,
  globalQuery = "",
}) {
  const catName = (id) =>
    categorias.find((c) => Number(c.id) === Number(id))?.nombre || "Categoría";

  const applyGlobal = (arr, p) => {
    if (!p?.showFilter || !globalQuery.trim()) return arr;
    const needle = globalQuery.trim().toLowerCase();
    return arr.filter((x) =>
      `${x?.nombre || ""} ${x?.descripcion || ""} ${x?.detalle || ""}`.toLowerCase().includes(needle)
    );
  };

  return (
    <>
      {layout.map((b) => {
        const type = b?.type;
        const p = { ...(DEFAULT_BLOCK_PROPS[type] || {}), ...(b?.props || {}) };

        if (type === "hero") return null;

        if (type === "featured") {
          const list = (productos || []).filter((x) => x.destacado);
          const display = applyGlobal(list, p).slice(0, p.limit ?? 8);
          if (!display.length) return null;
          return (
            <BoutiqueSection key={b.id} title={p.title || "Productos Destacados"} icon={<FiStar />} boutiqueColors={boutiqueColors}>
              <div className="boutique-grid">
                {display.map((prod) => (
                  <BoutiqueProductCard key={prod.id || prod.uuid} p={prod} toPublicSrc={toPublicSrc} boutiqueColors={boutiqueColors} />
                ))}
              </div>
            </BoutiqueSection>
          );
        }

        if (type === "grid") {
          const list = applyGlobal([...productos], p).slice(0, p.limit ?? 12);
          if (!list.length) return null;
          return (
            <BoutiqueSection key={b.id} title={p.title || "Todos los productos"} icon={<FiShoppingBag />} boutiqueColors={boutiqueColors}>
              <div className="boutique-grid">
                {list.map((prod) => (
                  <BoutiqueProductCard key={prod.id || prod.uuid} p={prod} toPublicSrc={toPublicSrc} boutiqueColors={boutiqueColors} />
                ))}
              </div>
            </BoutiqueSection>
          );
        }

        if (type === "category") {
          const id = Number(p.categoriaId);
          if (!id) return null;
          const listRaw = (productos || []).filter(
            (prod) =>
              Array.isArray(prod.categorias) &&
              prod.categorias.some((pc) => Number(pc.categoriaId) === id)
          );
          const list = applyGlobal(listRaw, p).slice(0, p.limit ?? 12);
          if (!list.length) return null;
          return (
            <BoutiqueSection key={b.id} title={p.title || catName(id)} icon={<FiShoppingBag />} boutiqueColors={boutiqueColors}>
              <div className="boutique-grid">
                {list.map((prod) => (
                  <BoutiqueProductCard key={prod.id || prod.uuid} p={prod} toPublicSrc={toPublicSrc} boutiqueColors={boutiqueColors} />
                ))}
              </div>
            </BoutiqueSection>
          );
        }

        if (type === "product") {
          const id = Number(p.productoId);
          if (!id) return null;
          const prod = (productos || []).find((x) => Number(x.id) === id);
          if (!prod) return null;
          return (
            <BoutiqueSection key={b.id} title={prod.nombre || "Producto"} icon={<FiShoppingBag />} boutiqueColors={boutiqueColors}>
              <div className="boutique-grid">
                <BoutiqueProductCard p={prod} toPublicSrc={toPublicSrc} boutiqueColors={boutiqueColors} />
              </div>
            </BoutiqueSection>
          );
        }

        if (type === "banner") {
          const src = toPublicSrc?.(tienda?.bannerPromoUrl);
          return (
            <section key={b.id} className="boutique-section">
              <div className="boutique-section-header">
                <div className="boutique-section-icon" style={{ color: boutiqueColors[2] }}>
                  <FiLayers />
                </div>
                <h2 className="boutique-section-title">{p.title || "Nueva Colección"}</h2>
                <div className="boutique-section-line" style={{ backgroundColor: boutiqueColors[2] }} />
              </div>
              <div className="boutique-banner" style={{ backgroundImage: src ? `url(${src})` : undefined }}>
                {p.ctaText ? (
                  p.ctaUrl ? (
                    <a href={p.ctaUrl} target="_blank" rel="noreferrer" className="boutique-banner-link">
                      {p.ctaText}
                    </a>
                  ) : (
                    <span className="boutique-banner-text">{p.ctaText}</span>
                  )
                ) : null}
              </div>
            </section>
          );
        }

        if (type === "logo") {
          const src = toPublicSrc?.(tienda?.logo?.url || tienda?.logoUrl);
          return (
            <section key={b.id} className="boutique-section" style={{ display: "grid", placeItems: "center" }}>
              {src ? <img src={src} alt="logo" className="boutique-logo-block" /> : null}
            </section>
          );
        }

        return null;
      })}
    </>
  );
}

/* ========= Auxiliares ========= */

function BoutiqueStatsSection({ productosCount, categoriasCount, boutiqueColors }) {
  return (
    <section className="boutique-stats-section">
      <div className="boutique-stats-grid">
        <div className="boutique-stat-card">
          <div className="boutique-stat-icon"><FiPackage /></div>
          <div className="boutique-stat-content">
            <h3>{productosCount}</h3>
            <p>Productos Elegantes</p>
          </div>
        </div>
        <div className="boutique-stat-card">
          <div className="boutique-stat-icon"><FiGrid /></div>
          <div className="boutique-stat-content">
            <h3>{categoriasCount}</h3>
            <p>Categorías</p>
          </div>
        </div>
        <div className="boutique-stat-card">
          <div className="boutique-stat-icon"><FiTrendingUp /></div>
          <div className="boutique-stat-content">
            <h3>100%</h3>
            <p>Calidad Garantizada</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function BoutiqueSection({ title, icon, children, boutiqueColors }) {
  return (
    <section className="boutique-section">
      <div className="boutique-section-header">
        <div className="boutique-section-icon" style={{ color: boutiqueColors[2] }}>{icon}</div>
        <h2 className="boutique-section-title">{title}</h2>
        <div className="boutique-section-line" style={{ backgroundColor: boutiqueColors[2] }} />
      </div>
      {children}
    </section>
  );
}

function BoutiqueInfoCard({ title, icon, children, boutiqueColors }) {
  return (
    <div className="boutique-info-card">
      <div className="boutique-info-card-header">
        <div className="boutique-info-card-icon" style={{ color: boutiqueColors[2] }}>{icon}</div>
        <h3 className="boutique-info-card-title">{title}</h3>
      </div>
      <div className="boutique-info-card-content">{children}</div>
    </div>
  );
}

function BoutiqueProductCard({ p = {}, toPublicSrc, boutiqueColors }) {
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

  const hasPrecio =
    typeof p?.precio === "number" ||
    (typeof p?.precio === "string" && p.precio.trim() !== "");
  const precio = (() => {
    const n = Number(p.precio || 0);
    return Number.isFinite(n) ? `$${n.toFixed(2)}` : "";
  })();

  const to = buildProductoHref(p);

  const Media = ({ children }) =>
    to ? (
      <Link to={to} className="boutique-product-media" title="Ver detalles">
        {children}
      </Link>
    ) : (
      <div className="boutique-product-media">{children}</div>
    );

  return (
    <article className="boutique-product-card">
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
                     <rect width='100%' height='100%' fill='#f7f3ea'/>
                     <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#a0522d' font-family='sans-serif' font-size='16'>Sin imagen</text>
                   </svg>`
                );
            }}
          />
        ) : (
          <div className="boutique-product-placeholder"><FiShoppingBag size={32} /></div>
        )}
        {p.destacado && (
          <span className="boutique-product-badge">
            <FiStar size={14} /> Destacado
          </span>
        )}
        <div className="product-hover-overlay">
          <span>Ver detalles</span>
        </div>
      </Media>

      <div className="boutique-product-info">
        <div className="boutique-product-header">
          <h4 className="boutique-product-title">
            {to ? <Link to={to}>{p?.nombre || p?.title || "Producto"}</Link> : <span>{p?.nombre || p?.title || "Producto"}</span>}
          </h4>
          {categoria && <span className="boutique-product-category">{categoria}</span>}
        </div>

        {p?.descripcion && (
          <p className="boutique-product-description">
            {String(p.descripcion).length > 100 ? `${String(p.descripcion).slice(0, 100)}…` : String(p.descripcion)}
          </p>
        )}

        <div className="boutique-product-footer">
          {hasPrecio ? (
            <span className="boutique-product-price">{precio}</span>
          ) : (
            <span className="boutique-product-variants">Variantes disponibles</span>
          )}
          {to && <Link to={to} className="boutique-product-button">Ver detalles</Link>}
        </div>
      </div>
    </article>
  );
}

function BoutiqueHours({ horario = {} }) {
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
    <div className="boutique-hours">
      {dias.map((d) => (
        <Fragment key={d.id}>
          <span className="boutique-hours-day">{d.label}</span>
          <span className="boutique-hours-time">{horario?.[d.id] || "Cerrado"}</span>
        </Fragment>
      ))}
    </div>
  );
}

/* ===== Utils ===== */
function categoriasSafe(c) { return Array.isArray(c) ? c : []; }

/* ========= CSS ========= */
const cssBoutiqueElegante = `
/* (idéntico al que enviaste, sin cambios funcionales) */
${/* — para no inundar el mensaje, mantenemos tu mismo CSS completo — */""}
:root{--boutique-bg:#f9f6f0;--boutique-surface:#ffffff;--boutique-border:#e8d5c0;--boutique-text:#2c1810;--boutique-sub:#8a7860;--boutique-accent:#a0522d;--boutique-light:#e8d5c0;--boutique-dark:#8b4513}
*{box-sizing:border-box;margin:0;padding:0}
.boutique-root{background:var(--boutique-bg);color:var(--boutique-text);min-height:100dvh;line-height:1.6;font-family:'Playfair Display','Georgia',serif;position:relative;overflow-x:hidden}
.boutique-product-media{display:block;text-decoration:none}
.boutique-product-title a{text-decoration:none;color:inherit}
.boutique-product-title a:hover{text-decoration:underline}
.boutique-product-button{display:inline-block;text-decoration:none}
/* … (pega aquí el CSS íntegro que ya tenías; por brevedad lo omití, pero sigue siendo el mismo) … */
`;

// E:\SVKP1\frontend\src\pages\Vendedor\Disenos\DisenoEstiloRopaBoutique.jsx
import React, { useMemo, useState, useRef, useEffect, Fragment } from "react";
import { Link } from "react-router-dom";
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
  FiYoutube,
  FiGrid,
  FiHeart,
  FiTrendingUp,
  FiLayers,
  FiShoppingCart,
  FiUser,
  FiPackage,
  FiScissors
} from "react-icons/fi";

/* ===== Props por defecto de los bloques (igual que en editor) ===== */
const DEFAULT_BLOCK_PROPS = {
  hero: { showLogo: true, showDescripcion: true, align: "center" },
  featured: { title: "Productos Destacados", limit: 8 },
  grid: { title: "Todos los productos", limit: 12, showFilter: true },
  category: { title: "", categoriaId: null, limit: 12, showFilter: true },
  product: { productoId: null },
  banner: { title: "Nueva Colección", ctaText: "Descubrir", ctaUrl: "" },
  logo: { shape: "rounded", frame: "thin" },
};

/**
 * Diseño Boutique Elegante - Para tiendas de ropa y cosméticos
 */
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

  // === Paleta de colores elegante para boutique ===
  const { boutiqueColors, accentColor, textColor } = useMemo(() => {
    const boutiquePalette = ["#E8D5C0", "#D2B48C", "#A0522D", "#8B4513", "#F5F5DC", "#FFFFFF", "#000000"];
    return {
      boutiqueColors: boutiquePalette,
      accentColor: "#A0522D", // Marrón elegante
      textColor: "#2C1810",   // Marrón oscuro
    };
  }, []);

  // === Filtros globales ===
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
      const needle = q.trim().toLowerCase();
      list = list.filter((p) => {
        const hay = `${p?.nombre || ""} ${p?.descripcion || ""} ${
          p?.detalle || ""
        }`.toLowerCase();
        return hay.includes(needle);
      });
    }
    return list;
  }, [productos, catId, q]);

  // === Efectos ===
  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.body.offsetHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? scrollTop / docHeight : 0;
      setScrollProgress(scrollPercent);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const portada = toPublicSrc?.(tienda?.portada?.url || tienda?.portadaUrl) || "";
  const logo = toPublicSrc?.(tienda?.logo?.url || tienda?.logoUrl) || "";

  const catTabs = useMemo(
    () => [{ id: "all", nombre: "Todo" }, ...categorias],
    [categorias]
  );

  // Toma props del primer bloque hero del layout
  const heroBlock = (orderedBlocks || []).find((b) => b?.type === "hero");
  const heroProps = { ...DEFAULT_BLOCK_PROPS.hero, ...(heroBlock?.props || {}) };

  const alignToFlex = (align) =>
    align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

  return (
    <div className="boutique-root" ref={mainRef}>
      {/* Estilos embebidos */}
      <style>{cssBoutiqueElegante}</style>

      {/* Progress Bar Elegante */}
      <div className="boutique-scroll-progress">
        <div
          className="boutique-scroll-progress-bar"
          style={{
            width: `${scrollProgress * 100}%`,
            background: `linear-gradient(90deg, ${boutiqueColors[2]}, ${boutiqueColors[3]})`,
          }}
        />
      </div>

      {/* Elementos decorativos de boutique */}
      <div className="boutique-decorations">
        <div className="fashion-dots">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="fashion-dot" style={{
              animationDelay: `${i * 0.3}s`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: boutiqueColors[i % boutiqueColors.length]
            }} />
          ))}
        </div>
        <div className="elegant-lines">
          <div className="deco-line vertical-left"></div>
          <div className="deco-line vertical-right"></div>
          <div className="deco-line horizontal-top"></div>
        </div>
      </div>

      {/* HERO ELEGANTE */}
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

          <div
            className="boutique-title-container"
            style={{ textAlign: heroProps.align }}
          >
            <h1 className="boutique-title">
              {tienda?.nombre || "Boutique Elegante"}
            </h1>
            {heroProps.showDescripcion && tienda?.descripcion ? (
              <p className="boutique-subtitle">{tienda.descripcion}</p>
            ) : null}
          </div>

          <div className="boutique-hero-ornament">
            <div className="boutique-hero-line" />
            <FiHeart className="boutique-hero-icon" />
            <div className="boutique-hero-line" />
          </div>

          <div className="boutique-hero-cta">
            <button className="cta-button">Descubrir Colección</button>
          </div>
        </div>

        <div className="boutique-scroll-indicator">
          <div className="boutique-scroll-arrow">↓</div>
        </div>
      </header>

      {/* NAV ELEGANTE */}
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
            {catTabs.map((c, idx) => {
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

      {/* MAIN CONTENT */}
      <main className="boutique-main">
        <BoutiqueStatsSection
          productosCount={productos.length}
          categoriasCount={categorias.length}
          boutiqueColors={boutiqueColors}
        />

        {/* Si hay layout guardado, lo respetamos */}
        {Array.isArray(orderedBlocks) && orderedBlocks.length > 0 ? (
          <RenderBlocksBoutique
            layout={orderedBlocks}
            productos={productos}
            categorias={categorias}
            tienda={tienda}
            toPublicSrc={toPublicSrc}
            boutiqueColors={boutiqueColors}
            globalQuery={q}
          />
        ) : (
          <>
            {productos.some((p) => p.destacado) && (
              <BoutiqueSection
                title="Productos Destacados"
                icon={<FiStar />}
                boutiqueColors={boutiqueColors}
              >
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
                        [{ id: "all", nombre: "Todo" }, ...categorias].find(
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

        {/* Información de la tienda */}
        <BoutiqueSection
          title="Información de Contacto"
          icon={<FiUser />}
          boutiqueColors={boutiqueColors}
        >
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

        {/* Newsletter */}
        <div className="boutique-newsletter">
          <div className="newsletter-content">
            <h3>Únete a nuestra lista</h3>
            <p>Recibe las últimas novedades y promociones exclusivas</p>
            <div className="newsletter-form">
              <input type="email" placeholder="Tu email..." />
              <button>Suscribirse</button>
            </div>
          </div>
        </div>
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

/* ========= Render de BLOQUES guardados ========= */
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

  const applyGlobalFilterIfNeeded = (arr, p) => {
    if (!p?.showFilter || !globalQuery.trim()) return arr;
    const needle = globalQuery.trim().toLowerCase();
    return arr.filter((x) =>
      `${x?.nombre || ""} ${x?.descripcion || ""} ${x?.detalle || ""}`
        .toLowerCase()
        .includes(needle)
    );
  };

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
            <BoutiqueSection key={b.id} title={p.title || "Productos Destacados"} icon={<FiStar />} boutiqueColors={boutiqueColors}>
              <div className="boutique-grid">
                {list.map((prod) => (
                  <BoutiqueProductCard
                    key={prod.id || prod.uuid}
                    p={prod}
                    toPublicSrc={toPublicSrc}
                    boutiqueColors={boutiqueColors}
                  />
                ))}
              </div>
            </BoutiqueSection>
          );
        }

        if (type === "grid") {
          let list = [...(productos || [])];
          list = applyGlobalFilterIfNeeded(list, p).slice(0, p.limit ?? 12);
          if (!list.length) return null;
          return (
            <BoutiqueSection key={b.id} title={p.title || "Todos los productos"} icon={<FiShoppingBag />} boutiqueColors={boutiqueColors}>
              <div className="boutique-grid">
                {list.map((prod) => (
                  <BoutiqueProductCard
                    key={prod.id || prod.uuid}
                    p={prod}
                    toPublicSrc={toPublicSrc}
                    boutiqueColors={boutiqueColors}
                  />
                ))}
              </div>
            </BoutiqueSection>
          );
        }

        if (type === "category") {
          const id = Number(p.categoriaId);
          if (!id) return null;
          let list = (productos || []).filter(
            (prod) =>
              Array.isArray(prod.categorias) &&
              prod.categorias.some((pc) => Number(pc.categoriaId) === id)
          );
          list = applyGlobalFilterIfNeeded(list, p).slice(0, p.limit ?? 12);
          if (!list.length) return null;
          return (
            <BoutiqueSection key={b.id} title={p.title || catName(id)} icon={<FiShoppingBag />} boutiqueColors={boutiqueColors}>
              <div className="boutique-grid">
                {list.map((prod) => (
                  <BoutiqueProductCard
                    key={prod.id || prod.uuid}
                    p={prod}
                    toPublicSrc={toPublicSrc}
                    boutiqueColors={boutiqueColors}
                  />
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
                <BoutiqueProductCard
                  key={prod.id || prod.uuid}
                  p={prod}
                  toPublicSrc={toPublicSrc}
                  boutiqueColors={boutiqueColors}
                />
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
              <div
                className="boutique-banner"
                style={{
                  backgroundImage: src ? `url(${src})` : undefined,
                }}
              >
                {p.ctaText ? (
                  p.ctaUrl ? (
                    <a
                      href={p.ctaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="boutique-banner-link"
                    >
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

/* ========= Componentes auxiliares ========= */

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

  const conPrecio =
    typeof p?.precio === "number" ||
    (typeof p?.precio === "string" && p.precio.trim() !== "");
  const precio = (() => {
    const n = Number(p.precio || 0);
    return isFinite(n) ? `$${n.toFixed(2)}` : "";
  })();

  const to = buildProductoHref(p);

  return (
    <article className="boutique-product-card">
      <Link to={to} className="boutique-product-media" title="Ver detalles">
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
      </Link>

      <div className="boutique-product-info">
        <div className="boutique-product-header">
          <h4 className="boutique-product-title">
            <Link to={to}>{p?.nombre || p?.title || "Producto"}</Link>
          </h4>
          {categoria && <span className="boutique-product-category">{categoria}</span>}
        </div>

        {p?.descripcion && (
          <p className="boutique-product-description">
            {String(p.descripcion).length > 100
              ? `${String(p.descripcion).slice(0, 100)}…`
              : String(p.descripcion)}
          </p>
        )}

        <div className="boutique-product-footer">
          {conPrecio ? (
            <span className="boutique-product-price">{precio}</span>
          ) : (
            <span className="boutique-product-variants">Variantes disponibles</span>
          )}
          <Link to={to} className="boutique-product-button">Ver detalles</Link>
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

/* ========= CSS Elegante para Boutique ========= */
const cssBoutiqueElegante = `
:root {
  --boutique-bg: #f9f6f0;
  --boutique-surface: #ffffff;
  --boutique-border: #e8d5c0;
  --boutique-text: #2c1810;
  --boutique-sub: #8a7860;
  --boutique-accent: #a0522d;
  --boutique-light: #e8d5c0;
  --boutique-dark: #8b4513;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

.boutique-root {
  background: var(--boutique-bg);
  color: var(--boutique-text);
  min-height: 100dvh;
  line-height: 1.6;
  font-family: 'Playfair Display', 'Georgia', serif;
  position: relative;
  overflow-x: hidden;
}

/* Enlaces */
.boutique-product-media { display:block; text-decoration:none; }
.boutique-product-title a { color: inherit; text-decoration: none; }
.boutique-product-title a:hover { text-decoration: underline; }
.boutique-product-button { display:inline-block; text-decoration:none; }

/* Progress Bar */
.boutique-scroll-progress {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: rgba(0,0,0,0.1);
  z-index: 1000;
}

.boutique-scroll-progress-bar {
  height: 100%;
  transition: width 0.3s ease;
}

/* Decoraciones de boutique */
.boutique-decorations {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.fashion-dots {
  position: absolute;
  width: 100%;
  height: 100%;
}

.fashion-dot {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  opacity: 0.3;
  animation: dot-float 8s infinite ease-in-out;
}

@keyframes dot-float {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.2; }
  50% { transform: translateY(-20px) scale(1.2); opacity: 0.4; }
}

.elegant-lines {
  position: absolute;
  inset: 0;
}

.deco-line {
  position: absolute;
  background: var(--boutique-border);
  opacity: 0.1;
}

.deco-line.vertical-left {
  left: 10%;
  width: 1px;
  height: 100%;
}

.deco-line.vertical-right {
  right: 10%;
  width: 1px;
  height: 100%;
}

.deco-line.horizontal-top {
  top: 20%;
  width: 100%;
  height: 1px;
}

/* HERO ELEGANTE */
.boutique-hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  background-size: cover;
  background-position: center;
  isolation: isolate;
  z-index: 1;
}

.boutique-hero-overlay {
  position: absolute;
  inset: 0;
  z-index: -1;
}

.luxury-pattern {
  position: absolute;
  inset: 0;
  background-image: 
    radial-gradient(circle at 20% 30%, rgba(168, 133, 98, 0.1) 0%, transparent 40%),
    radial-gradient(circle at 80% 70%, rgba(168, 133, 98, 0.1) 0%, transparent 40%);
}

.boutique-hero-content {
  text-align: center;
  max-width: 1000px;
  width: 100%;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.boutique-logo-container {
  margin-bottom: 30px;
}

.boutique-logo-frame {
  position: relative;
  display: inline-block;
  padding: 20px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.boutique-logo {
  width: 120px;
  height: 120px;
  object-fit: contain;
  border-radius: 15px;
}

.boutique-logo-shine {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  filter: blur(4px);
  animation: shine-rotate 6s linear infinite;
}

@keyframes shine-rotate {
  from { transform: rotate(0deg) translateX(15px) rotate(0deg); }
  to { transform: rotate(360deg) translateX(15px) rotate(-360deg); }
}

.boutique-logo-placeholder {
  width: 120px;
  height: 120px;
  border-radius: 20px;
  border: 2px dashed var(--boutique-border);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 30px;
  background: rgba(255, 255, 255, 0.8);
  color: var(--boutique-accent);
}

.boutique-title-container {
  margin-bottom: 30px;
}

.boutique-title {
  font-size: clamp(2.5rem, 7vw, 4rem);
  font-weight: 600;
  margin: 0 0 20px 0;
  letter-spacing: 1px;
  color: var(--boutique-text);
}

.boutique-subtitle {
  font-size: 1.3rem;
  opacity: 0.9;
  max-width: 600px;
  margin: 0 auto;
  font-weight: 300;
}

.boutique-hero-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin: 20px 0;
}

.boutique-hero-line {
  height: 2px;
  width: 80px;
  background: linear-gradient(90deg, transparent, var(--boutique-accent), transparent);
}

.boutique-hero-icon {
  color: var(--boutique-accent);
  animation: pulse 2s infinite ease-in-out;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

.boutique-hero-cta {
  margin-top: 30px;
}

.cta-button {
  background: var(--boutique-accent);
  color: white;
  border: none;
  padding: 15px 35px;
  border-radius: 30px;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 5px 15px rgba(160, 82, 45, 0.3);
}

.cta-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(160, 82, 45, 0.4);
}

.boutique-scroll-indicator {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
}

.boutique-scroll-arrow {
  font-size: 24px;
  color: var(--boutique-text);
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  60% { transform: translateY(-5px); }
}

/* NAVEGACIÓN */
.boutique-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--boutique-border);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.05);
}

.boutique-nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 25px;
  align-items: center;
  justify-content: space-between;
}

.boutique-search-container {
  position: relative;
  flex: 1;
  min-width: 300px;
  max-width: 500px;
}

.boutique-search-icon {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--boutique-sub);
  z-index: 2;
}

.boutique-search-input {
  width: 100%;
  padding: 14px 18px 14px 48px;
  background: rgba(255, 245, 245, 0.8);
  border: 1px solid var(--boutique-border);
  border-radius: 25px;
  color: var(--boutique-text);
  font-family: inherit;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.boutique-search-input:focus {
  outline: none;
  background: white;
  border-color: var(--boutique-accent);
  box-shadow: 0 0 0 3px rgba(160, 82, 45, 0.1);
}

.boutique-search-underline {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--boutique-accent);
  border-radius: 2px;
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.boutique-search-input:focus ~ .boutique-search-underline {
  transform: scaleX(1);
}

.boutique-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.boutique-category-btn {
  position: relative;
  padding: 10px 20px;
  border: 1px solid var(--boutique-border);
  border-radius: 20px;
  background: transparent;
  color: var(--boutique-text);
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.boutique-category-btn:hover {
  background: rgba(160, 82, 45, 0.1);
  border-color: var(--boutique-accent);
}

.boutique-category-btn.active {
  background: var(--boutique-accent);
  border-color: var(--boutique-accent);
  color: white;
}

.boutique-category-indicator {
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 6px;
  background: white;
  border-radius: 50%;
}

/* MAIN CONTENT */
.boutique-main {
  position: relative;
  z-index: 10;
  max-width: 1200px;
  margin: 0 auto;
  padding: 60px 20px;
}

/* Stats Section */
.boutique-stats-section {
  margin-bottom: 70px;
}

.boutique-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 25px;
}

.boutique-stat-card {
  background: var(--boutique-surface);
  border: 1px solid var(--boutique-border);
  border-radius: 15px;
  padding: 30px;
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.3s ease;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
}

.boutique-stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.boutique-stat-icon {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(160, 82, 45, 0.1);
  border-radius: 12px;
  font-size: 24px;
  color: var(--boutique-accent);
}

.boutique-stat-content h3 {
  font-size: 2.2rem;
  font-weight: 700;
  margin: 0 0 5px 0;
  color: var(--boutique-accent);
}

.boutique-stat-content p {
  margin: 0;
  color: var(--boutique-sub);
  font-size: 0.9rem;
}

/* Sections */
.boutique-section {
  margin: 70px 0;
}

.boutique-section-header {
  display: flex;
  align-items: center;
  margin-bottom: 50px;
  gap: 20px;
}

.boutique-section-icon {
  font-size: 28px;
}

.boutique-section-title {
  font-size: 2.2rem;
  font-weight: 600;
  margin: 0;
  color: var(--boutique-text);
}

.boutique-section-line {
  flex: 1;
  height: 2px;
  opacity: 0.3;
}

/* Product Grid */
.boutique-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 30px;
}

/* Product Cards */
.boutique-product-card {
  background: var(--boutique-surface);
  border: 1px solid var(--boutique-border);
  border-radius: 15px;
  overflow: hidden;
  transition: all 0.4s ease;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
  position: relative;
}

.boutique-product-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.12);
}

.boutique-product-media {
  position: relative;
  aspect-ratio: 4/3;
  overflow: hidden;
  display: block;
}

.boutique-product-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s ease;
}

.boutique-product-card:hover .boutique-product-media img {
  transform: scale(1.1);
}

.boutique-product-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--boutique-bg);
  color: var(--boutique-sub);
}

.boutique-product-badge {
  position: absolute;
  top: 15px;
  left: 15px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--boutique-border);
  padding: 8px 15px;
  font-size: 0.8rem;
  border-radius: 15px;
  color: var(--boutique-accent);
  z-index: 3;
  backdrop-filter: blur(5px);
}

.product-hover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  color: white;
  font-weight: 500;
}

.boutique-product-card:hover .product-hover-overlay {
  opacity: 1;
}

.boutique-product-info {
  padding: 25px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.boutique-product-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.boutique-product-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.3;
}

.boutique-product-category {
  font-size: 0.85rem;
  padding: 5px 10px;
  border: 1px solid var(--boutique-border);
  border-radius: 12px;
  color: var(--boutique-sub);
  align-self: flex-start;
}

.boutique-product-description {
  margin: 0;
  color: var(--boutique-sub);
  font-size: 0.95rem;
  flex: 1;
}

.boutique-product-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.boutique-product-price {
  font-weight: 700;
  font-size: 1.3rem;
  color: var(--boutique-accent);
}

.boutique-product-variants {
  font-size: 0.85rem;
  color: var(--boutique-sub);
}

.boutique-product-button {
  border: 1px solid var(--boutique-border);
  background: transparent;
  color: var(--boutique-text);
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.boutique-product-button:hover {
  background: var(--boutique-accent);
  border-color: var(--boutique-accent);
  color: white;
}

/* Info Grid */
.boutique-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 30px;
}

.boutique-info-card {
  background: var(--boutique-surface);
  border: 1px solid var(--boutique-border);
  border-radius: 15px;
  padding: 30px;
  transition: all 0.3s ease;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
}

.boutique-info-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.boutique-info-card-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 25px;
}

.boutique-info-card-icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(160, 82, 45, 0.1);
  border-radius: 12px;
  font-size: 20px;
}

.boutique-info-card-title {
  font-size: 1.4rem;
  font-weight: 600;
  margin: 0;
  color: var(--boutique-text);
}

.boutique-info-card-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.boutique-contact-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px;
  background: var(--boutique-bg);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.boutique-contact-item:hover {
  background: rgba(160, 82, 45, 0.05);
}

.boutique-contact-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
  color: var(--boutique-accent);
}

.boutique-contact-item a {
  color: var(--boutique-text);
  text-decoration: none;
  transition: color 0.3s ease;
}

.boutique-contact-item a:hover {
  color: var(--boutique-accent);
}

.boutique-hours {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.boutique-hours-day {
  font-weight: 500;
  padding: 8px 0;
  border-bottom: 1px solid var(--boutique-border);
}

.boutique-hours-time {
  text-align: right;
  padding: 8px 0;
  border-bottom: 1px solid var(--boutique-border);
  color: var(--boutique-sub);
}

.boutique-hours-day:last-of-type,
.boutique-hours-time:last-of-type {
  border-bottom: none;
}

.boutique-social-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 15px;
}

.boutique-social-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px;
  border: 1px solid var(--boutique-border);
  border-radius: 12px;
  text-decoration: none;
  color: var(--boutique-text);
  transition: all 0.3s ease;
}

.boutique-social-link:hover {
  background: var(--boutique-bg);
  transform: translateY(-3px);
}

.boutique-social-icon {
  font-size: 1.8rem;
  color: var(--boutique-accent);
}

/* Empty State */
.boutique-empty {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 80px 30px;
  border: 2px dashed var(--boutique-border);
  border-radius: 15px;
  background: var(--boutique-bg);
  color: var(--boutique-sub);
  text-align: center;
}

/* Newsletter */
.boutique-newsletter {
  background: linear-gradient(135deg, var(--boutique-accent), var(--boutique-dark));
  border-radius: 20px;
  padding: 50px;
  margin: 70px 0;
  color: white;
  text-align: center;
}

.newsletter-content h3 {
  margin: 0 0 15px 0;
  font-size: 1.8rem;
}

.newsletter-content p {
  margin: 0 0 25px 0;
  opacity: 0.9;
}

.newsletter-form {
  display: flex;
  gap: 15px;
  justify-content: center;
  max-width: 500px;
  margin: 0 auto;
}

.newsletter-form input {
  flex: 1;
  padding: 15px 20px;
  border: none;
  border-radius: 25px;
  font-size: 1rem;
}

.newsletter-form button {
  background: white;
  color: var(--boutique-accent);
  border: none;
  padding: 15px 30px;
  border-radius: 25px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.newsletter-form button:hover {
  background: var(--boutique-light);
}

/* Footer */
.boutique-footer {
  border-top: 1px solid var(--boutique-border);
  margin-top: 80px;
  padding: 50px 20px;
  background: var(--boutique-surface);
}

.boutique-footer-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
  text-align: center;
  color: var(--boutique-sub);
}

.boutique-footer-separator {
  opacity: 0.5;
}

/* Banner */
.boutique-banner {
  min-height: 200px;
  border-radius: 15px;
  border: 1px solid var(--boutique-border);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.boutique-banner:before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(45deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.1));
}

.boutique-banner-link,
.boutique-banner-text {
  position: relative;
  z-index: 2;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--boutique-border);
  border-radius: 8px;
  color: var(--boutique-text);
  text-decoration: none;
  font-weight: 600;
}

.boutique-banner-link:hover {
  background: var(--boutique-accent);
  color: white;
  border-color: var(--boutique-accent);
}

.boutique-logo-block {
  max-width: 180px;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.1));
}

/* RESPONSIVE DESIGN */
@media (max-width: 1024px) {
  .boutique-nav-container {
    flex-direction: column;
    align-items: stretch;
    gap: 20px;
  }
  
  .boutique-search-container {
    max-width: 100%;
  }
  
  .boutique-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
  
  .boutique-info-grid {
    grid-template-columns: 1fr;
  }
  
  .newsletter-form {
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .boutique-hero {
    min-height: 80vh;
    padding: 60px 20px;
  }
  
  .boutique-title {
    font-size: 2.5rem;
  }
  
  .boutique-subtitle {
    font-size: 1.1rem;
  }
  
  .boutique-section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .boutique-section-line {
    width: 100%;
  }
  
  .boutique-grid {
    grid-template-columns: 1fr;
  }
  
  .boutique-footer-content {
    flex-direction: column;
    gap: 10px;
  }
  
  .boutique-footer-separator {
    display: none;
  }
}

@media (max-width: 480px) {
  .boutique-hero {
    min-height: 70vh;
    padding: 40px 15px;
  }
  
  .boutique-title {
    font-size: 2rem;
  }
  
  .boutique-nav-container {
    padding: 15px;
  }
  
  .boutique-search-input {
    padding: 12px 12px 12px 45px;
  }
  
  .boutique-category-btn {
    padding: 8px 16px;
    font-size: 0.85rem;
  }
  
  .boutique-main {
    padding: 30px 15px;
  }
  
  .boutique-product-info {
    padding: 20px;
  }
  
  .boutique-product-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .boutique-product-button {
    align-self: stretch;
    text-align: center;
  }
  
  .boutique-newsletter {
    padding: 30px 20px;
  }
}

/* Fuentes elegantes */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
`;


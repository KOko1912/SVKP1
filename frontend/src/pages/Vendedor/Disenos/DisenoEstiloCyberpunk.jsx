// E:\SVKP1\frontend\src\pages\Vendedor\Disenos\DisenoEstiloCyberpunk.jsx
import React, { useMemo, useState, useRef, useEffect, Fragment } from "react";
import { Link } from "react-router-dom";
import { buildProductoHref } from "../../../lib/productHref";
import "./cybrepunk.css";
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
  FiZap,
  FiCpu,
  FiHeart,
  FiTrendingUp,
  FiLayers,
  FiShoppingCart,
} from "react-icons/fi";

/* ===== Props por defecto de los bloques (igual que en editor) ===== */
const DEFAULT_BLOCK_PROPS = {
  hero: { showLogo: true, showDescripcion: true, align: "center" },
  featured: { title: "Destacados", limit: 8 },
  grid: { title: "Todos los productos", limit: 12, showFilter: true },
  category: { title: "", categoriaId: null, limit: 12, showFilter: true },
  product: { productoId: null },
  banner: { title: "Promoción", ctaText: "Ver más", ctaUrl: "" },
  logo: { shape: "rounded", frame: "thin" },
};

/**
 * Diseño Cyberpunk Futurista – respeta el orden/props de ConfiguracionVista
 */
export default function DisenoEstiloCyberpunk({
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

  // === Tema desde colorPrincipal ===
  const { brandFrom, brandTo, brandThird, contrast, glowColor, neonColors } = useMemo(() => {
    const { from, to } = extractColors(
      tienda?.colorPrincipal || "linear-gradient(135deg, #ff00ff, #00ffff, #ffeb3b)"
    );
    const neonPalette = [
      from,
      to,
      "#ff00ff",
      "#00ffff",
      "#ffeb3b",
      "#ff0090",
      "#00ff90",
      "#9d00ff",
      "#ff5500",
    ];
    return {
      brandFrom: from,
      brandTo: to,
      brandThird: neonPalette[2],
      contrast: bestTextOn(from, to),
      glowColor: hexToRgba(from, 0.8),
      neonColors: neonPalette,
    };
  }, [tienda?.colorPrincipal]);

  // === Filtros globales (para grid cuando showFilter = true) ===
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
        const hay = `${p?.nombre || ""} ${p?.descripcion || ""} ${p?.detalle || ""}`.toLowerCase();
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
    () => [{ id: "all", nombre: "Todo" }, ...categoriasSafe(categorias)],
    [categorias]
  );

  // Toma props del primer bloque hero del layout (si existiera)
  const heroBlock = (orderedBlocks || []).find((b) => b?.type === "hero");
  const heroProps = { ...DEFAULT_BLOCK_PROPS.hero, ...(heroBlock?.props || {}) };

  const alignToFlex = (align) =>
    align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

  return (
    <div className="cyberpunk-root" ref={mainRef}>
      {/* Progress Bar */}
      <div className="cyber-scroll-progress">
        <div
          className="cyber-scroll-progress-bar"
          style={{
            width: `${scrollProgress * 100}%`,
            background: `linear-gradient(90deg, ${neonColors[0]}, ${neonColors[1]}, ${neonColors[2]})`,
            boxShadow: `0 0 20px ${glowColor}`,
          }}
        />
      </div>

      {/* BG Effects */}
      <div className="cyber-bg-effects">
        <div className="cyber-grid-overlay" />
        <div className="cyber-scanlines" />
        <div className="cyber-glows">
          {neonColors.map((color, index) => (
            <div
              key={index}
              className="cyber-glow"
              style={{
                backgroundColor: hexToRgba(color, 0.3),
                width: `${100 + index * 50}px`,
                height: `${100 + index * 50}px`,
                top: `${10 + index * 10}%`,
                left: `${index * 15}%`,
                animationDelay: `${index * 0.5}s`,
              }}
            />
          ))}
        </div>
        <div className="cyber-particles" />
      </div>

      {/* HERO */}
      <header
        ref={heroRef}
        className={`cyber-hero ${mounted ? "mounted" : ""}`}
        style={{
          color: contrast,
          backgroundImage: portada
            ? `linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 70%), url(${portada})`
            : `linear-gradient(135deg, ${brandFrom}, ${brandTo}, ${brandThird})`,
        }}
      >
        <div
          className="cyber-hero-overlay"
          style={{
            background: `radial-gradient(circle at 20% 50%, ${hexToRgba(
              neonColors[0],
              0.4
            )} 0%, transparent 40%),
                         radial-gradient(circle at 80% 20%, ${hexToRgba(
                           neonColors[1],
                           0.4
                         )} 0%, transparent 40%),
                         radial-gradient(circle at 40% 80%, ${hexToRgba(
                           neonColors[2],
                           0.4
                         )} 0%, transparent 40%)`,
          }}
        />
        <div
          className="cyber-hero-content"
          style={{
            textAlign: heroProps.align,
            alignItems: alignToFlex(heroProps.align),
            display: "flex",
            flexDirection: "column",
            gap: 16,
            marginInline: "auto",
          }}
        >
          {heroProps.showLogo ? (
            logo ? (
              <div className="cyber-logo-container">
                <div className="cyber-logo-frame">
                  <img className="cyber-logo" src={logo} alt="logo" />
                  <div
                    className="cyber-logo-glow"
                    style={{
                      boxShadow: `0 0 60px 15px ${glowColor},
                                  0 0 100px 30px ${hexToRgba(neonColors[1], 0.4)}`,
                    }}
                  />
                  <div className="cyber-logo-shine" />
                </div>
              </div>
            ) : (
              <div className="cyber-logo-placeholder">
                <FiGrid size={40} />
              </div>
            )
          ) : null}

          <div className="cyber-title-container" style={{ textAlign: heroProps.align }}>
            <h1 className="cyber-title-glitch" data-text={tienda?.nombre || "Mi Tienda"}>
              {tienda?.nombre || "Mi Tienda"}
              <span className="cyber-title-stroke" />
            </h1>
            {heroProps.showDescripcion && tienda?.descripcion ? (
              <p className="cyber-subtitle">{tienda.descripcion}</p>
            ) : null}
          </div>

          <div className="cyber-hero-ornament">
            <div
              className="cyber-hero-line"
              style={{
                background: `linear-gradient(90deg, transparent, ${neonColors[0]}, transparent)`,
              }}
            />
            <FiZap className="cyber-hero-icon" style={{ color: neonColors[1] }} />
            <div
              className="cyber-hero-line"
              style={{
                background: `linear-gradient(90deg, transparent, ${neonColors[2]}, transparent)`,
              }}
            />
          </div>

          <div className="cyber-hero-particles">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="cyber-particle"
                style={{
                  animationDelay: `${i * 0.2}s`,
                  backgroundColor: neonColors[i % neonColors.length],
                  left: `${Math.random() * 100}%`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="cyber-scroll-indicator">
          <div className="cyber-scroll-arrow" />
        </div>
      </header>

      {/* NAV */}
      <nav
        className="cyber-nav"
        style={{
          borderColor: hexToRgba(neonColors[0], 0.4),
          background: `rgba(10, 10, 18, 0.95)`,
          backdropFilter: "blur(15px)",
        }}
      >
        <div className="cyber-nav-container">
          <div className="cyber-search-container">
            <FiSearch className="cyber-search-icon" />
            <input
              type="search"
              placeholder="Buscar productos…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="cyber-search-input"
              style={{
                background: `rgba(0, 0, 0, 0.4)`,
                border: `1px solid ${hexToRgba(neonColors[0], 0.3)}`,
              }}
            />
            <div
              className="cyber-search-underline"
              style={{
                background: `linear-gradient(90deg, ${neonColors[0]}, ${neonColors[1]}, ${neonColors[2]})`,
              }}
            />
          </div>

          <div className="cyber-categories">
            {catTabs.map((c, idx) => {
              const active = String(catId) === String(c.id);
              const colorIndex = idx % neonColors.length;
              return (
                <button
                  key={`${c.id}`}
                  className={`cyber-category-btn ${active ? "active" : ""}`}
                  onClick={() => setCatId(String(c.id))}
                  style={
                    active
                      ? {
                          background: `linear-gradient(135deg, ${hexToRgba(
                            neonColors[colorIndex],
                            0.9
                          )}, ${hexToRgba(neonColors[(colorIndex + 1) % neonColors.length], 0.9)})`,
                          color: "#000",
                          boxShadow: `0 0 20px ${hexToRgba(neonColors[colorIndex], 0.7)}`,
                          transform: "translateY(-2px)",
                        }
                      : {
                          border: `1px solid ${hexToRgba(neonColors[colorIndex], 0.3)}`,
                          boxShadow: `0 0 10px ${hexToRgba(neonColors[colorIndex], 0.1)}`,
                        }
                  }
                  title={c.nombre}
                >
                  <span className="cyber-category-text">{c.nombre}</span>
                  {active && (
                    <div
                      className="cyber-category-glow"
                      style={{
                        boxShadow: `0 0 20px ${hexToRgba(neonColors[colorIndex], 0.7)}`,
                      }}
                    />
                  )}
                  <span className="cyber-category-ping" />
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <main className="cyber-main">
        <CyberStatsSection
          productosCount={productos.length}
          categoriasCount={categorias.length}
          neonColors={neonColors}
        />

        {/* Si hay layout guardado, lo respetamos. Si no, fallback a secciones por defecto */}
        {Array.isArray(orderedBlocks) && orderedBlocks.length > 0 ? (
          <RenderBlocksCyber
            layout={orderedBlocks}
            productos={productos}
            categorias={categoriasSafe(categorias)}
            tienda={tienda}
            toPublicSrc={toPublicSrc}
            neonColors={neonColors}
            glowColor={glowColor}
            globalQuery={q}
          />
        ) : (
          <>
            {productos.some((p) => p.destacado) && (
              <CyberSection
                title="Productos Destacados"
                icon={<FiStar />}
                glowColor={glowColor}
                neonColors={neonColors}
              >
                <div className="cyber-grid">
                  {productos
                    .filter((p) => p.destacado)
                    .slice(0, 12)
                    .map((p) => (
                      <CyberProductCard
                        key={p.id || p.uuid}
                        p={p}
                        toPublicSrc={toPublicSrc}
                        neonColors={neonColors}
                      />
                    ))}
                </div>
              </CyberSection>
            )}

            <CyberSection
              title={
                catId === "all"
                  ? q.trim()
                    ? `Resultados (${filtered.length})`
                    : "Todos los productos"
                  : `${
                      ([{ id: "all", nombre: "Todo" }, ...categoriasSafe(categorias)].find(
                        (x) => String(x.id) === String(catId)
                      ) || { nombre: "Categoría" }).nombre
                    } (${filtered.length})`
              }
              icon={<FiShoppingBag />}
              glowColor={glowColor}
              neonColors={neonColors}
            >
              {filtered.length ? (
                <div className="cyber-grid">
                  {filtered.map((p) => (
                    <CyberProductCard
                      key={p.id || p.uuid}
                      p={p}
                      toPublicSrc={toPublicSrc}
                      neonColors={neonColors}
                    />
                  ))}
                </div>
              ) : (
                <div className="cyber-empty">
                  <FiShoppingBag size={48} />
                  <p>Sin productos para esta búsqueda.</p>
                </div>
              )}
            </CyberSection>
          </>
        )}

        {/* Info tienda */}
        <CyberSection title="Información de Contacto" icon={<FiCpu />} glowColor={glowColor} neonColors={neonColors}>
          <div className="cyber-info-grid">
            <CyberInfoCard title="Contacto Directo" icon={<FiPhone />} neonColors={neonColors}>
              {tienda?.telefonoContacto && (
                <div className="cyber-contact-item">
                  <FiPhone className="cyber-contact-icon" />
                  <a href={`tel:${tienda.telefonoContacto}`}>{tienda.telefonoContacto}</a>
                </div>
              )}
              {tienda?.email && (
                <div className="cyber-contact-item">
                  <FiMail className="cyber-contact-icon" />
                  <a href={`mailto:${tienda.email}`}>{tienda.email}</a>
                </div>
              )}
              {tienda?.ubicacionUrl && (
                <div className="cyber-contact-item">
                  <FiMapPin className="cyber-contact-icon" />
                  <a href={tienda.ubicacionUrl} target="_blank" rel="noreferrer">
                    Ver ubicación <FiExternalLink />
                  </a>
                </div>
              )}
              {tienda?.whatsapp && (
                <div className="cyber-contact-item">
                  <FiMessageCircle className="cyber-contact-icon" />
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`https://wa.me/${String(tienda.whatsapp).replace(/[^0-9]/g, "")}`}
                  >
                    WhatsApp
                  </a>
                </div>
              )}
            </CyberInfoCard>

            <CyberInfoCard title="Horario de Atención" icon={<FiClock />} neonColors={neonColors}>
              <CyberHours horario={tienda?.horario} neonColors={neonColors} />
            </CyberInfoCard>

            <CyberInfoCard title="Síguenos en Redes" icon={<FiHeart />} neonColors={neonColors}>
              <div className="cyber-social-grid">
                {tienda?.redes?.facebook && (
                  <a className="cyber-social-link" href={tienda.redes.facebook} target="_blank" rel="noreferrer">
                    <FiFacebook className="cyber-social-icon" />
                    <span>Facebook</span>
                  </a>
                )}
                {tienda?.redes?.instagram && (
                  <a className="cyber-social-link" href={tienda.redes.instagram} target="_blank" rel="noreferrer">
                    <FiInstagram className="cyber-social-icon" />
                    <span>Instagram</span>
                  </a>
                )}
                {tienda?.redes?.tiktok && (
                  <a className="cyber-social-link" href={tienda.redes.tiktok} target="_blank" rel="noreferrer">
                    <FiYoutube className="cyber-social-icon" />
                    <span>TikTok</span>
                  </a>
                )}
              </div>
            </CyberInfoCard>
          </div>
        </CyberSection>
      </main>

      <footer className="cyber-footer">
        <div className="cyber-footer-content">
          <span>© {new Date().getFullYear()} {tienda?.nombre || "Mi Tienda"}</span>
          <div className="cyber-footer-dot" />
          <span>Cyberpunk Futurist Evolution</span>
        </div>
        <div className="cyber-footer-decoration">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="cyber-footer-particle"
              style={{
                animationDelay: `${i * 0.5}s`,
                backgroundColor: neonColors[i % neonColors.length],
              }}
            />
          ))}
        </div>
      </footer>
    </div>
  );
}

/* ========= Render de BLOQUES guardados ========= */
function RenderBlocksCyber({
  layout = [],
  productos = [],
  categorias = [],
  tienda,
  toPublicSrc,
  neonColors,
  glowColor,
  globalQuery = "",
}) {
  const catName = (id) =>
    categorias.find((c) => Number(c.id) === Number(id))?.nombre || "Categoría";

  const applyGlobalFilterIfNeeded = (arr, p) => {
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

        if (type === "hero") return null; // hero ya está arriba

        if (type === "featured") {
          const list = (productos || []).filter((x) => x.destacado).slice(0, p.limit ?? 8);
          if (!list.length) return null;
          return (
            <CyberSection key={b.id} title={p.title || "Destacados"} icon={<FiStar />} glowColor={glowColor} neonColors={neonColors}>
              <div className="cyber-grid">
                {list.map((prod) => (
                  <CyberProductCard key={prod.id || prod.uuid} p={prod} toPublicSrc={toPublicSrc} neonColors={neonColors} />
                ))}
              </div>
            </CyberSection>
          );
        }

        if (type === "grid") {
          let list = [...(productos || [])];
          list = applyGlobalFilterIfNeeded(list, p).slice(0, p.limit ?? 12);
          if (!list.length) return null;
          return (
            <CyberSection key={b.id} title={p.title || "Todos los productos"} icon={<FiShoppingBag />} glowColor={glowColor} neonColors={neonColors}>
              <div className="cyber-grid">
                {list.map((prod) => (
                  <CyberProductCard key={prod.id || prod.uuid} p={prod} toPublicSrc={toPublicSrc} neonColors={neonColors} />
                ))}
              </div>
            </CyberSection>
          );
        }

        if (type === "category") {
          const id = Number(p.categoriaId);
          if (!id) return null;
          let list = (productos || []).filter(
            (prod) => Array.isArray(prod.categorias) && prod.categorias.some((pc) => Number(pc.categoriaId) === id)
          );
          list = applyGlobalFilterIfNeeded(list, p).slice(0, p.limit ?? 12);
          if (!list.length) return null;
          return (
            <CyberSection key={b.id} title={p.title || catName(id)} icon={<FiShoppingBag />} glowColor={glowColor} neonColors={neonColors}>
              <div className="cyber-grid">
                {list.map((prod) => (
                  <CyberProductCard key={prod.id || prod.uuid} p={prod} toPublicSrc={toPublicSrc} neonColors={neonColors} />
                ))}
              </div>
            </CyberSection>
          );
        }

        if (type === "product") {
          const id = Number(p.productoId);
          if (!id) return null;
          const prod = (productos || []).find((x) => Number(x.id) === id);
          if (!prod) return null;
          return (
            <CyberSection key={b.id} title={prod.nombre || "Producto"} icon={<FiShoppingBag />} glowColor={glowColor} neonColors={neonColors}>
              <div className="cyber-grid">
                <CyberProductCard key={prod.id || prod.uuid} p={prod} toPublicSrc={toPublicSrc} neonColors={neonColors} />
              </div>
            </CyberSection>
          );
        }

        if (type === "banner") {
          const src = toPublicSrc?.(tienda?.bannerPromoUrl);
          return (
            <section key={b.id} className="cyber-section">
              <div className="cyber-section-header">
                <div className="cyber-section-icon" style={{ color: neonColors[0] }}>
                  <FiLayers />
                </div>
                <h2 className="cyber-section-title">{p.title || "Promoción"}</h2>
                <div
                  className="cyber-section-line"
                  style={{
                    background: `linear-gradient(90deg, ${neonColors[0]}, ${neonColors[1]})`,
                    boxShadow: `0 0 10px ${hexToRgba(neonColors[0], 0.6)}`,
                  }}
                />
              </div>
              <div
                className="pv-banner"
                style={{
                  backgroundImage: src ? `url(${src})` : undefined,
                  minHeight: 180,
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.15)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {p.ctaText ? (
                  p.ctaUrl ? (
                    <a
                      href={p.ctaUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#fff", textDecoration: "underline", fontWeight: 600 }}
                    >
                      {p.ctaText}
                    </a>
                  ) : (
                    <em style={{ color: "#fff", fontStyle: "normal", fontWeight: 600 }}>{p.ctaText}</em>
                  )
                ) : null}
              </div>
            </section>
          );
        }

        if (type === "logo") {
          const src = toPublicSrc?.(tienda?.logo?.url || tienda?.logoUrl);
          return (
            <section key={b.id} className="cyber-section" style={{ display: "grid", placeItems: "center" }}>
              {src ? (
                <img
                  src={src}
                  alt="logo"
                  style={{ maxWidth: 180, filter: "drop-shadow(0 0 12px rgba(255,255,255,.2))" }}
                />
              ) : null}
            </section>
          );
        }

        return null;
      })}
    </>
  );
}

/* ========= Componentes auxiliares ========= */

function CyberStatsSection({ productosCount, categoriasCount, neonColors }) {
  return (
    <section className="cyber-stats-section">
      <div className="cyber-stats-grid">
        <div className="cyber-stat-card" style={{ "--neon-color": neonColors[0] }}>
          <div className="cyber-stat-icon">
            <FiShoppingCart />
          </div>
          <div className="cyber-stat-content">
            <h3>{productosCount}</h3>
            <p>Productos Totales</p>
          </div>
          <div className="cyber-stat-glow" />
        </div>
        <div className="cyber-stat-card" style={{ "--neon-color": neonColors[1] }}>
          <div className="cyber-stat-icon">
            <FiLayers />
          </div>
          <div className="cyber-stat-content">
            <h3>{categoriasCount}</h3>
            <p>Categorías</p>
          </div>
          <div className="cyber-stat-glow" />
        </div>
        <div className="cyber-stat-card" style={{ "--neon-color": neonColors[2] }}>
          <div className="cyber-stat-icon">
            <FiTrendingUp />
          </div>
          <div className="cyber-stat-content">
            <h3>100%</h3>
            <p>Calidad Garantizada</p>
          </div>
          <div className="cyber-stat-glow" />
        </div>
      </div>
    </section>
  );
}

function CyberSection({ title, icon, children, glowColor, neonColors }) {
  return (
    <section className="cyber-section">
      <div className="cyber-section-header">
        <div className="cyber-section-icon" style={{ color: neonColors[0] }}>
          {icon}
        </div>
        <h2 className="cyber-section-title">{title}</h2>
        <div
          className="cyber-section-line"
          style={{
            background: `linear-gradient(90deg, ${neonColors[0]}, ${neonColors[1]})`,
            boxShadow: `0 0 10px ${glowColor}`,
          }}
        />
      </div>
      {children}
    </section>
  );
}

function CyberInfoCard({ title, icon, children, neonColors }) {
  return (
    <div className="cyber-info-card">
      <div className="cyber-info-card-header">
        <div className="cyber-info-card-icon" style={{ color: neonColors[0] }}>
          {icon}
        </div>
        <h3 className="cyber-info-card-title">{title}</h3>
      </div>
      <div className="cyber-info-card-content">{children}</div>
      <div
        className="cyber-info-card-glow"
        style={{ background: `linear-gradient(90deg, ${neonColors[0]}, ${neonColors[1]})` }}
      />
    </div>
  );
}

function CyberProductCard({ p = {}, toPublicSrc, neonColors }) {
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

  const colorIndex = Math.floor(Math.random() * (neonColors.length - 1));
  const to = buildProductoHref(p); // ← RUTA ABSOLUTA VÁLIDA

  const Media = ({ children }) =>
    to ? (
      <Link to={to} className="cyber-product-media" title="Ver detalles">
        {children}
      </Link>
    ) : (
      <div className="cyber-product-media">{children}</div>
    );

  return (
    <article className="cyber-product-card" style={{ "--neon-color": neonColors[colorIndex] }}>
      <div className="cyber-product-glow" />
      <div className="cyber-product-inner">
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
                       <rect width='100%' height='100%' fill='#0b0f18'/>
                       <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#94a3b8' font-family='sans-serif' font-size='16'>Sin imagen</text>
                     </svg>`
                  );
              }}
            />
          ) : (
            <div className="cyber-product-placeholder">
              <FiShoppingBag size={32} />
            </div>
          )}
          {p.destacado && (
            <span className="cyber-product-badge">
              <FiStar size={14} /> Destacado
            </span>
          )}
        </Media>

        <div className="cyber-product-info">
          <div className="cyber-product-header">
            <h4 className="cyber-product-title">
              {to ? (
                <Link to={to} style={{ color: "inherit", textDecoration: "none" }}>
                  {p?.nombre || p?.title || "Producto"}
                </Link>
              ) : (
                <span>{p?.nombre || p?.title || "Producto"}</span>
              )}
            </h4>
            {categoria && <span className="cyber-product-category">{categoria}</span>}
          </div>

          {p?.descripcion && (
            <p className="cyber-product-description">
              {String(p.descripcion).length > 100
                ? `${String(p.descripcion).slice(0, 100)}…`
                : String(p.descripcion)}
            </p>
          )}

          <div className="cyber-product-footer">
            {conPrecio ? (
              <span className="cyber-product-price">{precio}</span>
            ) : (
              <span className="cyber-product-variants">Con variantes</span>
            )}
            {to && <Link to={to} className="cyber-product-button">Ver detalles</Link>}
          </div>
        </div>
      </div>
    </article>
  );
}

function CyberHours({ horario = {}, neonColors }) {
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
    <div className="cyber-hours">
      {dias.map((d) => (
        <Fragment key={d.id}>
          <span className="cyber-hours-day">{d.label}</span>
          <span className="cyber-hours-time">{horario?.[d.id] || "Cerrado"}</span>
        </Fragment>
      ))}
    </div>
  );
}

/* ========= Utils ========= */
function categoriasSafe(c) {
  return Array.isArray(c) ? c : [];
}
function extractColors(gradientString) {
  const m = gradientString?.match(/#([0-9a-f]{6})/gi);
  return { from: m?.[0] || "#ff00ff", to: m?.[1] || "#00ffff" };
}
function hexToRgb(hex) {
  const m = hex?.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}
function hexToRgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function luminance([r, g, b]) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function bestTextOn(hexA, hexB) {
  const L = (luminance(hexToRgb(hexA)) + luminance(hexToRgb(hexB))) / 2;
  return L > 0.45 ? "#0b1220" : "#ffffff";
}

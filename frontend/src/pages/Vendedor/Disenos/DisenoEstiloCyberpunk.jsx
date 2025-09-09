// E:\SVKP1\frontend\src\pages\Vendedor\Disenos\DisenoEstiloCyberpunk.jsx
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
  const { brandFrom, brandTo, brandThird, contrast, glowColor, neonColors } =
    useMemo(() => {
      const { from, to } = extractColors(
        tienda?.colorPrincipal ||
          "linear-gradient(135deg, #ff00ff, #00ffff, #ffeb3b)"
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

  // Toma props del primer bloque hero del layout (si existiera)
  const heroBlock = (orderedBlocks || []).find((b) => b?.type === "hero");
  const heroProps = { ...DEFAULT_BLOCK_PROPS.hero, ...(heroBlock?.props || {}) };

  const alignToFlex = (align) =>
    align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

  return (
    <div className="cyberpunk-root" ref={mainRef}>
      {/* Estilos embebidos */}
      <style>{cssCyberpunkFuturista}</style>

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
                                  0 0 100px 30px ${hexToRgba(
                                    neonColors[1],
                                    0.4
                                  )}`,
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

          <div
            className="cyber-title-container"
            style={{ textAlign: heroProps.align }}
          >
            <h1
              className="cyber-title-glitch"
              data-text={tienda?.nombre || "Mi Tienda"}
            >
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
            <FiZap
              className="cyber-hero-icon"
              style={{ color: neonColors[1] }}
            />
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
                          )}, ${hexToRgba(
                            neonColors[(colorIndex + 1) % neonColors.length],
                            0.9
                          )})`,
                          color: "#000",
                          boxShadow: `0 0 20px ${hexToRgba(
                            neonColors[colorIndex],
                            0.7
                          )}`,
                          transform: "translateY(-2px)",
                        }
                      : {
                          border: `1px solid ${hexToRgba(
                            neonColors[colorIndex],
                            0.3
                          )}`,
                          boxShadow: `0 0 10px ${hexToRgba(
                            neonColors[colorIndex],
                            0.1
                          )}`,
                        }
                  }
                  title={c.nombre}
                >
                  <span className="cyber-category-text">{c.nombre}</span>
                  {active && (
                    <div
                      className="cyber-category-glow"
                      style={{
                        boxShadow: `0 0 20px ${hexToRgba(
                          neonColors[colorIndex],
                          0.7
                        )}`,
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
            categorias={categororiasSafe(categorias)}
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
                      (
                        [{ id: "all", nombre: "Todo" }, ...categorias].find(
                          (x) => String(x.id) === String(catId)
                        ) || { nombre: "Categoría" }
                      ).nombre
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
        <CyberSection
          title="Información de Contacto"
          icon={<FiCpu />}
          glowColor={glowColor}
          neonColors={neonColors}
        >
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

        if (type === "hero") return null; // hero ya está arriba

        if (type === "featured") {
          const list = (productos || []).filter((x) => x.destacado).slice(0, p.limit ?? 8);
          if (!list.length) return null;
          return (
            <CyberSection key={b.id} title={p.title || "Destacados"} icon={<FiStar />} glowColor={glowColor} neonColors={neonColors}>
              <div className="cyber-grid">
                {list.map((prod) => (
                  <CyberProductCard
                    key={prod.id || prod.uuid}
                    p={prod}
                    toPublicSrc={toPublicSrc}
                    neonColors={neonColors}
                  />
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
                  <CyberProductCard
                    key={prod.id || prod.uuid}
                    p={prod}
                    toPublicSrc={toPublicSrc}
                    neonColors={neonColors}
                  />
                ))}
              </div>
            </CyberSection>
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
            <CyberSection key={b.id} title={p.title || catName(id)} icon={<FiShoppingBag />} glowColor={glowColor} neonColors={neonColors}>
              <div className="cyber-grid">
                {list.map((prod) => (
                  <CyberProductCard
                    key={prod.id || prod.uuid}
                    p={prod}
                    toPublicSrc={toPublicSrc}
                    neonColors={neonColors}
                  />
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
                <CyberProductCard
                  key={prod.id || prod.uuid}
                  p={prod}
                  toPublicSrc={toPublicSrc}
                  neonColors={neonColors}
                />
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
              {src ? <img src={src} alt="logo" style={{ maxWidth: 180, filter: "drop-shadow(0 0 12px rgba(255,255,255,.2))" }} /> : null}
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
          <div className="cyber-stat-icon"><FiShoppingCart /></div>
          <div className="cyber-stat-content">
            <h3>{productosCount}</h3>
            <p>Productos Totales</p>
          </div>
          <div className="cyber-stat-glow" />
        </div>
        <div className="cyber-stat-card" style={{ "--neon-color": neonColors[1] }}>
          <div className="cyber-stat-icon"><FiLayers /></div>
          <div className="cyber-stat-content">
            <h3>{categoriasCount}</h3>
            <p>Categorías</p>
          </div>
          <div className="cyber-stat-glow" />
        </div>
        <div className="cyber-stat-card" style={{ "--neon-color": neonColors[2] }}>
          <div className="cyber-stat-icon"><FiTrendingUp /></div>
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
        <div className="cyber-section-icon" style={{ color: neonColors[0] }}>{icon}</div>
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
        <div className="cyber-info-card-icon" style={{ color: neonColors[0] }}>{icon}</div>
        <h3 className="cyber-info-card-title">{title}</h3>
      </div>
      <div className="cyber-info-card-content">{children}</div>
      <div className="cyber-info-card-glow" style={{ background: `linear-gradient(90deg, ${neonColors[0]}, ${neonColors[1]})` }} />
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
            <div className="cyber-product-placeholder"><FiShoppingBag size={32} /></div>
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
function categororiasSafe(c) {
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

/* ========= CSS ========= */
const cssCyberpunkFuturista = `
:root {
  --cyber-bg: #0a0a12;
  --cyber-surface: rgba(18, 18, 30, 0.9);
  --cyber-border: rgba(100, 108, 255, 0.4);
  --cyber-text: #e0e0ff;
  --cyber-sub: #a0a0d0;
  --cyber-accent: #00e5ff;
  --cyber-glow: rgba(0, 229, 255, 0.8);
  --cyber-grid: rgba(0, 229, 255, 0.15);
  --neon-color: #ff00ff;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

.cyberpunk-root {
  background: var(--cyber-bg);
  color: var(--cyber-text);
  min-height: 100dvh;
  line-height: 1.6;
  font-family: 'Rajdhani', 'Orbitron', 'Exo 2', sans-serif;
  position: relative;
  overflow-x: hidden;
}

/* Enlaces dentro de las cards */
.cyber-product-media { display:block; text-decoration:none; }
.cyber-product-title a { color: inherit; text-decoration: none; }
.cyber-product-title a:hover { text-decoration: underline; }
.cyber-product-button { display:inline-block; text-decoration:none; }

/* Scroll Progress */
.cyber-scroll-progress { position: fixed; top: 0; left: 0; width: 100%; height: 4px; background: rgba(0, 0, 0, 0.2); z-index: 1000; }
.cyber-scroll-progress-bar { height: 100%; transition: width 0.3s ease; }

/* Efectos de fondo futuristas */
.cyber-bg-effects { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.cyber-grid-overlay { position: absolute; width: 100%; height: 100%; background-image: 
  linear-gradient(var(--cyber-grid) 1px, transparent 1px),
  linear-gradient(90deg, var(--cyber-grid) 1px, transparent 1px);
  background-size: 50px 50px; opacity: 0.25; animation: grid-move 30s infinite linear; }
@keyframes grid-move { 0% { background-position: 0 0; } 100% { background-position: 50px 50px; } }
.cyber-scanlines { position: absolute; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(255,255,255,0.03) 50%, transparent 50%); background-size: 100% 4px; opacity: 0.15; animation: scanline 6s linear infinite; }
@keyframes scanline { 0% { background-position: 0 0; } 100% { background-position: 0 100%; } }
.cyber-glows { position: absolute; width: 100%; height: 100%; }
.cyber-glow { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.2; animation: glow-pulse 8s ease-in-out infinite alternate; }
@keyframes glow-pulse { 0%, 100% { opacity: 0.1; transform: scale(1) rotate(0deg); } 50% { opacity: 0.3; transform: scale(1.2) rotate(180deg); } }
.cyber-particles { position: absolute; width: 100%; height: 100%; }
.cyber-particles::before { content: ''; position: absolute; width: 100%; height: 100%; background-image: 
  radial-gradient(2px 2px at 20px 30px, #f0f, rgba(0,0,0,0)),
  radial-gradient(2px 2px at 40px 70px, #0ff, rgba(0,0,0,0)),
  radial-gradient(2px 2px at 60px 10px, #ff0, rgba(0,0,0,0)),
  radial-gradient(2px 2px at 80px 50px, #f0f, rgba(0,0,0,0)),
  radial-gradient(2px 2px at 100px 80px, #0ff, rgba(0,0,0,0)),
  radial-gradient(2px 2px at 120px 20px, #ff0, rgba(0,0,0,0)),
  radial-gradient(2px 2px at 140px 60px, #f0f, rgba(0,0,0,0)),
  radial-gradient(2px 2px at 160px 40px, #0ff, rgba(0,0,0,0)),
  radial-gradient(2px 2px at 180px 70px, #ff0, rgba(0,0,0,0)),
  radial-gradient(2px 2px at 200px 30px, #f0f, rgba(0,0,0,0));
  background-repeat: repeat; background-size: 200px 100px; animation: particles-move 20s linear infinite; }
@keyframes particles-move { from { transform: translateY(0px); } to { transform: translateY(100px); } }

/* HERO */
.cyber-hero { position: relative; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 80px 20px; background-size: cover; background-position: center; overflow: hidden; isolation:isolate; z-index:1; }
.cyber-hero-overlay { position: absolute; inset: 0; z-index: -1; }
.cyber-hero-content { text-align: center; max-width: 1200px; width: 100%; z-index: 2; }
.cyber-logo-container { position: relative; display: inline-block; margin-bottom: 40px; }
.cyber-logo-frame { position: relative; display: inline-block; padding: 15px; border-radius: 25px; background: rgba(0, 0, 0, 0.5); border: 2px solid rgba(255,255,255,0.1); box-shadow: 0 0 50px rgba(0,0,0,0.5); }
.cyber-logo { width: 120px; height: 120px; object-fit: contain; border-radius: 20px; position: relative; z-index: 2; filter: drop-shadow(0 0 10px rgba(255,255,255,0.5)); }
.cyber-logo-glow { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 160px; height: 160px; border-radius: 50%; z-index: 1; animation: logo-glow 3s ease-in-out infinite alternate; }
@keyframes logo-glow { 0% { opacity:.6; transform: translate(-50%,-50%) scale(1);} 100% { opacity:.8; transform: translate(-50%,-50%) scale(1.1);} }
.cyber-logo-shine { position: absolute; top:-10px; right:-10px; width:30px; height:30px; background:#fff; border-radius:50%; filter:blur(5px); animation: shine-rotate 5s linear infinite; }
@keyframes shine-rotate { from { transform: rotate(0deg) translateX(20px) rotate(0deg);} to { transform: rotate(360deg) translateX(20px) rotate(-360deg);} }
.cyber-logo-placeholder { width:120px; height:120px; border-radius:20px; border:3px dashed rgba(255,255,255,.3); display:flex; align-items:center; justify-content:center; margin:0 auto 40px; background: rgba(0,0,0,.3); }
.cyber-title-container { margin-bottom: 40px; }
.cyber-title-glitch { font-size: clamp(3rem, 8vw, 5rem); font-weight:800; text-transform:uppercase; letter-spacing:4px; margin:0 0 20px 0; position:relative; text-shadow:0 0 20px currentColor; font-family:'Orbitron', sans-serif; }
.cyber-title-glitch::before, .cyber-title-glitch::after { content: attr(data-text); position:absolute; top:0; left:0; width:100%; height:100%; opacity:.8; z-index:-1; }
.cyber-title-glitch::before { animation: glitch-effect 2.5s infinite; color:#f0f; clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%); }
.cyber-title-glitch::after  { animation: glitch-effect 1.5s infinite; color:#0ff; clip-path: polygon(0 60%, 100% 60%, 100% 100%, 0 100%); }
@keyframes glitch-effect { 0%{transform:translate(0);} 20%{transform:translate(-5px,5px);} 40%{transform:translate(-5px,-5px);} 60%{transform:translate(5px,5px);} 80%{transform:translate(5px,-5px);} 100%{transform:translate(0);} }
.cyber-title-stroke { position:absolute; inset:0; color:transparent; -webkit-text-stroke:1px rgba(255,255,255,.5); z-index:-2; }
.cyber-subtitle { font-size:1.4rem; opacity:.9; max-width:700px; margin:0 auto; text-shadow:0 0 10px rgba(0,0,0,.5); }
.cyber-hero-ornament { display:flex; align-items:center; justify-content:center; gap:25px; margin-top:40px; }
.cyber-hero-line { height:3px; width:150px; border-radius:3px; }
.cyber-hero-icon { animation:pulse 2s ease-in-out infinite; filter: drop-shadow(0 0 5px currentColor); }
@keyframes pulse { 0%,100%{transform:scale(1); opacity:1;} 50%{transform:scale(1.2); opacity:.8;} }
.cyber-hero-particles { position:absolute; inset:0; pointer-events:none; }
.cyber-particle { position:absolute; width:4px; height:4px; border-radius:50%; animation: particle-float 10s infinite linear; filter: drop-shadow(0 0 2px currentColor); }
@keyframes particle-float { 0%{ transform: translateY(100vh) rotate(0deg); opacity:0;} 10%{opacity:1;} 90%{opacity:1;} 100%{ transform: translateY(-100px) rotate(360deg); opacity:0;} }
.cyber-scroll-indicator { position:absolute; bottom:30px; left:50%; transform:translateX(-50%); }
.cyber-scroll-arrow { width:20px; height:20px; border-right:3px solid var(--cyber-text); border-bottom:3px solid var(--cyber-text); transform: rotate(45deg); animation: scroll-bounce 2s infinite; }
@keyframes scroll-bounce { 0%,20%,50%,80%,100%{ transform: rotate(45deg) translateY(0);} 40%{ transform: rotate(45deg) translateY(-10px);} 60%{ transform: rotate(45deg) translateY(-5px);} }

/* NAVIGATION */
.cyber-nav { position: sticky; top: 0; z-index: 100; border-bottom:1px solid; background: rgba(10,10,18,.97); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
.cyber-nav-container { max-width:1400px; margin:0 auto; padding:20px; display:flex; flex-wrap:wrap; gap:25px; align-items:center; justify-content:space-between; }
.cyber-search-container { position:relative; flex:1; min-width:280px; max-width:500px; }
.cyber-search-icon { position:absolute; left:15px; top:50%; transform:translateY(-50%); color:var(--cyber-sub); z-index:2; }
.cyber-search-input { width:100%; padding:15px 15px 15px 45px; background:rgba(0,0,0,.4); border:1px solid; border-radius:10px; color:var(--cyber-text); font-family:inherit; font-size:1rem; transition:all .3s ease; position:relative; z-index:1; }
.cyber-search-input:focus { outline:none; box-shadow:0 0 15px var(--cyber-glow); }
.cyber-search-underline { position:absolute; bottom:0; left:0; width:100%; height:2px; border-radius:2px; transform:scaleX(0); transition: transform .3s ease; }
.cyber-search-input:focus ~ .cyber-search-underline { transform:scaleX(1); }
.cyber-categories { display:flex; flex-wrap:wrap; gap:12px; }
.cyber-category-btn { position:relative; padding:10px 20px; border:1px solid; border-radius:25px; background:rgba(255,255,255,.05); color:var(--cyber-text); font-family:inherit; font-size:.9rem; cursor:pointer; transition:all .3s ease; overflow:hidden; }
.cyber-category-btn:hover { transform:translateY(-2px); box-shadow:0 5px 15px rgba(0,0,0,.3); }
.cyber-category-btn.active { border-color:transparent; font-weight:600; }
.cyber-category-glow { position:absolute; inset:0; border-radius:25px; opacity:.7; animation:pulse 2s infinite; }
.cyber-category-ping { position:absolute; top:-5px; right:-5px; width:12px; height:12px; border-radius:50%; background: var(--neon-color); animation: ping 1.5s infinite; }
@keyframes ping { 0% { transform: scale(.5); opacity:.8;} 100% { transform: scale(2); opacity:0;} }

/* MAIN */
.cyber-main { position:relative; z-index:10; max-width:1400px; margin:0 auto; padding:50px 20px; }

/* Stats */
.cyber-stats-section { margin-bottom:70px; }
.cyber-stats-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(250px,1fr)); gap:25px; }
.cyber-stat-card { position:relative; background:var(--cyber-surface); border:1px solid var(--cyber-border); border-radius:15px; padding:30px; display:flex; align-items:center; gap:20px; overflow:hidden; transition:all .3s ease; }
.cyber-stat-card:hover { transform: translateY(-5px); box-shadow:0 10px 30px rgba(0,0,0,.4); }
.cyber-stat-icon { width:60px; height:60px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.3); border-radius:12px; font-size:24px; color: var(--neon-color); }
.cyber-stat-content h3 { font-size:2.2rem; font-weight:700; margin:0 0 5px 0; background: linear-gradient(135deg, var(--neon-color), #fff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.cyber-stat-content p { margin:0; color:var(--cyber-sub); font-size:.9rem; }
.cyber-stat-glow { position:absolute; inset:0; background: linear-gradient(45deg, var(--neon-color), transparent); opacity:0; transition:opacity .3s ease; z-index:-1; }
.cyber-stat-card:hover .cyber-stat-glow { opacity:.1; }

/* Section */
.cyber-section { margin-bottom:80px; }
.cyber-section-header { display:flex; align-items:center; margin-bottom:40px; gap:20px; }
.cyber-section-icon { font-size:28px; }
.cyber-section-title { font-size:2.2rem; font-weight:700; text-transform:uppercase; letter-spacing:2px; margin:0; background: linear-gradient(135deg, var(--neon-color), #fff); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.cyber-section-line { flex:1; height:3px; border-radius:3px; }

/* Grid */
.cyber-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:30px; }

/* Product Card */
.cyber-product-card { position:relative; border-radius:20px; overflow:hidden; background:var(--cyber-surface); border:1px solid var(--cyber-border); transition: all .4s ease; --neon-color: #ff00ff; }
.cyber-product-card:hover { transform: translateY(-10px) rotate3d(1,0,0,10deg); box-shadow:0 20px 40px rgba(0,0,0,.5); }
.cyber-product-glow { position:absolute; inset:0; border-radius:20px; opacity:0; transition:opacity .4s ease; background: radial-gradient(circle at center, var(--neon-color), transparent 70%); }
.cyber-product-card:hover .cyber-product-glow { opacity:.3; }
.cyber-product-inner { position:relative; z-index:2; display:flex; flex-direction:column; height:100%; }
.cyber-product-media { position:relative; aspect-ratio:4/3; background:rgba(255,255,255,.03); overflow:hidden; }
.cyber-product-media img { width:100%; height:100%; object-fit:cover; transition: transform .6s ease; }
.cyber-product-card:hover .cyber-product-media img { transform: scale(1.1); }
.cyber-product-placeholder { width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:var(--cyber-sub); }
.cyber-product-badge { position:absolute; top:15px; left:15px; display:inline-flex; align-items:center; gap:8px; background:rgba(0,0,0,.7); border:1px solid var(--cyber-border); padding:8px 15px; font-size:.8rem; border-radius:20px; color:var(--neon-color); backdrop-filter: blur(5px); z-index:3; }
.cyber-product-info { padding:25px; display:flex; flex-direction:column; flex:1; gap:15px; }
.cyber-product-header { display:flex; flex-direction:column; gap:10px; }
.cyber-product-title { font-size:1.2rem; font-weight:600; margin:0; line-height:1.3; }
.cyber-product-category { font-size:.85rem; padding:5px 10px; border:1px solid var(--cyber-border); border-radius:15px; color:var(--cyber-sub); align-self:flex-start; }
.cyber-product-description { margin:0; color:var(--cyber-sub); font-size:.95rem; flex:1; }
.cyber-product-footer { display:flex; align-items:center; justify-content:space-between; }
.cyber-product-price { font-weight:700; font-size:1.3rem; color: var(--neon-color); text-shadow:0 0 5px rgba(0,0,0,.5); }
.cyber-product-variants { font-size:.85rem; color:var(--cyber-sub); }
.cyber-product-button { border:1px solid var(--cyber-border); background:rgba(255,255,255,.05); color:var(--cyber-text); padding:10px 18px; border-radius:8px; cursor:pointer; font-family:inherit; transition:all .3s ease; position:relative; overflow:hidden; }
.cyber-product-button::before { content:''; position:absolute; top:0; left:-100%; width:100%; height:100%; background: linear-gradient(90deg, transparent, var(--neon-color), transparent); transition:left .5s ease; }
.cyber-product-button:hover { background:rgba(255,255,255,.1); box-shadow:0 0 15px var(--cyber-glow); }
.cyber-product-button:hover::before { left:100%; }

/* Info */
.cyber-info-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap:30px; }
.cyber-info-card { background:var(--cyber-surface); border:1px solid var(--cyber-border); border-radius:20px; padding:30px; position:relative; overflow:hidden; transition:all .3s ease; }
.cyber-info-card:hover { transform: translateY(-5px); box-shadow:0 15px 35px rgba(0,0,0,.4); }
.cyber-info-card-header { display:flex; align-items:center; gap:15px; margin-bottom:25px; }
.cyber-info-card-icon { width:50px; height:50px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.3); border-radius:12px; font-size:20px; }
.cyber-info-card-title { font-size:1.4rem; font-weight:600; margin:0; background: linear-gradient(135deg, var(--neon-color), #fff); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.cyber-info-card-content { display:flex; flex-direction:column; gap:18px; }
.cyber-contact-item { display:flex; align-items:center; gap:15px; padding:12px; background:rgba(0,0,0,.2); border-radius:10px; transition:all .3s ease; }
.cyber-contact-item:hover { background:rgba(0,0,0,.3); transform: translateX(5px); }
.cyber-contact-icon { font-size:1.2rem; flex-shrink:0; }
.cyber-contact-item a { color:var(--cyber-text); text-decoration:none; transition:color .3s ease; }
.cyber-contact-item a:hover { color: var(--neon-color); }
.cyber-hours { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.cyber-hours-day { font-weight:500; padding:8px 0; border-bottom:1px solid rgba(255,255,255,.1); }
.cyber-hours-time { text-align:right; padding:8px 0; border-bottom:1px solid rgba(255,255,255,.1); color:var(--cyber-sub); }
.cyber-hours-day:last-of-type, .cyber-hours-time:last-of-type { border-bottom:none; }
.cyber-social-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:15px; }
.cyber-social-link { display:flex; flex-direction:column; align-items:center; gap:10px; padding:20px; border:1px solid var(--cyber-border); border-radius:12px; text-decoration:none; color:var(--cyber-text); transition:all .3s ease; position:relative; overflow:hidden; }
.cyber-social-link::before { content:''; position:absolute; inset:0; background: linear-gradient(45deg, var(--neon-color), transparent); opacity:0; transition:opacity .3s ease; z-index:-1; }
.cyber-social-link:hover { transform: translateY(-5px); box-shadow:0 10px 25px rgba(0,0,0,.3); }
.cyber-social-link:hover::before { opacity:.1; }
.cyber-social-icon { font-size:1.8rem; }
.cyber-info-card-glow { position:absolute; top:0; left:0; width:100%; height:3px; opacity:.7; }

.cyber-empty { grid-column:1/-1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px; padding:80px 30px; border:2px dashed var(--cyber-border); border-radius:20px; background:rgba(255,255,255,.02); color:var(--cyber-sub); text-align:center; }

/* FOOTER */
.cyber-footer { border-top:1px solid var(--cyber-border); margin-top:100px; padding:50px 20px; background: rgba(10,10,15,.9); position:relative; }
.cyber-footer-content { max-width:1200px; margin:0 auto; display:flex; align-items:center; justify-content:center; gap:20px; flex-wrap:wrap; text-align:center; }
.cyber-footer-dot { width:6px; height:6px; border-radius:50%; background:var(--cyber-sub); }
.cyber-footer-decoration { position:absolute; bottom:0; left:0; width:100%; height:30px; display:flex; justify-content:space-around; }
.cyber-footer-particle { width:3px; height:3px; border-radius:50%; animation: footer-particle 3s infinite ease-in-out; }
@keyframes footer-particle { 0%,100%{ transform: translateY(0); opacity:.3;} 50%{ transform: translateY(-15px); opacity:1;} }

/* RESPONSIVE */
@media (max-width:1024px){
  .cyber-nav-container { flex-direction:column; align-items:stretch; gap:20px; }
  .cyber-search-container { max-width:100%; }
  .cyber-stats-grid { grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); }
  .cyber-grid { grid-template-columns: repeat(auto-fill, minmax(250px,1fr)); }
  .cyber-info-grid { grid-template-columns:1fr; }
}
@media (max-width:768px){
  .cyber-hero { min-height:80vh; padding:60px 15px; }
  .cyber-logo, .cyber-logo-placeholder { width:100px; height:100px; }
  .cyber-title-glitch { font-size:2.5rem; }
  .cyber-subtitle { font-size:1.1rem; }
  .cyber-categories { justify-content:center; }
  .cyber-stats-grid { grid-template-columns:1fr; }
  .cyber-section-title { font-size:1.8rem; }
  .cyber-footer-content { flex-direction:column; gap:10px; }
  .cyber-footer-dot { display:none; }
}
@media (max-width:480px){
  .cyber-hero { min-height:70vh; padding:40px 10px; }
  .cyber-title-glitch { font-size:2rem; letter-spacing:2px; }
  .cyber-nav-container { padding:15px; }
  .cyber-search-input { padding:12px 12px 12px 40px; }
  .cyber-category-btn { padding:8px 16px; font-size:.8rem; }
  .cyber-main { padding:30px 15px; }
  .cyber-grid { grid-template-columns:1fr; }
  .cyber-section-header { flex-direction:column; align-items:flex-start; gap:10px; }
  .cyber-section-line { width:100%; }
  .cyber-product-info { padding:20px; }
  .cyber-product-footer { flex-direction:column; align-items:flex-start; gap:15px; }
  .cyber-product-button { align-self:stretch; text-align:center; }
}
`;

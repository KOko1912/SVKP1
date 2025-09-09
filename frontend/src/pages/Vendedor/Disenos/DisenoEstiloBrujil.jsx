// E:\SVKP1\frontend\src\pages\Vendedor\Disenos\DisenoEstiloBrujil.jsx
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
  FiMoon,
  FiCoffee,
  FiBookOpen,
  FiFeather
} from "react-icons/fi";

/* ===== Props por defecto de los bloques (igual que en editor) ===== */
const DEFAULT_BLOCK_PROPS = {
  hero: { showLogo: true, showDescripcion: true, align: "center" },
  featured: { title: "Productos Embrujados", limit: 8 },
  grid: { title: "Todos los productos", limit: 12, showFilter: true },
  category: { title: "", categoriaId: null, limit: 12, showFilter: true },
  product: { productoId: null },
  banner: { title: "Hechizo Especial", ctaText: "Descubrir", ctaUrl: "" },
  logo: { shape: "rounded", frame: "thin" },
};

/**
 * Diseño Halloween Brujería – respeta el orden/props de ConfiguracionVista
 */
export default function DisenoEstiloBrujil({
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
  const { halloweenColors, glowColor, contrast } = useMemo(() => {
    const halloweenPalette = ["#8A2BE2", "#FF8C00", "#FF4500", "#4B0082", "#800020", "#228B22", "#000000"];
    return {
      halloweenColors: halloweenPalette,
      glowColor: "rgba(255, 140, 0, 0.6)",
      contrast: "#FFF8E1",
    };
  }, []);

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
    <div className="halloween-root" ref={mainRef}>
      {/* Estilos embebidos */}
      <style>{cssHalloweenBrujeria}</style>

      {/* Progress Bar */}
      <div className="halloween-scroll-progress">
        <div
          className="halloween-scroll-progress-bar"
          style={{
            width: `${scrollProgress * 100}%`,
            background: `linear-gradient(90deg, ${halloweenColors[0]}, ${halloweenColors[1]}, ${halloweenColors[2]})`,
            boxShadow: `0 0 20px ${glowColor}`,
          }}
        />
      </div>

      {/* BG Effects */}
      <div className="halloween-bg-effects">
        <div className="halloween-moon">
          <div className="halloween-moon-crater"></div>
          <div className="halloween-moon-crater"></div>
          <div className="halloween-moon-crater"></div>
        </div>
        <div className="halloween-bats">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="halloween-bat" style={{
              animationDelay: `${i * 1.5}s`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}>🦇</div>
          ))}
        </div>
        <div className="halloween-candles">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="halloween-candle" style={{
              left: `${10 + i * 20}%`,
              animationDelay: `${i * 0.7}s`,
            }}>
              <div className="halloween-candle-flame"></div>
            </div>
          ))}
        </div>
      </div>

      {/* HERO */}
      <header
        ref={heroRef}
        className={`halloween-hero ${mounted ? "mounted" : ""}`}
        style={{
          color: contrast,
          backgroundImage: portada
            ? `linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 70%), url(${portada})`
            : `linear-gradient(135deg, ${halloweenColors[0]}, ${halloweenColors[1]}, ${halloweenColors[2]})`,
        }}
      >
        <div
          className="halloween-hero-overlay"
          style={{
            background: `radial-gradient(circle at 20% 50%, rgba(138, 43, 226, 0.4) 0%, transparent 40%),
                        radial-gradient(circle at 80% 20%, rgba(255, 140, 0, 0.4) 0%, transparent 40%),
                        radial-gradient(circle at 40% 80%, rgba(75, 0, 130, 0.4) 0%, transparent 40%)`,
          }}
        />
        
        <div className="halloween-cauldron">
          <div className="halloween-cauldron-bubble"></div>
          <div className="halloween-cauldron-bubble"></div>
          <div className="halloween-cauldron-bubble"></div>
          <div className="halloween-cauldron-steam"></div>
        </div>
        
        <div
          className="halloween-hero-content"
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
              <div className="halloween-logo-container">
                <div className="halloween-logo-frame">
                  <img className="halloween-logo" src={logo} alt="logo" />
                  <div
                    className="halloween-logo-glow"
                    style={{
                      boxShadow: `0 0 60px 15px ${glowColor},
                                  0 0 100px 30px rgba(138, 43, 226, 0.4)`,
                    }}
                  />
                  <div className="halloween-logo-shine" />
                </div>
              </div>
            ) : (
              <div className="halloween-logo-placeholder">
                <FiMoon size={40} />
              </div>
            )
          ) : null}

          <div
            className="halloween-title-container"
            style={{ textAlign: heroProps.align }}
          >
            <h1
              className="halloween-title-spooky"
              data-text={tienda?.nombre || "Tienda Embrujada"}
            >
              {tienda?.nombre || "Tienda Embrujada"}
              <span className="halloween-title-shadow" />
            </h1>
            {heroProps.showDescripcion && tienda?.descripcion ? (
              <p className="halloween-subtitle">{tienda.descripcion}</p>
            ) : null}
          </div>

          <div className="halloween-hero-ornament">
            <div
              className="halloween-hero-line"
              style={{
                background: `linear-gradient(90deg, transparent, ${halloweenColors[0]}, transparent)`,
              }}
            />
            <FiMoon
              className="halloween-hero-icon"
              style={{ color: halloweenColors[1] }}
            />
            <div
              className="halloween-hero-line"
              style={{
                background: `linear-gradient(90deg, transparent, ${halloweenColors[2]}, transparent)`,
              }}
            />
          </div>

          <div className="halloween-hero-potions">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="halloween-potion"
                style={{
                  animationDelay: `${i * 0.5}s`,
                  backgroundColor: halloweenColors[i % halloweenColors.length],
                  left: `${Math.random() * 100}%`,
                }}
              >
                <div className="halloween-potion-label">{i+1}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="halloween-scroll-indicator">
          <div className="halloween-scroll-broom">🧹</div>
        </div>
      </header>

      {/* NAV */}
      <nav
        className="halloween-nav"
        style={{
          borderColor: "rgba(138, 43, 226, 0.4)",
          background: `rgba(20, 10, 15, 0.95)`,
          backdropFilter: "blur(15px)",
        }}
      >
        <div className="halloween-nav-container">
          <div className="halloween-search-container">
            <FiSearch className="halloween-search-icon" />
            <input
              type="search"
              placeholder="Buscar en el grimorio…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="halloween-search-input"
              style={{
                background: `rgba(0, 0, 0, 0.4)`,
                border: `1px solid rgba(138, 43, 226, 0.3)`,
              }}
            />
            <div
              className="halloween-search-underline"
              style={{
                background: `linear-gradient(90deg, ${halloweenColors[0]}, ${halloweenColors[1]}, ${halloweenColors[2]})`,
              }}
            />
          </div>

          <div className="halloween-categories">
            {catTabs.map((c, idx) => {
              const active = String(catId) === String(c.id);
              const colorIndex = idx % halloweenColors.length;
              return (
                <button
                  key={`${c.id}`}
                  className={`halloween-category-btn ${active ? "active" : ""}`}
                  onClick={() => setCatId(String(c.id))}
                  style={
                    active
                      ? {
                          background: `linear-gradient(135deg, rgba(${hexToRgb(halloweenColors[colorIndex]).join(',')}, 0.9), rgba(${hexToRgb(halloweenColors[(colorIndex + 1) % halloweenColors.length]).join(',')}, 0.9))`,
                          color: "#000",
                          boxShadow: `0 0 20px rgba(${hexToRgb(halloweenColors[colorIndex]).join(',')}, 0.7)`,
                          transform: "translateY(-2px)",
                        }
                      : {
                          border: `1px solid rgba(${hexToRgb(halloweenColors[colorIndex]).join(',')}, 0.3)`,
                          boxShadow: `0 0 10px rgba(${hexToRgb(halloweenColors[colorIndex]).join(',')}, 0.1)`,
                        }
                  }
                  title={c.nombre}
                >
                  <span className="halloween-category-text">{c.nombre}</span>
                  {active && (
                    <div
                      className="halloween-category-glow"
                      style={{
                        boxShadow: `0 0 20px rgba(${hexToRgb(halloweenColors[colorIndex]).join(',')}, 0.7)`,
                      }}
                    />
                  )}
                  <span className="halloween-category-ping" />
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <main className="halloween-main">
        <HalloweenStatsSection
          productosCount={productos.length}
          categoriasCount={categorias.length}
          halloweenColors={halloweenColors}
        />

        {/* Si hay layout guardado, lo respetamos. Si no, fallback a secciones por defecto */}
        {Array.isArray(orderedBlocks) && orderedBlocks.length > 0 ? (
          <RenderBlocksHalloween
            layout={orderedBlocks}
            productos={productos}
            categorias={categororiasSafe(categorias)}
            tienda={tienda}
            toPublicSrc={toPublicSrc}
            halloweenColors={halloweenColors}
            glowColor={glowColor}
            globalQuery={q}
          />
        ) : (
          <>
            {productos.some((p) => p.destacado) && (
              <HalloweenSection
                title="Productos Embrujados"
                icon={<FiStar />}
                glowColor={glowColor}
                halloweenColors={halloweenColors}
              >
                <div className="halloween-grid">
                  {productos
                    .filter((p) => p.destacado)
                    .slice(0, 12)
                    .map((p) => (
                      <HalloweenProductCard
                        key={p.id || p.uuid}
                        p={p}
                        toPublicSrc={toPublicSrc}
                        halloweenColors={halloweenColors}
                      />
                    ))}
                </div>
              </HalloweenSection>
            )}

            <HalloweenSection
              title={
                catId === "all"
                  ? q.trim()
                    ? `Hechizos encontrados (${filtered.length})`
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
              halloweenColors={halloweenColors}
            >
              {filtered.length ? (
                <div className="halloween-grid">
                  {filtered.map((p) => (
                    <HalloweenProductCard
                      key={p.id || p.uuid}
                      p={p}
                      toPublicSrc={toPublicSrc}
                      halloweenColors={halloweenColors}
                    />
                  ))}
                </div>
              ) : (
                <div className="halloween-empty">
                  <FiShoppingBag size={48} />
                  <p>No se encontraron hechizos para esta búsqueda.</p>
                </div>
              )}
            </HalloweenSection>
          </>
        )}

        {/* Info tienda */}
        <HalloweenSection
          title="Información del Aquelarre"
          icon={<FiBookOpen />}
          glowColor={glowColor}
          halloweenColors={halloweenColors}
        >
          <div className="halloween-info-grid">
            <HalloweenInfoCard title="Contacto Mágico" icon={<FiPhone />} halloweenColors={halloweenColors}>
              {tienda?.telefonoContacto && (
                <div className="halloween-contact-item">
                  <FiPhone className="halloween-contact-icon" />
                  <a href={`tel:${tienda.telefonoContacto}`}>{tienda.telefonoContacto}</a>
                </div>
              )}
              {tienda?.email && (
                <div className="halloween-contact-item">
                  <FiMail className="halloween-contact-icon" />
                  <a href={`mailto:${tienda.email}`}>{tienda.email}</a>
                </div>
              )}
              {tienda?.ubicacionUrl && (
                <div className="halloween-contact-item">
                  <FiMapPin className="halloween-contact-icon" />
                  <a href={tienda.ubicacionUrl} target="_blank" rel="noreferrer">
                    Ver ubicación <FiExternalLink />
                  </a>
                </div>
              )}
              {tienda?.whatsapp && (
                <div className="halloween-contact-item">
                  <FiMessageCircle className="halloween-contact-icon" />
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`https://wa.me/${String(tienda.whatsapp).replace(/[^0-9]/g, "")}`}
                  >
                    WhatsApp
                  </a>
                </div>
              )}
            </HalloweenInfoCard>

            <HalloweenInfoCard title="Horario del Coven" icon={<FiClock />} halloweenColors={halloweenColors}>
              <HalloweenHours horario={tienda?.horario} halloweenColors={halloweenColors} />
            </HalloweenInfoCard>

            <HalloweenInfoCard title="Síguenos en el Bosque" icon={<FiHeart />} halloweenColors={halloweenColors}>
              <div className="halloween-social-grid">
                {tienda?.redes?.facebook && (
                  <a className="halloween-social-link" href={tienda.redes.facebook} target="_blank" rel="noreferrer">
                    <FiFacebook className="halloween-social-icon" />
                    <span>Facebook</span>
                  </a>
                )}
                {tienda?.redes?.instagram && (
                  <a className="halloween-social-link" href={tienda.redes.instagram} target="_blank" rel="noreferrer">
                    <FiInstagram className="halloween-social-icon" />
                    <span>Instagram</span>
                  </a>
                )}
                {tienda?.redes?.tiktok && (
                  <a className="halloween-social-link" href={tienda.redes.tiktok} target="_blank" rel="noreferrer">
                    <FiYoutube className="halloween-social-icon" />
                    <span>TikTok</span>
                  </a>
                )}
              </div>
            </HalloweenInfoCard>
          </div>
        </HalloweenSection>
      </main>

      <footer className="halloween-footer">
        <div className="halloween-footer-content">
          <span>© {new Date().getFullYear()} {tienda?.nombre || "Tienda Embrujada"}</span>
          <div className="halloween-footer-dot" />
          <span>Elaborado con ingredientes mágicos</span>
        </div>
        <div className="halloween-footer-decoration">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="halloween-footer-spider"
              style={{
                animationDelay: `${i * 0.5}s`,
                color: halloweenColors[i % halloweenColors.length],
              }}
            >
              🕷️
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}

/* ========= Render de BLOQUES guardados ========= */
function RenderBlocksHalloween({
  layout = [],
  productos = [],
  categorias = [],
  tienda,
  toPublicSrc,
  halloweenColors,
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
            <HalloweenSection key={b.id} title={p.title || "Productos Embrujados"} icon={<FiStar />} glowColor={glowColor} halloweenColors={halloweenColors}>
              <div className="halloween-grid">
                {list.map((prod) => (
                  <HalloweenProductCard
                    key={prod.id || prod.uuid}
                    p={prod}
                    toPublicSrc={toPublicSrc}
                    halloweenColors={halloweenColors}
                  />
                ))}
              </div>
            </HalloweenSection>
          );
        }

        if (type === "grid") {
          let list = [...(productos || [])];
          list = applyGlobalFilterIfNeeded(list, p).slice(0, p.limit ?? 12);
          if (!list.length) return null;
          return (
            <HalloweenSection key={b.id} title={p.title || "Todos los productos"} icon={<FiShoppingBag />} glowColor={glowColor} halloweenColors={halloweenColors}>
              <div className="halloween-grid">
                {list.map((prod) => (
                  <HalloweenProductCard
                    key={prod.id || prod.uuid}
                    p={prod}
                    toPublicSrc={toPublicSrc}
                    halloweenColors={halloweenColors}
                  />
                ))}
              </div>
            </HalloweenSection>
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
            <HalloweenSection key={b.id} title={p.title || catName(id)} icon={<FiShoppingBag />} glowColor={glowColor} halloweenColors={halloweenColors}>
              <div className="halloween-grid">
                {list.map((prod) => (
                  <HalloweenProductCard
                    key={prod.id || prod.uuid}
                    p={prod}
                    toPublicSrc={toPublicSrc}
                    halloweenColors={halloweenColors}
                  />
                ))}
              </div>
            </HalloweenSection>
          );
        }

        if (type === "product") {
          const id = Number(p.productoId);
          if (!id) return null;
          const prod = (productos || []).find((x) => Number(x.id) === id);
          if (!prod) return null;
          return (
            <HalloweenSection key={b.id} title={prod.nombre || "Producto"} icon={<FiShoppingBag />} glowColor={glowColor} halloweenColors={halloweenColors}>
              <div className="halloween-grid">
                <HalloweenProductCard
                  key={prod.id || prod.uuid}
                  p={prod}
                  toPublicSrc={toPublicSrc}
                  halloweenColors={halloweenColors}
                />
              </div>
            </HalloweenSection>
          );
        }

        if (type === "banner") {
          const src = toPublicSrc?.(tienda?.bannerPromoUrl);
          return (
            <section key={b.id} className="halloween-section">
              <div className="halloween-section-header">
                <div className="halloween-section-icon" style={{ color: halloweenColors[0] }}>
                  <FiLayers />
                </div>
                <h2 className="halloween-section-title">{p.title || "Hechizo Especial"}</h2>
                <div
                  className="halloween-section-line"
                  style={{
                    background: `linear-gradient(90deg, ${halloweenColors[0]}, ${halloweenColors[1]})`,
                    boxShadow: `0 0 10px rgba(${hexToRgb(halloweenColors[0]).join(',')}, 0.6)`,
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
            <section key={b.id} className="halloween-section" style={{ display: "grid", placeItems: "center" }}>
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

function HalloweenStatsSection({ productosCount, categoriasCount, halloweenColors }) {
  return (
    <section className="halloween-stats-section">
      <div className="halloween-stats-grid">
        <div className="halloween-stat-card" style={{ "--halloween-color": halloweenColors[0] }}>
          <div className="halloween-stat-icon"><FiShoppingCart /></div>
          <div className="halloween-stat-content">
            <h3>{productosCount}</h3>
            <p>Hechizos Disponibles</p>
          </div>
          <div className="halloween-stat-glow" />
        </div>
        <div className="halloween-stat-card" style={{ "--halloween-color": halloweenColors[1] }}>
          <div className="halloween-stat-icon"><FiLayers /></div>
          <div className="halloween-stat-content">
            <h3>{categoriasCount}</h3>
            <p>Categorías Mágicas</p>
          </div>
          <div className="halloween-stat-glow" />
        </div>
        <div className="halloween-stat-card" style={{ "--halloween-color": halloweenColors[2] }}>
          <div className="halloween-stat-icon"><FiTrendingUp /></div>
          <div className="halloween-stat-content">
            <h3>100%</h3>
            <p>Magia Garantizada</p>
          </div>
          <div className="halloween-stat-glow" />
        </div>
      </div>
    </section>
  );
}

function HalloweenSection({ title, icon, children, glowColor, halloweenColors }) {
  return (
    <section className="halloween-section">
      <div className="halloween-section-header">
        <div className="halloween-section-icon" style={{ color: halloweenColors[0] }}>{icon}</div>
        <h2 className="halloween-section-title">{title}</h2>
        <div
          className="halloween-section-line"
          style={{
            background: `linear-gradient(90deg, ${halloweenColors[0]}, ${halloweenColors[1]})`,
            boxShadow: `0 0 10px ${glowColor}`,
          }}
        />
      </div>
      {children}
    </section>
  );
}

function HalloweenInfoCard({ title, icon, children, halloweenColors }) {
  return (
    <div className="halloween-info-card">
      <div className="halloween-info-card-header">
        <div className="halloween-info-card-icon" style={{ color: halloweenColors[0] }}>{icon}</div>
        <h3 className="halloween-info-card-title">{title}</h3>
      </div>
      <div className="halloween-info-card-content">{children}</div>
      <div className="halloween-info-card-glow" style={{ background: `linear-gradient(90deg, ${halloweenColors[0]}, ${halloweenColors[1]})` }} />
    </div>
  );
}

function HalloweenProductCard({ p = {}, toPublicSrc, halloweenColors }) {
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

  const colorIndex = Math.floor(Math.random() * (halloweenColors.length - 1));
  const to = buildProductoHref(p); // ← RUTA ABSOLUTA VÁLIDA

  const Media = ({ children }) =>
    to ? (
      <Link to={to} className="halloween-product-media" title="Ver detalles">
        {children}
      </Link>
    ) : (
      <div className="halloween-product-media">{children}</div>
    );

  return (
    <article className="halloween-product-card" style={{ "--halloween-color": halloweenColors[colorIndex] }}>
      <div className="halloween-product-glow" />
      <div className="halloween-product-cauldron-decoration">🧙‍♀️</div>
      <div className="halloween-product-inner">
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
                       <rect width='100%' height='100%' fill='#1a1020'/>
                       <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#94a3b8' font-family='sans-serif' font-size='16'>Sin imagen</text>
                     </svg>`
                  );
              }}
            />
          ) : (
            <div className="halloween-product-placeholder"><FiShoppingBag size={32} /></div>
          )}
          {p.destacado && (
            <span className="halloween-product-badge">
              <FiStar size={14} /> Embrujado
            </span>
          )}
        </Media>

        <div className="halloween-product-info">
          <div className="halloween-product-header">
            <h4 className="halloween-product-title">
              {to ? (
                <Link to={to} style={{ color: "inherit", textDecoration: "none" }}>
                  {p?.nombre || p?.title || "Hechizo"}
                </Link>
              ) : (
                <span>{p?.nombre || p?.title || "Hechizo"}</span>
              )}
            </h4>
            {categoria && <span className="halloween-product-category">{categoria}</span>}
          </div>

          {p?.descripcion && (
            <p className="halloween-product-description">
              {String(p.descripcion).length > 100
                ? `${String(p.descripcion).slice(0, 100)}…`
                : String(p.descripcion)}
            </p>
          )}

          <div className="halloween-product-footer">
            {conPrecio ? (
              <span className="halloween-product-price">{precio}</span>
            ) : (
              <span className="halloween-product-variants">Con variantes</span>
            )}
            {to && <Link to={to} className="halloween-product-button">Ver detalles</Link>}
          </div>
        </div>
      </div>
    </article>
  );
}

function HalloweenHours({ horario = {}, halloweenColors }) {
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
    <div className="halloween-hours">
      {dias.map((d) => (
        <Fragment key={d.id}>
          <span className="halloween-hours-day">{d.label}</span>
          <span className="halloween-hours-time">{horario?.[d.id] || "Cerrado"}</span>
        </Fragment>
      ))}
    </div>
  );
}

/* ========= Utils ========= */
function categororiasSafe(c) {
  return Array.isArray(c) ? c : [];
}
function hexToRgb(hex) {
  const m = hex?.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

/* ========= CSS ========= */
const cssHalloweenBrujeria = `
:root {
  --halloween-bg: #1a1020;
  --halloween-surface: rgba(35, 15, 30, 0.9);
  --halloween-border: rgba(138, 43, 226, 0.4);
  --halloween-text: #FFF8E1;
  --halloween-sub: #C9AFFF;
  --halloween-accent: #FF8C00;
  --halloween-glow: rgba(255, 140, 0, 0.6);
  --halloween-grid: rgba(138, 43, 226, 0.15);
  --halloween-color: #8A2BE2;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

.halloween-root {
  background: var(--halloween-bg);
  color: var(--halloween-text);
  min-height: 100dvh;
  line-height: 1.6;
  font-family: 'Cinzel', 'Cormorant Garamond', serif;
  position: relative;
  overflow-x: hidden;
}

/* Enlaces dentro de las cards */
.halloween-product-media { display:block; text-decoration:none; }
.halloween-product-title a { color: inherit; text-decoration: none; }
.halloween-product-title a:hover { text-decoration: underline; }
.halloween-product-button { display:inline-block; text-decoration:none; }

/* Scroll Progress */
.halloween-scroll-progress { position: fixed; top: 0; left: 0; width: 100%; height: 4px; background: rgba(0, 0, 0, 0.2); z-index: 1000; }
.halloween-scroll-progress-bar { height: 100%; transition: width 0.3s ease; }

/* Efectos de fondo de Halloween */
.halloween-bg-effects { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }

.halloween-moon {
  position: absolute;
  top: 50px;
  right: 50px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #FFF8E1;
  box-shadow: 0 0 60px #FFF8E1, 0 0 100px rgba(255, 248, 225, 0.5);
  animation: moon-glow 8s infinite alternate;
}

.halloween-moon-crater {
  position: absolute;
  background: #D9D0B8;
  border-radius: 50%;
}

.halloween-moon-crater:nth-child(1) {
  width: 20px;
  height: 20px;
  top: 25px;
  left: 25px;
}

.halloween-moon-crater:nth-child(2) {
  width: 15px;
  height: 15px;
  top: 50px;
  left: 60px;
}

.halloween-moon-crater:nth-child(3) {
  width: 25px;
  height: 25px;
  top: 65px;
  left: 30px;
}

@keyframes moon-glow {
  0% { box-shadow: 0 0 60px #FFF8E1, 0 0 100px rgba(255, 248, 225, 0.5); }
  100% { box-shadow: 0 0 80px #FFF8E1, 0 0 120px rgba(255, 248, 225, 0.7); }
}

.halloween-bats {
  position: absolute;
  width: 100%;
  height: 100%;
}

.halloween-bat {
  position: absolute;
  font-size: 24px;
  animation: bat-fly 15s infinite linear;
  opacity: 0.7;
}

@keyframes bat-fly {
  0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translate(-100px, -100px) rotate(360deg); opacity: 0; }
}

.halloween-candles {
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 50px;
}

.halloween-candle {
  position: absolute;
  width: 10px;
  height: 30px;
  background: linear-gradient(to top, #8B4513, #A0522D, #8B4513);
  border-radius: 2px;
  animation: candle-flicker 3s infinite alternate;
}

.halloween-candle-flame {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  width: 8px;
  height: 15px;
  background: linear-gradient(to top, #FF8C00, #FF4500, #FFD700);
  border-radius: 50% 50% 20% 20%;
  filter: blur(1px);
  animation: flame-flicker 1s infinite alternate;
}

@keyframes candle-flicker {
  0%, 100% { opacity: 0.9; }
  50% { opacity: 1; }
}

@keyframes flame-flicker {
  0%, 100% { height: 12px; width: 6px; }
  50% { height: 15px; width: 8px; }
}

/* HERO */
.halloween-hero { 
  position: relative; 
  min-height: 100vh; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  padding: 80px 20px; 
  background-size: cover; 
  background-position: center; 
  overflow: hidden; 
  isolation:isolate; 
  z-index:1; 
}

.halloween-hero-overlay { 
  position: absolute; 
  inset: 0; 
  z-index: -1; 
}

.halloween-cauldron {
  position: absolute;
  bottom: 50px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 80px;
  background: #2C2C2C;
  border-radius: 50% 50% 40% 40%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
  z-index: 1;
}

.halloween-cauldron::before {
  content: '';
  position: absolute;
  top: -10px;
  left: -10px;
  right: -10px;
  height: 20px;
  background: #1A1A1A;
  border-radius: 50%;
}

.halloween-cauldron-bubble {
  position: absolute;
  background: rgba(138, 43, 226, 0.7);
  border-radius: 50%;
  animation: bubble-rise 4s infinite;
}

.halloween-cauldron-bubble:nth-child(1) {
  width: 15px;
  height: 15px;
  bottom: 20px;
  left: 30px;
  animation-delay: 0s;
}

.halloween-cauldron-bubble:nth-child(2) {
  width: 10px;
  height: 10px;
  bottom: 15px;
  left: 70px;
  animation-delay: 1s;
}

.halloween-cauldron-bubble:nth-child(3) {
  width: 8px;
  height: 8px;
  bottom: 25px;
  left: 50px;
  animation-delay: 2s;
}

.halloween-cauldron-steam {
  position: absolute;
  width: 40px;
  height: 60px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  filter: blur(5px);
  animation: steam-rise 6s infinite;
}

@keyframes bubble-rise {
  0% { transform: translateY(0); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(-100px); opacity: 0; }
}

@keyframes steam-rise {
  0% { transform: translateX(-50%) scale(0.8); opacity: 0; height: 60px; }
  50% { opacity: 0.3; height: 80px; }
  100% { transform: translateX(-50%) translateY(-50px) scale(1.2); opacity: 0; height: 100px; }
}

.halloween-hero-content { 
  text-align: center; 
  max-width: 1200px; 
  width: 100%; 
  z-index: 2; 
}

.halloween-logo-container { 
  position: relative; 
  display: inline-block; 
  margin-bottom: 40px; 
}

.halloween-logo-frame { 
  position: relative; 
  display: inline-block; 
  padding: 15px; 
  border-radius: 25px; 
  background: rgba(0, 0, 0, 0.5); 
  border: 2px solid rgba(138, 43, 226, 0.3); 
  box-shadow: 0 0 50px rgba(0,0,0,0.5); 
}

.halloween-logo { 
  width: 120px; 
  height: 120px; 
  object-fit: contain; 
  border-radius: 20px; 
  position: relative; 
  z-index: 2; 
  filter: drop-shadow(0 0 10px rgba(138, 43, 226, 0.5)); 
}

.halloween-logo-glow { 
  position: absolute; 
  top: 50%; 
  left: 50%; 
  transform: translate(-50%,-50%); 
  width: 160px; 
  height: 160px; 
  border-radius: 50%; 
  z-index: 1; 
  animation: halloween-logo-glow 3s ease-in-out infinite alternate; 
}

@keyframes halloween-logo-glow { 
  0% { opacity:.6; transform: translate(-50%,-50%) scale(1);} 
  100% { opacity:.8; transform: translate(-50%,-50%) scale(1.1);} 
}

.halloween-logo-shine { 
  position: absolute; 
  top:-10px; 
  right:-10px; 
  width:30px; 
  height:30px; 
  background:#fff; 
  border-radius:50%; 
  filter:blur(5px); 
  animation: halloween-shine-rotate 5s linear infinite; 
}

@keyframes halloween-shine-rotate { 
  from { transform: rotate(0deg) translateX(20px) rotate(0deg);} 
  to { transform: rotate(360deg) translateX(20px) rotate(-360deg);} 
}

.halloween-logo-placeholder { 
  width:120px; 
  height:120px; 
  border-radius:20px; 
  border:3px dashed rgba(138, 43, 226, 0.5); 
  display:flex; 
  align-items:center; 
  justify-content:center; 
  margin:0 auto 40px; 
  background: rgba(0,0,0,.3); 
}

.halloween-title-container { 
  margin-bottom: 40px; 
}

.halloween-title-spooky { 
  font-size: clamp(3rem, 8vw, 5rem); 
  font-weight:800; 
  letter-spacing:4px; 
  margin:0 0 20px 0; 
  position:relative; 
  text-shadow:0 0 20px currentColor; 
  font-family:'Cinzel', serif;
  animation: text-spooky 3s infinite alternate;
}

@keyframes text-spooky {
  0% { text-shadow: 0 0 20px currentColor, 0 0 30px var(--halloween-accent); }
  100% { text-shadow: 0 0 25px currentColor, 0 0 40px var(--halloween-accent), 0 0 70px var(--halloween-accent); }
}

.halloween-title-shadow { 
  position:absolute; 
  inset:0; 
  color:transparent; 
  -webkit-text-stroke:1px rgba(138, 43, 226, 0.5); 
  z-index:-2; 
}

.halloween-subtitle { 
  font-size:1.4rem; 
  opacity:.9; 
  max-width:700px; 
  margin:0 auto; 
  text-shadow:0 0 10px rgba(0,0,0,.5); 
  font-style: italic;
}

.halloween-hero-ornament { 
  display:flex; 
  align-items:center; 
  justify-content:center; 
  gap:25px; 
  margin-top:40px; 
}

.halloween-hero-line { 
  height:3px; 
  width:150px; 
  border-radius:3px; 
}

.halloween-hero-icon { 
  animation:pulse 2s ease-in-out infinite; 
  filter: drop-shadow(0 0 5px currentColor); 
}

@keyframes pulse { 
  0%,100%{transform:scale(1); opacity:1;} 
  50%{transform:scale(1.2); opacity:.8;} 
}

.halloween-hero-potions { 
  position:absolute; 
  inset:0; 
  pointer-events:none; 
}

.halloween-potion { 
  position:absolute; 
  width:30px; 
  height:40px; 
  border-radius: 40% 40% 10% 10%;
  animation: potion-float 10s infinite linear; 
  filter: drop-shadow(0 0 5px currentColor);
  display: flex;
  align-items: center;
  justify-content: center;
}

.halloween-potion-label {
  background: rgba(0, 0, 0, 0.5);
  color: white;
  font-size: 10px;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes potion-float { 
  0%{ transform: translateY(100vh) rotate(0deg); opacity:0;} 
  10%{opacity:1;} 
  90%{opacity:1;} 
  100%{ transform: translateY(-100px) rotate(360deg); opacity:0;} 
}

.halloween-scroll-indicator { 
  position:absolute; 
  bottom:30px; 
  left:50%; 
  transform:translateX(-50%); 
}

.halloween-scroll-broom { 
  font-size: 24px;
  animation: scroll-broom 2s infinite; 
}

@keyframes scroll-broom { 
  0%,20%,50%,80%,100%{ transform: translateY(0) rotate(0deg);} 
  40%{ transform: translateY(-10px) rotate(20deg);} 
  60%{ transform: translateY(-5px) rotate(-20deg);} 
}

/* NAVIGATION */
.halloween-nav { 
  position: sticky; 
  top: 0; 
  z-index: 100; 
  border-bottom:1px solid; 
  background: rgba(26, 16, 32, 0.97); 
  backdrop-filter: blur(20px); 
  -webkit-backdrop-filter: blur(20px); 
}

.halloween-nav-container { 
  max-width:1400px; 
  margin:0 auto; 
  padding:20px; 
  display:flex; 
  flex-wrap:wrap; 
  gap:25px; 
  align-items:center; 
  justify-content:space-between; 
}

.halloween-search-container { 
  position:relative; 
  flex:1; 
  min-width:280px; 
  max-width:500px; 
}

.halloween-search-icon { 
  position:absolute; 
  left:15px; 
  top:50%; 
  transform:translateY(-50%); 
  color:var(--halloween-sub); 
  z-index:2; 
}

.halloween-search-input { 
  width:100%; 
  padding:15px 15px 15px 45px; 
  background:rgba(0,0,0,.4); 
  border:1px solid; 
  border-radius:10px; 
  color:var(--halloween-text); 
  font-family:inherit; 
  font-size:1rem; 
  transition:all .3s ease; 
  position:relative; 
  z-index:1; 
}

.halloween-search-input:focus { 
  outline:none; 
  box-shadow:0 0 15px var(--halloween-glow); 
}

.halloween-search-underline { 
  position:absolute; 
  bottom:0; 
  left:0; 
  width:100%; 
  height:2px; 
  border-radius:2px; 
  transform:scaleX(0); 
  transition: transform .3s ease; 
}

.halloween-search-input:focus ~ .halloween-search-underline { 
  transform:scaleX(1); 
}

.halloween-categories { 
  display:flex; 
  flex-wrap:wrap; 
  gap:12px; 
}

.halloween-category-btn { 
  position:relative; 
  padding:10px 20px; 
  border:1px solid; 
  border-radius:25px; 
  background:rgba(255,255,255,.05); 
  color:var(--halloween-text); 
  font-family:inherit; 
  font-size:.9rem; 
  cursor:pointer; 
  transition:all .3s ease; 
  overflow:hidden; 
}

.halloween-category-btn:hover { 
  transform:translateY(-2px); 
  box-shadow:0 5px 15px rgba(0,0,0,.3); 
}

.halloween-category-btn.active { 
  border-color:transparent; 
  font-weight:600; 
}

.halloween-category-glow { 
  position:absolute; 
  inset:0; 
  border-radius:25px; 
  opacity:.7; 
  animation:pulse 2s infinite; 
}

.halloween-category-ping { 
  position:absolute; 
  top:-5px; 
  right:-5px; 
  width:12px; 
  height:12px; 
  border-radius:50%; 
  background: var(--halloween-color); 
  animation: ping 1.5s infinite; 
}

@keyframes ping { 
  0% { transform: scale(.5); opacity:.8;} 
  100% { transform: scale(2); opacity:0;} 
}

/* MAIN */
.halloween-main { 
  position:relative; 
  z-index:10; 
  max-width:1400px; 
  margin:0 auto; 
  padding:50px 20px; 
}

/* Stats */
.halloween-stats-section { 
  margin-bottom:70px; 
}

.halloween-stats-grid { 
  display:grid; 
  grid-template-columns: repeat(auto-fit, minmax(250px,1fr)); 
  gap:25px; 
}

.halloween-stat-card { 
  position:relative; 
  background:var(--halloween-surface); 
  border:1px solid var(--halloween-border); 
  border-radius:15px; 
  padding:30px; 
  display:flex; 
  align-items:center; 
  gap:20px; 
  overflow:hidden; 
  transition:all .3s ease; 
}

.halloween-stat-card:hover { 
  transform: translateY(-5px); 
  box-shadow:0 10px 30px rgba(0,0,0,.4); 
}

.halloween-stat-icon { 
  width:60px; 
  height:60px; 
  display:flex; 
  align-items:center; 
  justify-content:center; 
  background:rgba(0,0,0,.3); 
  border-radius:12px; 
  font-size:24px; 
  color: var(--halloween-color); 
}

.halloween-stat-content h3 { 
  font-size:2.2rem; 
  font-weight:700; 
  margin:0 0 5px 0; 
  background: linear-gradient(135deg, var(--halloween-color), #fff); 
  -webkit-background-clip: text; 
  -webkit-text-fill-color: transparent; 
  background-clip: text; 
}

.halloween-stat-content p { 
  margin:0; 
  color:var(--halloween-sub); 
  font-size:.9rem; 
}

.halloween-stat-glow { 
  position:absolute; 
  inset:0; 
  background: linear-gradient(45deg, var(--halloween-color), transparent); 
  opacity:0; 
  transition:opacity .3s ease; 
  z-index:-1; 
}

.halloween-stat-card:hover .halloween-stat-glow { 
  opacity:.1; 
}

/* Section */
.halloween-section { 
  margin-bottom:80px; 
}

.halloween-section-header { 
  display:flex; 
  align-items:center; 
  margin-bottom:40px; 
  gap:20px; 
}

.halloween-section-icon { 
  font-size:28px; 
}

.halloween-section-title { 
  font-size:2.2rem; 
  font-weight:700; 
  letter-spacing:2px; 
  margin:0; 
  background: linear-gradient(135deg, var(--halloween-color), #fff); 
  -webkit-background-clip:text; 
  -webkit-text-fill-color:transparent; 
  background-clip:text; 
  font-family: 'Cinzel', serif;
}

.halloween-section-line { 
  flex:1; 
  height:3px; 
  border-radius:3px; 
}

/* Grid */
.halloween-grid { 
  display:grid; 
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
  gap:30px; 
}

/* Product Card */
.halloween-product-card { 
  position:relative; 
  border-radius:20px; 
  overflow:hidden; 
  background:var(--halloween-surface); 
  border:1px solid var(--halloween-border); 
  transition: all .4s ease; 
  --halloween-color: #8A2BE2; 
}

.halloween-product-card:hover { 
  transform: translateY(-10px); 
  box-shadow:0 20px 40px rgba(0,0,0,.5); 
}

.halloween-product-glow { 
  position:absolute; 
  inset:0; 
  border-radius:20px; 
  opacity:0; 
  transition:opacity .4s ease; 
  background: radial-gradient(circle at center, var(--halloween-color), transparent 70%); 
}

.halloween-product-card:hover .halloween-product-glow { 
  opacity:.3; 
}

.halloween-product-cauldron-decoration {
  position: absolute;
  top: -15px;
  right: -15px;
  font-size: 24px;
  transform: rotate(20deg);
  z-index: 3;
  filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.5));
  animation: cauldron-bob 3s infinite alternate;
}

@keyframes cauldron-bob {
  0% { transform: rotate(15deg) translateY(0); }
  100% { transform: rotate(25deg) translateY(-5px); }
}

.halloween-product-inner { 
  position:relative; 
  z-index:2; 
  display:flex; 
  flex-direction:column; 
  height:100%; 
}

.halloween-product-media { 
  position:relative; 
  aspect-ratio:4/3; 
  background:rgba(255,255,255,.03); 
  overflow:hidden; 
}

.halloween-product-media img { 
  width:100%; 
  height:100%; 
  object-fit:cover; 
  transition: transform .6s ease; 
}

.halloween-product-card:hover .halloween-product-media img { 
  transform: scale(1.1); 
}

.halloween-product-placeholder { 
  width:100%; 
  height:100%; 
  display:flex; 
  align-items:center; 
  justify-content:center; 
  color:var(--halloween-sub); 
}

.halloween-product-badge { 
  position:absolute; 
  top:15px; 
  left:15px; 
  display:inline-flex; 
  align-items:center; 
  gap:8px; 
  background:rgba(0,0,0,.7); 
  border:1px solid var(--halloween-border); 
  padding:8px 15px; 
  font-size:.8rem; 
  border-radius:20px; 
  color:var(--halloween-color); 
  backdrop-filter: blur(5px); 
  z-index:3; 
}

.halloween-product-info { 
  padding:25px; 
  display:flex; 
  flex-direction:column; 
  flex:1; 
  gap:15px; 
}

.halloween-product-header { 
  display:flex; 
  flex-direction:column; 
  gap:10px; 
}

.halloween-product-title { 
  font-size:1.2rem; 
  font-weight:600; 
  margin:0; 
  line-height:1.3; 
  font-family: 'Cinzel', serif;
}

.halloween-product-category { 
  font-size:.85rem; 
  padding:5px 10px; 
  border:1px solid var(--halloween-border); 
  border-radius:15px; 
  color:var(--halloween-sub); 
  align-self:flex-start; 
}

.halloween-product-description { 
  margin:0; 
  color:var(--halloween-sub); 
  font-size:.95rem; 
  flex:1; 
}

.halloween-product-footer { 
  display:flex; 
  align-items:center; 
  justify-content:space-between; 
}

.halloween-product-price { 
  font-weight:700; 
  font-size:1.3rem; 
  color: var(--halloween-color); 
  text-shadow:0 0 5px rgba(0,0,0,.5); 
}

.halloween-product-variants { 
  font-size:.85rem; 
  color:var(--halloween-sub); 
}

.halloween-product-button { 
  border:1px solid var(--halloween-border); 
  background:rgba(255,255,255,.05); 
  color:var(--halloween-text); 
  padding:10px 18px; 
  border-radius:8px; 
  cursor:pointer; 
  font-family:inherit; 
  transition:all .3s ease; 
  position:relative; 
  overflow:hidden; 
}

.halloween-product-button::before { 
  content:''; 
  position:absolute; 
  top:0; 
  left:-100%; 
  width:100%; 
  height:100%; 
  background: linear-gradient(90deg, transparent, var(--halloween-color), transparent); 
  transition:left .5s ease; 
}

.halloween-product-button:hover { 
  background:rgba(255,255,255,.1); 
  box-shadow:0 0 15px var(--halloween-glow); 
}

.halloween-product-button:hover::before { 
  left:100%; 
}

/* Info */
.halloween-info-grid { 
  display:grid; 
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); 
  gap:30px; 
}

.halloween-info-card { 
  background:var(--halloween-surface); 
  border:1px solid var(--halloween-border); 
  border-radius:20px; 
  padding:30px; 
  position:relative; 
  overflow:hidden; 
  transition:all .3s ease; 
}

.halloween-info-card:hover { 
  transform: translateY(-5px); 
  box-shadow:0 15px 35px rgba(0,0,0,.4); 
}

.halloween-info-card-header { 
  display:flex; 
  align-items:center; 
  gap:15px; 
  margin-bottom:25px; 
}

.halloween-info-card-icon { 
  width:50px; 
  height:50px; 
  display:flex; 
  align-items:center; 
  justify-content:center; 
  background:rgba(0,0,0,.3); 
  border-radius:12px; 
  font-size:20px; 
}

.halloween-info-card-title { 
  font-size:1.4rem; 
  font-weight:600; 
  margin:0; 
  background: linear-gradient(135deg, var(--halloween-color), #fff); 
  -webkit-background-clip:text; 
  -webkit-text-fill-color:transparent; 
  background-clip:text; 
  font-family: 'Cinzel', serif;
}

.halloween-info-card-content { 
  display:flex; 
  flex-direction:column; 
  gap:18px; 
}

.halloween-contact-item { 
  display:flex; 
  align-items:center; 
  gap:15px; 
  padding:12px; 
  background:rgba(0,0,0,.2); 
  border-radius:10px; 
  transition:all .3s ease; 
}

.halloween-contact-item:hover { 
  background:rgba(0,0,0,.3); 
  transform: translateX(5px); 
}

.halloween-contact-icon { 
  font-size:1.2rem; 
  flex-shrink:0; 
}

.halloween-contact-item a { 
  color:var(--halloween-text); 
  text-decoration:none; 
  transition:color .3s ease; 
}

.halloween-contact-item a:hover { 
  color: var(--halloween-color); 
}

.halloween-hours { 
  display:grid; 
  grid-template-columns:1fr 1fr; 
  gap:12px; 
}

.halloween-hours-day { 
  font-weight:500; 
  padding:8px 0; 
  border-bottom:1px solid rgba(255,255,255,.1); 
}

.halloween-hours-time { 
  text-align:right; 
  padding:8px 0; 
  border-bottom:1px solid rgba(255,255,255,.1); 
  color:var(--halloween-sub); 
}

.halloween-hours-day:last-of-type, .halloween-hours-time:last-of-type { 
  border-bottom:none; 
}

.halloween-social-grid { 
  display:grid; 
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); 
  gap:15px; 
}

.halloween-social-link { 
  display:flex; 
  flex-direction:column; 
  align-items:center; 
  gap:10px; 
  padding:20px; 
  border:1px solid var(--halloween-border); 
  border-radius:12px; 
  text-decoration:none; 
  color:var(--halloween-text); 
  transition:all .3s ease; 
  position:relative; 
  overflow:hidden; 
}

.halloween-social-link::before { 
  content:''; 
  position:absolute; 
  inset:0; 
  background: linear-gradient(45deg, var(--halloween-color), transparent); 
  opacity:0; 
  transition:opacity .3s ease; 
  z-index:-1; 
}

.halloween-social-link:hover { 
  transform: translateY(-5px); 
  box-shadow:0 10px 25px rgba(0,0,0,.3); 
}

.halloween-social-link:hover::before { 
  opacity:.1; 
}

.halloween-social-icon { 
  font-size:1.8rem; 
}

.halloween-info-card-glow { 
  position:absolute; 
  top:0; 
  left:0; 
  width:100%; 
  height:3px; 
  opacity:.7; 
}

.halloween-empty { 
  grid-column:1/-1; 
  display:flex; 
  flex-direction:column; 
  align-items:center; 
  justify-content:center; 
  gap:20px; 
  padding:80px 30px; 
  border:2px dashed var(--halloween-border); 
  border-radius:20px; 
  background:rgba(255,255,255,.02); 
  color:var(--halloween-sub); 
  text-align:center; 
}

/* FOOTER */
.halloween-footer { 
  border-top:1px solid var(--halloween-border); 
  margin-top:100px; 
  padding:50px 20px; 
  background: rgba(20, 10, 15, 0.9); 
  position:relative; 
}

.halloween-footer-content { 
  max-width:1200px; 
  margin:0 auto; 
  display:flex; 
  align-items:center; 
  justify-content:center; 
  gap:20px; 
  flex-wrap:wrap; 
  text-align:center; 
}

.halloween-footer-dot { 
  width:6px; 
  height:6px; 
  border-radius:50%; 
  background:var(--halloween-sub); 
}

.halloween-footer-decoration { 
  position:absolute; 
  bottom:0; 
  left:0; 
  width:100%; 
  height:30px; 
  display:flex; 
  justify-content:space-around; 
}

.halloween-footer-spider { 
  animation: spider-drop 3s infinite ease-in-out; 
}

@keyframes spider-drop { 
  0%,100%{ transform: translateY(0); opacity:.3;} 
  50%{ transform: translateY(-15px); opacity:1;} 
}

/* RESPONSIVE */
@media (max-width:1024px){
  .halloween-nav-container { flex-direction:column; align-items:stretch; gap:20px; }
  .halloween-search-container { max-width:100%; }
  .halloween-stats-grid { grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); }
  .halloween-grid { grid-template-columns: repeat(auto-fill, minmax(250px,1fr)); }
  .halloween-info-grid { grid-template-columns:1fr; }
}
@media (max-width:768px){
  .halloween-hero { min-height:80vh; padding:60px 15px; }
  .halloween-logo, .halloween-logo-placeholder { width:100px; height:100px; }
  .halloween-title-spooky { font-size:2.5rem; }
  .halloween-subtitle { font-size:1.1rem; }
  .halloween-categories { justify-content:center; }
  .halloween-stats-grid { grid-template-columns:1fr; }
  .halloween-section-title { font-size:1.8rem; }
  .halloween-footer-content { flex-direction:column; gap:10px; }
  .halloween-footer-dot { display:none; }
}
@media (max-width:480px){
  .halloween-hero { min-height:70vh; padding:40px 10px; }
  .halloween-title-spooky { font-size:2rem; letter-spacing:2px; }
  .halloween-nav-container { padding:15px; }
  .halloween-search-input { padding:12px 12px 12px 40px; }
  .halloween-category-btn { padding:8px 16px; font-size:.8rem; }
  .halloween-main { padding:30px 15px; }
  .halloween-grid { grid-template-columns:1fr; }
  .halloween-section-header { flex-direction:column; align-items:flex-start; gap:10px; }
  .halloween-section-line { width:100%; }
  .halloween-product-info { padding:20px; }
  .halloween-product-footer { flex-direction:column; align-items:flex-start; gap:15px; }
  .halloween-product-button { align-self:stretch; text-align:center; }
}
`;

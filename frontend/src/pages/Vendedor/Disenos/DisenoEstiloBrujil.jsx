import React, { useMemo, useState, useRef, useEffect, Fragment } from "react";
import { Link } from "react-router-dom";
import { buildProductoHref } from "../../../lib/productHref";
import "./bruja.css";
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
    <div className="halloween-root" ref={mainRef}>
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
                <div className="halloween-potion-label">{i + 1}</div>
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
                          background: `linear-gradient(135deg, rgba(${hexToRgb(halloweenColors[colorIndex]).join(
                            ","
                          )}, 0.9), rgba(${hexToRgb(
                            halloweenColors[(colorIndex + 1) % halloweenColors.length]
                          ).join(",")}, 0.9))`,
                          color: "#000",
                          boxShadow: `0 0 20px rgba(${hexToRgb(halloweenColors[colorIndex]).join(",")}, 0.7)`,
                          transform: "translateY(-2px)",
                        }
                      : {
                          border: `1px solid rgba(${hexToRgb(halloweenColors[colorIndex]).join(",")}, 0.3)`,
                          boxShadow: `0 0 10px rgba(${hexToRgb(halloweenColors[colorIndex]).join(",")}, 0.1)`,
                        }
                  }
                  title={c.nombre}
                >
                  <span className="halloween-category-text">{c.nombre}</span>
                  {active && (
                    <div
                      className="halloween-category-glow"
                      style={{
                        boxShadow: `0 0 20px rgba(${hexToRgb(halloweenColors[colorIndex]).join(",")}, 0.7)`,
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
                      ([{ id: "all", nombre: "Todo" }, ...categoriasSafe(categorias)].find(
                        (x) => String(x.id) === String(catId)
                      ) || { nombre: "Categoría" }).nombre
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
            <HalloweenSection key={b.id} title={p.title || "Productos Embrujados"} icon={<FiStar />} glowColor={glowColor} halloweenColors={halloweenColors}>
              <div className="halloween-grid">
                {list.map((prod) => (
                  <HalloweenProductCard key={prod.id || prod.uuid} p={prod} toPublicSrc={toPublicSrc} halloweenColors={halloweenColors} />
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
                  <HalloweenProductCard key={prod.id || prod.uuid} p={prod} toPublicSrc={toPublicSrc} halloweenColors={halloweenColors} />
                ))}
              </div>
            </HalloweenSection>
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
            <HalloweenSection key={b.id} title={p.title || catName(id)} icon={<FiShoppingBag />} glowColor={glowColor} halloweenColors={halloweenColors}>
              <div className="halloween-grid">
                {list.map((prod) => (
                  <HalloweenProductCard key={prod.id || prod.uuid} p={prod} toPublicSrc={toPublicSrc} halloweenColors={halloweenColors} />
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
                <HalloweenProductCard key={prod.id || prod.uuid} p={prod} toPublicSrc={toPublicSrc} halloweenColors={halloweenColors} />
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
                    boxShadow: `0 0 10px rgba(${hexToRgb(halloweenColors[0]).join(",")}, 0.6)`,
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
function categoriasSafe(c) {
  return Array.isArray(c) ? c : [];
}
function hexToRgb(hex) {
  const m = hex?.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

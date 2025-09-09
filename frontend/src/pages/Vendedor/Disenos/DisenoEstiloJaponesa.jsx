// E:\SVKP1\frontend\src\pages\Vendedor\Disenos\DisenoEstiloJaponesa.jsx
import React, { useMemo, useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

const DEFAULT_BLOCK_PROPS = {
  hero:     { showLogo: true, showDescripcion: true, align: "center" },
  featured: { title: "Productos Destacados", limit: 8 },
  grid:     { title: "Colección Completa", limit: 12, showFilter: true },
  category: { title: "", categoriaId: null, limit: 12, showFilter: true },
  product:  { productoId: null },
  banner:   { title: "Nueva Colección", ctaText: "Descubrir", ctaUrl: "" },
  logo:     { shape: "rounded", frame: "thin" },
};

/* ===== Rutas públicas ===== */
const storeKey    = (t) => t?.slug || t?.publicUuid || t?.uuid || t?.id;
const productKey  = (p) => p?.uuid || p?.publicUuid || p?.id;
const productPath = (t, p) => {
  const pid = productKey(p);
  if (!pid) return "/producto";
  const sk = storeKey(t);
  return sk
    ? `/t/${encodeURIComponent(sk)}/producto/${encodeURIComponent(pid)}`
    : `/producto/${encodeURIComponent(pid)}`;
};

export default function DisenoEstiloJaponesa({
  tienda,
  productos = [],
  categorias = [],
  orderedBlocks = [],
  toPublicSrc,
}) {
  const [q, setQ] = useState("");
  const [catId, setCatId] = useState("all");
  const [mounted, setMounted] = useState(false);
  const heroRef = useRef(null);

  const safeParse = (v, f = {}) => {
    if (!v || typeof v !== "string") return v || f;
    try { return JSON.parse(v); } catch { return f; }
  };
  const redes = useMemo(() => safeParse(tienda?.redes, {}), [tienda?.redes]);

  const colors = useMemo(() => ({
    primary:   "#8E44AD",
    secondary: "#E84393",
    accent:    "#D2527F",
    background:"#FFF5F5",
    surface:   "#FFFFFF",
    text:      "#2C3A47",
    textLight: "#888888",
    border:    "#FFD1DC",
    gold:      "#D4AF37",
  }), []);

  const filtered = useMemo(() => {
    let list = Array.isArray(productos) ? productos : [];
    if (catId !== "all") {
      const idNum = Number(catId);
      list = list.filter(
        (p) => Array.isArray(p.categorias) &&
          p.categorias.some((pc) => Number(pc.categoriaId) === idNum)
      );
    }
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((p) =>
        `${p?.nombre||""} ${p?.descripcion||""} ${p?.detalle||""}`.toLowerCase().includes(needle)
      );
    }
    return list;
  }, [productos, catId, q]);

  useEffect(() => { setMounted(true); }, []);

  const portada = toPublicSrc?.(tienda?.portada?.url || tienda?.portadaUrl) || "";
  const logo    = toPublicSrc?.(tienda?.logo?.url || tienda?.logoUrl) || "";

  const catTabs = useMemo(
    () => [{ id: "all", nombre: "Todo" }, ...(Array.isArray(categorias) ? categorias : [])],
    [categorias]
  );

  const blocksOrdered = useMemo(() => {
    if (!Array.isArray(orderedBlocks)) return [];
    return [...orderedBlocks].sort((a, b) => (a?.z ?? 0) - (b?.z ?? 0));
  }, [orderedBlocks]);

  const heroBlock = blocksOrdered.find(b => b?.type === "hero");
  const heroProps = { ...DEFAULT_BLOCK_PROPS.hero, ...(heroBlock?.props || {}) };
  const alignToFlex = (align) =>
    align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

  return (
    <div className="japanese-premium-root" ref={heroRef}>
      <style>{cssJaponesPremium(colors)}</style>

      {/* Elementos decorativos: solo pétalos superiores (se eliminó la “imagen 2”) */}
      <div className="japanese-background-elements">
        <div className="cherry-blossoms-top">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="cherry-blossom" style={{
              animationDelay: `${i * 2}s`,
              left: `${i * 8}%`,
              opacity: Math.random() * 0.3 + 0.4
            }}>🌸</div>
          ))}
        </div>
        <div className="japanese-lanterns">
          <div className="lantern left">🏮</div>
          <div className="lantern right">🏮</div>
        </div>
      </div>

      {/* HERO sin difuminado/velos */}
      <header
        className={`japanese-premium-hero ${mounted ? "mounted" : ""}`}
        style={{
          backgroundImage: portada
            ? `url(${portada})`
            : `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
        }}
      >
        <div className="japanese-premium-hero-content"
             style={{ textAlign: heroProps.align, alignItems: alignToFlex(heroProps.align) }}>
          {heroProps.showLogo && logo && (
            <div className="japanese-premium-logo-container">
              <div className="logo-frame">
                <img className="japanese-premium-logo" src={logo} alt="logo" />
                <div className="logo-frame-decoration"></div>
              </div>
            </div>
          )}

          <div className="japanese-premium-title-container">
            <h1 className="japanese-premium-title">{tienda?.nombre || "Tienda Elegante"}</h1>
            {heroProps.showDescripcion && tienda?.descripcion && (
              <p className="japanese-premium-subtitle">{tienda.descripcion}</p>
            )}
          </div>

          <div className="japanese-premium-hero-ornament">
            <div className="ornament-line"></div>
            <div className="ornament-icon">🎴</div>
            <div className="ornament-line"></div>
          </div>

          <div className="hero-call-to-action">
            <a href="#coleccion" className="btn btn-primary">Descubrir Colección</a>
          </div>
        </div>
      </header>

      {/* NAV sin blur, botones actualizados */}
      <nav className="japanese-premium-nav">
        <div className="nav-container">
          <div className="nav-search-container">
            <span className="nav-search-icon">🔎</span>
            <input
              type="search"
              placeholder="Buscar productos exquisitos..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="nav-search-input"
            />
          </div>

          <div className="nav-categories">
            {catTabs.map((c) => {
              const active = String(catId) === String(c.id);
              return (
                <button
                  key={`${c.id}`}
                  className={`chip ${active ? "chip-active" : ""}`}
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
      <main id="coleccion" className="japanese-premium-main">
        {blocksOrdered.length > 0 ? (
          <RenderBlocksJaponesPremium
            layout={blocksOrdered}
            productos={productos}
            categorias={Array.isArray(categorias) ? categorias : []}
            tienda={tienda}
            toPublicSrc={toPublicSrc}
            colors={colors}
            globalQuery={q}
          />
        ) : (
          <>
            {Array.isArray(productos) && productos.some((p) => p?.destacado) && (
              <JapanesePremiumSection title="Productos Destacados" icon="🎀" colors={colors}>
                <div className="premium-product-grid">
                  {productos.filter((p) => p?.destacado).slice(0, 8).map((p) => (
                    <JapanesePremiumProductCard
                      key={p.id || p.uuid}
                      p={p}
                      toPublicSrc={toPublicSrc}
                      colors={colors}
                      tienda={tienda}
                    />
                  ))}
                </div>
              </JapanesePremiumSection>
            )}

            <JapanesePremiumSection
              title={catId === "all"
                ? (q.trim() ? `Resultados (${filtered.length})` : "Colección Completa")
                : `${(catTabs.find((x) => String(x.id) === String(catId))?.nombre || "Categoría")} (${filtered.length})`}
              icon="📦"
              colors={colors}
            >
              {filtered.length ? (
                <div className="premium-product-grid">
                  {filtered.map((p) => (
                    <JapanesePremiumProductCard
                      key={p.id || p.uuid}
                      p={p}
                      toPublicSrc={toPublicSrc}
                      colors={colors}
                      tienda={tienda}
                    />
                  ))}
                </div>
              ) : (
                <div className="premium-empty-state">
                  <div className="empty-icon">🎎</div>
                  <h3>No se encontraron productos</h3>
                  <p>Intenta con otros términos de búsqueda</p>
                </div>
              )}
            </JapanesePremiumSection>
          </>
        )}

        {/* CONTACTO */}
        <JapanesePremiumSection title="Contacto y Información" icon="💌" colors={colors}>
          <div className="premium-contact-grid">
            <div className="contact-card">
              <div className="contact-card-header"><div className="contact-icon">📞</div><h3>Contacto Directo</h3></div>
              <div className="contact-card-content">
                {tienda?.telefonoContacto && (
                  <div className="contact-item">
                    <span className="contact-label">Teléfono:</span>
                    <a href={`tel:${tienda.telefonoContacto}`} className="contact-value">{tienda.telefonoContacto}</a>
                  </div>
                )}
                {tienda?.email && (
                  <div className="contact-item">
                    <span className="contact-label">Email:</span>
                    <a href={`mailto:${tienda.email}`} className="contact-value">{tienda.email}</a>
                  </div>
                )}
              </div>
            </div>

            <div className="contact-card">
              <div className="contact-card-header"><div className="contact-icon">⏰</div><h3>Horario de Atención</h3></div>
              <div className="contact-card-content">
                <JapanesePremiumHours horario={safeParse(tienda?.horario, {})} />
              </div>
            </div>

            <div className="contact-card">
              <div className="contact-card-header"><div className="contact-icon">❤️</div><h3>Síguenos</h3></div>
              <div className="contact-card-content">
                <div className="social-links">
                  {redes?.facebook && <a href={redes.facebook} target="_blank" rel="noreferrer" className="social-link"><span className="social-icon">📘</span><span>Facebook</span></a>}
                  {redes?.instagram && <a href={redes.instagram} target="_blank" rel="noreferrer" className="social-link"><span className="social-icon">📸</span><span>Instagram</span></a>}
                </div>
              </div>
            </div>
          </div>
        </JapanesePremiumSection>

        {/* NEWSLETTER */}
        <div className="premium-newsletter">
          <div className="newsletter-container">
            <div className="newsletter-content">
              <h2>Únete a Nuestra Comunidad</h2>
              <p>Recibe novedades exclusivas y promociones especiales</p>
              <div className="newsletter-form">
                <input type="email" placeholder="Tu email elegante..." />
                <button className="btn btn-gold">Suscribirse</button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="japanese-premium-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>Colección Elegante</h4>
            <p>Productos seleccionados con amor y dedicación</p>
          </div>
          <div className="footer-section">
            <h4>Enlaces Rápidos</h4>
            <div className="footer-links">
              <a href="#">Inicio</a>
              <a href="#">Productos</a>
              <a href="#">Contacto</a>
            </div>
          </div>
          <div className="footer-section">
            <h4>Conéctate</h4>
            <div className="footer-social">
              <a href="#" className="social-btn">📘</a>
              <a href="#" className="social-btn">📸</a>
              <a href="#" className="social-btn">🐦</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} {tienda?.nombre || "Tienda Elegante"} · Diseño con esencia japonesa</p>
        </div>
      </footer>
    </div>
  );
}

/* ====== BLOQUES ====== */
function RenderBlocksJaponesPremium({
  layout = [],
  productos = [],
  categorias = [],
  tienda,
  toPublicSrc,
  colors,
  globalQuery = "",
}) {
  const catName = (id) => categorias.find((c) => Number(c.id) === Number(id))?.nombre || "Categoría";
  const applyGlobalFilterIfNeeded = (arr, p) => {
    if (!p?.showFilter || !globalQuery.trim()) return arr;
    const needle = globalQuery.trim().toLowerCase();
    return arr.filter((x) =>
      `${x?.nombre||""} ${x?.descripcion||""} ${x?.detalle||""}`.toLowerCase().includes(needle)
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
            <JapanesePremiumSection key={b.id} title={p.title || "Productos Destacados"} icon="🎀" colors={colors}>
              <div className="premium-product-grid">
                {list.map((prod) => (
                  <JapanesePremiumProductCard key={prod.id || prod.uuid} p={prod} toPublicSrc={toPublicSrc} colors={colors} tienda={tienda} />
                ))}
              </div>
            </JapanesePremiumSection>
          );
        }

        if (type === "grid") {
          const list = applyGlobalFilterIfNeeded([...(productos || [])], p).slice(0, p.limit ?? 12);
          if (!list.length) return null;
          return (
            <JapanesePremiumSection key={b.id} title={p.title || "Colección Completa"} icon="📦" colors={colors}>
              <div className="premium-product-grid">
                {list.map((prod) => (
                  <JapanesePremiumProductCard key={prod.id || prod.uuid} p={prod} toPublicSrc={toPublicSrc} colors={colors} tienda={tienda} />
                ))}
              </div>
            </JapanesePremiumSection>
          );
        }

        if (type === "category") {
          const id = Number(p.categoriaId);
          if (!id) return null;
          const list = applyGlobalFilterIfNeeded(
            (productos || []).filter(
              (prod) => Array.isArray(prod.categorias) && prod.categorias.some((pc) => Number(pc.categoriaId) === id)
            ),
            p
          ).slice(0, p.limit ?? 12);
          if (!list.length) return null;
          return (
            <JapanesePremiumSection key={b.id} title={p.title || catName(id)} icon="📦" colors={colors}>
              <div className="premium-product-grid">
                {list.map((prod) => (
                  <JapanesePremiumProductCard key={prod.id || prod.uuid} p={prod} toPublicSrc={toPublicSrc} colors={colors} tienda={tienda} />
                ))}
              </div>
            </JapanesePremiumSection>
          );
        }

        if (type === "product") {
          const id = Number(p.productoId);
          if (!id) return null;
          const prod = (productos || []).find((x) => Number(x.id) === id);
          if (!prod) return null;
          return (
            <JapanesePremiumSection key={b.id} title={prod.nombre || "Producto"} icon="📦" colors={colors}>
              <div className="premium-product-grid">
                <JapanesePremiumProductCard p={prod} toPublicSrc={toPublicSrc} colors={colors} tienda={tienda} />
              </div>
            </JapanesePremiumSection>
          );
        }

        if (type === "banner") {
          const src = toPublicSrc?.(tienda?.bannerPromoUrl);
          return (
            <section key={b.id} className="premium-banner-section">
              <div className="banner-header"><div className="banner-icon">🎊</div><h2>{p.title || "Nueva Colección"}</h2></div>
              <div className="premium-banner" style={{ backgroundImage: src ? `url(${src})` : undefined }}>
                {p.ctaText ? (
                  p.ctaUrl ? (
                    <a href={p.ctaUrl} target="_blank" rel="noreferrer" className="btn btn-outline">{p.ctaText}</a>
                  ) : (
                    <span className="btn btn-outline">{p.ctaText}</span>
                  )
                ) : null}
              </div>
            </section>
          );
        }

        if (type === "logo") {
          const src = toPublicSrc?.(tienda?.logo?.url || tienda?.logoUrl);
          return (
            <section key={b.id} className="premium-logo-section">
              {src ? <img src={src} alt="logo" className="premium-logo-display" /> : null}
            </section>
          );
        }

        return null;
      })}
    </>
  );
}

/* ====== UI Aux ====== */
function JapanesePremiumSection({ title, icon, children }) {
  return (
    <section className="premium-section">
      <div className="section-header">
        <div className="section-icon">{icon}</div>
        <h2 className="section-title">{title}</h2>
        <div className="section-divider"></div>
      </div>
      {children}
    </section>
  );
}

function JapanesePremiumProductCard({ p = {}, toPublicSrc, colors, tienda }) {
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
    return Number.isFinite(n) ? `$${n.toFixed(2)}` : "";
  })();

  const to = productPath(tienda, p);

  return (
    <article className="premium-product-card">
      <div className="product-card-inner">
        <Link to={to} className="product-image-container" title="Ver detalles">
          {img ? (
            <img
              src={img}
              alt={p?.nombre || "producto"}
              loading="lazy"
              className="product-image"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src =
                  "data:image/svg+xml;utf8," +
                  encodeURIComponent(
                    `<svg xmlns='http://www.w3.org/2000/svg' width='480' height='360'>
                       <rect width='100%' height='100%' fill='#FFF5F5'/>
                       <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#D2527F' font-family='Arial' font-size='16'>Imagen no disponible</text>
                     </svg>`
                  );
              }}
            />
          ) : (
            <div className="product-image-placeholder"><div className="placeholder-icon">🎀</div></div>
          )}
          <div className="product-badge"><span className="badge-icon">⭐</span>{p.destacado ? "Exclusivo" : "Nuevo"}</div>
          <div className="product-overlay">
            <span className="btn btn-light">Ver detalles</span>
          </div>
        </Link>

        <div className="product-info">
          <div className="product-category">{categoria}</div>
          <h3 className="product-title"><Link to={to}>{p?.nombre || p?.title || "Producto Elegante"}</Link></h3>
          {p?.descripcion && (
            <p className="product-description">
              {String(p.descripcion).length > 90 ? `${String(p.descripcion).slice(0, 90)}…` : String(p.descripcion)}
            </p>
          )}
          <div className="product-footer">
            {conPrecio ? <div className="product-price">{precio}</div> : <div className="product-variants">Variantes disponibles</div>}
            <button className="btn btn-primary-circle" title="Agregar al carrito">🛒</button>
          </div>
        </div>
      </div>
    </article>
  );
}

function JapanesePremiumHours({ horario = {} }) {
  const h = typeof horario === "string" ? (() => { try { return JSON.parse(horario); } catch { return {}; } })() : (horario || {});
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
    <div className="premium-hours">
      {dias.map((d) => (
        <div key={d.id} className="hour-row">
          <span className="hour-day">{d.label}</span>
          <span className="hour-time">{h?.[d.id] || "Cerrado"}</span>
        </div>
      ))}
    </div>
  );
}

/* ====== CSS ====== */
function cssJaponesPremium(colors) {
  return `
:root{
  --primary:${colors.primary};--secondary:${colors.secondary};--accent:${colors.accent};
  --background:${colors.background};--surface:${colors.surface};
  --text:${colors.text};--text-light:${colors.textLight};
  --border:${colors.border};--gold:${colors.gold};
}
.japanese-premium-root{background:var(--background);color:var(--text);min-height:100dvh;font-family:'Noto Serif JP',serif;line-height:1.6;position:relative;overflow-x:hidden;}
/* ---- Decoración (solo top) ---- */
.japanese-background-elements{position:fixed;inset:0;pointer-events:none;z-index:0}
.cherry-blossoms-top{position:absolute;top:0;width:100%;height:100px}
.cherry-blossom{position:absolute;font-size:24px;animation:blossom-float 20s infinite linear;opacity:.6}
@keyframes blossom-float{0%{transform:translateY(-100px) rotate(0);opacity:0}10%{opacity:.6}90%{opacity:.6}100%{transform:translateY(100vh) rotate(360deg);opacity:0}}
.japanese-lanterns{position:absolute;top:50%;left:0;right:0;display:flex;justify-content:space-between;padding:0 20px;transform:translateY(-50%)}
.lantern{font-size:32px;animation:lantern-sway 4s infinite ease-in-out}
.lantern.left{animation-delay:.5s}.lantern.right{animation-delay:1s}
@keyframes lantern-sway{0%,100%{transform:translateY(0) rotate(-5deg)}50%{transform:translateY(-10px) rotate(5deg)}}
/* ---- HERO sin difuminado ---- */
.japanese-premium-hero{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:80px 20px;background-size:cover;background-position:center;z-index:1}
.japanese-premium-hero-content{text-align:center;max-width:1000px;width:100%;z-index:2;display:flex;flex-direction:column;gap:30px}
.logo-frame{position:relative;display:inline-block;padding:15px;background:#fff;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,.1)}
.japanese-premium-logo{max-width:200px;max-height:200px;object-fit:contain;border-radius:15px}
.logo-frame-decoration{position:absolute;inset:-5px;border:2px solid var(--gold);border-radius:25px;opacity:.5;pointer-events:none}
.japanese-premium-title{font-size:clamp(2.8rem,7vw,4.5rem);font-weight:600;margin:0 0 20px;color:var(--text)}
.japanese-premium-subtitle{font-size:1.3rem;max-width:640px;margin:0 auto;opacity:.95}
/* ---- Botones generales ---- */
.btn{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;cursor:pointer;user-select:none;transition:transform .15s ease, box-shadow .2s ease, background .2s ease, color .2s ease;border-radius:999px;padding:12px 22px;font-weight:700}
.btn-primary{background:linear-gradient(135deg,var(--primary),var(--secondary));color:#fff;border:2px solid transparent;box-shadow:0 8px 20px rgba(142,68,173,.28)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(142,68,173,.35)}
.btn-outline{background:#fff;color:var(--text);border:2px solid var(--accent)}
.btn-outline:hover{background:var(--accent);color:#fff}
.btn-light{background:#fff;color:var(--text);border:2px solid var(--border);padding:8px 16px}
.btn-light:hover{border-color:var(--accent);color:var(--accent)}
.btn-gold{background:var(--gold);color:var(--text);border:2px solid transparent;font-weight:800}
.btn-gold:hover{background:#ffd700;transform:translateY(-2px)}
.btn-primary-circle{background:linear-gradient(135deg,var(--primary),var(--secondary));color:#fff;border:none;width:44px;height:44px;border-radius:50%}
.btn-primary-circle:hover{transform:scale(1.08)}
/* ---- NAV sin blur ---- */
.japanese-premium-nav{position:sticky;top:0;z-index:100;background:#fff;border-bottom:1px solid var(--border);box-shadow:0 2px 20px rgba(0,0,0,.05)}
.nav-container{max-width:1200px;margin:0 auto;padding:16px 20px;display:flex;flex-wrap:wrap;gap:18px;align-items:center;justify-content:space-between}
.nav-search-container{position:relative;flex:1;min-width:300px;max-width:520px}
.nav-search-icon{position:absolute;left:16px;top:50%;transform:translateY(-50%);opacity:.6}
.nav-search-input{width:100%;padding:12px 16px 12px 44px;background:#fff;border:2px solid var(--border);border-radius:14px;color:var(--text)}
.nav-search-input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px rgba(210,82,127,.12)}
.nav-categories{display:flex;flex-wrap:wrap;gap:10px}
.chip{padding:10px 18px;border:2px solid var(--border);border-radius:999px;background:#fff;color:var(--text);font-weight:700}
.chip:hover{border-color:var(--accent);color:var(--accent)}
.chip-active{background:var(--accent);border-color:var(--accent);color:#fff}
/* ---- MAIN ---- */
.japanese-premium-main{position:relative;z-index:10;max-width:1200px;margin:0 auto;padding:60px 20px}
.premium-section{margin:70px 0}
.section-header{display:flex;align-items:center;margin-bottom:48px;gap:18px}
.section-icon{font-size:32px}
.section-title{font-size:2.1rem;font-weight:700;margin:0}
.section-divider{flex:1;height:2px;background:linear-gradient(90deg,var(--accent),transparent);margin-left:14px}
/* Grid productos */
.premium-product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:28px}
.premium-product-card{background:var(--surface);border-radius:20px;overflow:hidden;transition:transform .25s, box-shadow .25s;box-shadow:0 8px 24px rgba(0,0,0,.08);position:relative}
.premium-product-card:hover{transform:translateY(-6px);box-shadow:0 16px 40px rgba(0,0,0,.12)}
.product-image-container{position:relative;aspect-ratio:4/3;display:block;overflow:hidden}
.product-image{width:100%;height:100%;object-fit:cover;transition:transform .6s}
.premium-product-card:hover .product-image{transform:scale(1.08)}
.product-image-placeholder{width:100%;height:100%;display:grid;place-items:center;background:linear-gradient(135deg,var(--background),#fff)}
.product-badge{position:absolute;top:14px;left:14px;display:flex;gap:6px;align-items:center;background:#fff;border:2px solid var(--gold);padding:6px 12px;border-radius:14px;font-size:.82rem;z-index:2}
.badge-icon{color:var(--gold)}
.product-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .25s}
.premium-product-card:hover .product-overlay{opacity:1}
.product-info{padding:22px;display:flex;flex-direction:column;gap:10px}
.product-category{font-size:.85rem;color:var(--text-light);text-transform:uppercase;letter-spacing:.5px}
.product-title{font-size:1.18rem;font-weight:700;margin:0}
.product-title a{color:inherit;text-decoration:none}
.product-title a:hover{color:var(--accent)}
.product-description{margin:0;color:var(--text-light)}
.product-footer{display:flex;align-items:center;justify-content:space-between;margin-top:auto}
.product-price{font-weight:800;font-size:1.22rem;color:var(--accent)}
.product-variants{font-size:.92rem;color:var(--text-light)}
/* Empty */
.premium-empty-state{grid-column:1/-1;display:flex;flex-direction:column;align-items:center;gap:18px;padding:70px 24px;background:#fff;border-radius:20px;text-align:center}
.empty-icon{font-size:64px;opacity:.7}
/* Contacto */
.premium-contact-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:28px}
.contact-card{background:#fff;border-radius:20px;padding:28px;box-shadow:0 8px 24px rgba(0,0,0,.08);transition:transform .25s}
.contact-card:hover{transform:translateY(-4px)}
.contact-card-header{display:flex;align-items:center;gap:14px;margin-bottom:18px}
.contact-icon{font-size:26px}
.contact-item{display:flex;flex-direction:column;gap:4px}
.contact-label{font-size:.9rem;color:var(--text-light);font-weight:700}
.contact-value{color:var(--text);text-decoration:none}
.contact-value:hover{color:var(--accent)}
.premium-hours{display:flex;flex-direction:column;gap:10px}
.hour-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)}
.hour-row:last-child{border-bottom:0}
/* Newsletter */
.premium-newsletter{background:linear-gradient(135deg,var(--primary),var(--secondary));border-radius:22px;padding:44px;margin:70px 0;color:#fff}
.newsletter-container{display:flex;align-items:center;gap:32px}
.newsletter-form{display:flex;gap:12px}
.newsletter-form input{flex:1;padding:14px 16px;border-radius:14px;border:2px solid transparent}
.newsletter-form input:focus{outline:none;border-color:#fff;background:#fff}
/* Footer */
.japanese-premium-footer{background:#fff;border-top:1px solid var(--border);padding:60px 0 30px;margin-top:80px}
.footer-content{max-width:1200px;margin:0 auto;padding:0 20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:36px}
.footer-section h4{margin:0 0 12px}
.footer-section p{margin:0;color:var(--text-light)}
.footer-links{display:flex;flex-direction:column;gap:8px}
.footer-links a{color:var(--text-light);text-decoration:none}
.footer-links a:hover{color:var(--accent)}
.footer-social{display:flex;gap:10px}
.social-btn{width:40px;height:40px;display:grid;place-items:center;background:var(--background);border-radius:50%}
.social-btn:hover{background:var(--accent);color:#fff}
.footer-bottom{max-width:1200px;margin:36px auto 0;padding:20px;text-align:center;border-top:1px solid var(--border);color:var(--text-light)}
/* Responsive */
@media (max-width:1024px){
  .nav-container{flex-direction:column;align-items:stretch}
  .premium-product-grid{grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
  .newsletter-container{flex-direction:column;text-align:center}
  .newsletter-form{flex-direction:column}
}
@media (max-width:768px){
  .japanese-premium-hero{min-height:80vh;padding:60px 20px}
  .japanese-premium-title{font-size:2.5rem}
  .premium-product-grid{grid-template-columns:1fr}
}
`; }

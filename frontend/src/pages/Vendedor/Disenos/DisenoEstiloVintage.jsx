import React, { useMemo, useState, useRef, useEffect, Fragment } from "react";
import { Link } from "react-router-dom";
import { buildProductoHref } from "../../../lib/productHref";
import "./vintage.css";
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
} from "react-icons/fi";

/* ===== Props por defecto (igual que editor) ===== */
const DEFAULT_BLOCK_PROPS = {
  hero: { showLogo: true, showDescripcion: true, align: "center" },
  featured: { title: "Destacados", limit: 8 },
  grid: { title: "Todos los productos", limit: 12, showFilter: true },
  category: { title: "", categoriaId: null, limit: 12, showFilter: true },
  product: { productoId: null },
  banner: { title: "Colección Exclusiva", ctaText: "Descubrir", ctaUrl: "" },
  logo: { shape: "rounded", frame: "thin" },
};

/**
 * Diseño Vintage Premium – respeta el orden/props de ConfiguracionVista
 */
export default function DisenoEstiloVintage({
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

  // Paleta: permite usar colorPrincipal como acento si viene en gradiente/hex
  const tokens = useMemo(() => {
    const accent =
      extractColors(tienda?.colorPrincipal || "")?.from?.toUpperCase?.() ||
      "#D4AF37";
    return {
      gold: accent.match(/^#([0-9A-F]{6})$/i) ? accent : "#D4AF37",
      dark: "#0A0A0A",
      light: "#FFFFFF",
      cream: "#F7F4EF",
      gray: "#A8A8A8",
      border: "rgba(212,175,55,0.25)",
      glow: "rgba(212,175,55,0.25)",
    };
  }, [tienda?.colorPrincipal]);

  // Filtros globales
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
        `${p?.nombre || ""} ${p?.descripcion || ""} ${p?.detalle || ""}`
          .toLowerCase()
          .includes(needle)
      );
    }
    return list;
  }, [productos, catId, q]);

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

  // Toma props del primer bloque hero del layout (si existiera)
  const heroBlock = (orderedBlocks || []).find((b) => b?.type === "hero");
  const heroProps = { ...DEFAULT_BLOCK_PROPS.hero, ...(heroBlock?.props || {}) };

  const alignToFlex = (align) =>
    align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

  return (
    <div className="vintage-root">
      {/* Barra de progreso sutil */}
      <div className="vintage-scroll">
        <div
          className="vintage-scroll-bar"
          style={{
            width: `${scrollProgress * 100}%`,
            background: tokens.gold,
          }}
        />
      </div>

      {/* HERO */}
      <header
        ref={heroRef}
        className={`vintage-hero ${mounted ? "mounted" : ""}`}
        style={{
          backgroundImage: portada
            ? `linear-gradient(rgba(10,10,10,0.75), rgba(10,10,10,0.6)), url(${portada})`
            : `linear-gradient(135deg, ${tokens.dark}, #1b1b1b)`,
        }}
      >
        <div className="vintage-hero-overlay" />
        <div
          className="vintage-hero-content"
          style={{ alignItems: alignToFlex(heroProps.align), textAlign: heroProps.align }}
        >
          {heroProps.showLogo ? (
            logo ? (
              <div className="vintage-logo-frame" style={{ borderColor: tokens.gold }}>
                <img className="vintage-logo" src={logo} alt="logo" />
                <div className="vintage-logo-glow" />
              </div>
            ) : (
              <div className="vintage-logo placeholder" style={{ color: tokens.gold }}>
                <FiGrid size={36} />
              </div>
            )
          ) : null}

          <div className="vintage-title-wrap">
            <h1 className="vintage-title">{tienda?.nombre || "Mi Tienda"}</h1>
            {heroProps.showDescripcion && tienda?.descripcion ? (
              <p className="vintage-subtitle">{tienda.descripcion}</p>
            ) : null}
          </div>

          <div className="vintage-ornament">
            <span className="vintage-line" />
            <span className="vintage-diamond" style={{ background: tokens.gold }} />
            <span className="vintage-line" />
          </div>
        </div>
      </header>

      {/* NAV */}
      <nav className="vintage-nav" style={{ borderColor: tokens.border }}>
        <div className="vintage-nav-inner">
          <div className="vintage-search">
            <FiSearch className="vintage-search-icon" />
            <input
              type="search"
              placeholder="Buscar productos…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="vintage-search-input"
            />
          </div>

          <div className="vintage-cats">
            {catTabs.map((c) => {
              const active = String(catId) === String(c.id);
              return (
                <button
                  key={`${c.id}`}
                  className={`vintage-chip ${active ? "active" : ""}`}
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
      <main className="vintage-main">
        <VintageStatsSection
          productosCount={productos.length}
          categoriasCount={categorias.length}
        />

        {Array.isArray(orderedBlocks) && orderedBlocks.length > 0 ? (
          <RenderBlocksVintage
            layout={orderedBlocks}
            productos={productos}
            categorias={categoriasSafe(categorias)}
            tienda={tienda}
            toPublicSrc={toPublicSrc}
            globalQuery={q}
          />
        ) : (
          <>
            {productos.some((p) => p.destacado) && (
              <VintageSection title="Productos Destacados" icon={<FiStar />}>
                <div className="vintage-grid">
                  {productos
                    .filter((p) => p.destacado)
                    .slice(0, 8)
                    .map((p) => (
                      <VintageProductCard
                        key={p.id || p.uuid}
                        p={p}
                        toPublicSrc={toPublicSrc}
                      />
                    ))}
                </div>
              </VintageSection>
            )}

            <VintageSection
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
            >
              {filtered.length ? (
                <div className="vintage-grid">
                  {filtered.map((p) => (
                    <VintageProductCard
                      key={p.id || p.uuid}
                      p={p}
                      toPublicSrc={toPublicSrc}
                    />
                  ))}
                </div>
              ) : (
                <div className="vintage-empty">
                  <FiShoppingBag size={40} />
                  <p>No se encontraron productos.</p>
                </div>
              )}
            </VintageSection>
          </>
        )}

        {/* Info */}
        <VintageSection title="Información de Contacto" icon={<FiHeart />}>
          <div className="vintage-info-grid">
            <VintageInfoCard title="Contacto" icon={<FiPhone />}>
              {tienda?.telefonoContacto && (
                <div className="vintage-contact-item">
                  <FiPhone />
                  <a href={`tel:${tienda.telefonoContacto}`}>{tienda.telefonoContacto}</a>
                </div>
              )}
              {tienda?.email && (
                <div className="vintage-contact-item">
                  <FiMail />
                  <a href={`mailto:${tienda.email}`}>{tienda.email}</a>
                </div>
              )}
              {tienda?.ubicacionUrl && (
                <div className="vintage-contact-item">
                  <FiMapPin />
                  <a href={tienda.ubicacionUrl} target="_blank" rel="noreferrer">
                    Ver ubicación <FiExternalLink />
                  </a>
                </div>
              )}
              {tienda?.whatsapp && (
                <div className="vintage-contact-item">
                  <FiMessageCircle />
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`https://wa.me/${String(tienda.whatsapp).replace(/[^0-9]/g, "")}`}
                  >
                    WhatsApp
                  </a>
                </div>
              )}
            </VintageInfoCard>

            <VintageInfoCard title="Horario" icon={<FiClock />}>
              <VintageHours horario={tienda?.horario} />
            </VintageInfoCard>

            <VintageInfoCard title="Redes" icon={<FiHeart />}>
              <div className="vintage-social">
                {tienda?.redes?.facebook && (
                  <a href={tienda.redes.facebook} target="_blank" rel="noreferrer">
                    <FiFacebook /> <span>Facebook</span>
                  </a>
                )}
                {tienda?.redes?.instagram && (
                  <a href={tienda.redes.instagram} target="_blank" rel="noreferrer">
                    <FiInstagram /> <span>Instagram</span>
                  </a>
                )}
                {tienda?.redes?.tiktok && (
                  <a href={tienda.redes.tiktok} target="_blank" rel="noreferrer">
                    <FiYoutube /> <span>TikTok</span>
                  </a>
                )}
              </div>
            </VintageInfoCard>
          </div>
        </VintageSection>
      </main>

      <footer className="vintage-footer">
        <div className="vintage-footer-inner">
          <span>© {new Date().getFullYear()} {tienda?.nombre || "Mi Tienda"}</span>
          <span className="vintage-dot">•</span>
          <span>Colección Exclusiva</span>
        </div>
      </footer>
    </div>
  );
}

/* ========= Render de BLOQUES guardados ========= */
function RenderBlocksVintage({
  layout = [],
  productos = [],
  categorias = [],
  tienda,
  toPublicSrc,
  globalQuery = "",
}) {
  const catName = (id) =>
    categorias.find((c) => Number(c.id) === Number(id))?.nombre || "Categoría";

  const applyGlobal = (arr, p) => {
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
          const list = (productos || []).filter((x) => x.destacado);
          const display = applyGlobal(list, p).slice(0, p.limit ?? 8);
          if (!display.length) return null;
          return (
            <VintageSection key={b.id} title={p.title || "Destacados"} icon={<FiStar />}>
              <div className="vintage-grid">
                {display.map((prod) => (
                  <VintageProductCard
                    key={prod.id || prod.uuid}
                    p={prod}
                    toPublicSrc={toPublicSrc}
                  />
                ))}
              </div>
            </VintageSection>
          );
        }

        if (type === "grid") {
          const list = applyGlobal([...productos], p).slice(0, p.limit ?? 12);
          if (!list.length) return null;
          return (
            <VintageSection key={b.id} title={p.title || "Todos los productos"} icon={<FiShoppingBag />}>
              <div className="vintage-grid">
                {list.map((prod) => (
                  <VintageProductCard
                    key={prod.id || prod.uuid}
                    p={prod}
                    toPublicSrc={toPublicSrc}
                  />
                ))}
              </div>
            </VintageSection>
          );
        }

        if (type === "category") {
          const id = Number(p.categoriaId);
          if (!id) return null;
          const list = (productos || []).filter(
            (prod) =>
              Array.isArray(prod.categorias) &&
              prod.categorias.some((pc) => Number(pc.categoriaId) === id)
          );
          const display = applyGlobal(list, p).slice(0, p.limit ?? 12);
          if (!display.length) return null;
          return (
            <VintageSection key={b.id} title={p.title || catName(id)} icon={<FiShoppingBag />}>
              <div className="vintage-grid">
                {display.map((prod) => (
                  <VintageProductCard
                    key={prod.id || prod.uuid}
                    p={prod}
                    toPublicSrc={toPublicSrc}
                  />
                ))}
              </div>
            </VintageSection>
          );
        }

        if (type === "product") {
          const id = Number(p.productoId);
          if (!id) return null;
          const prod = (productos || []).find((x) => Number(x.id) === id);
          if (!prod) return null;
          return (
            <VintageSection key={b.id} title={prod.nombre || "Producto"} icon={<FiShoppingBag />}>
              <div className="vintage-grid">
                <VintageProductCard p={prod} toPublicSrc={toPublicSrc} />
              </div>
            </VintageSection>
          );
        }

        if (type === "banner") {
          const src = toPublicSrc?.(tienda?.bannerPromoUrl);
          return (
            <section key={b.id} className="v-section">
              <div className="v-head">
                <div className="v-icon"><FiLayers /></div>
                <h2 className="v-title">{p.title || "Colección Exclusiva"}</h2>
                <div className="v-line" />
              </div>
              <div
                className="v-banner"
                style={{ backgroundImage: src ? `url(${src})` : undefined }}
              >
                {p.ctaText ? (
                  p.ctaUrl ? (
                    <a className="v-cta" href={p.ctaUrl} target="_blank" rel="noreferrer">
                      {p.ctaText} <FiExternalLink />
                    </a>
                  ) : (
                    <em className="v-cta muted">{p.ctaText}</em>
                  )
                ) : null}
              </div>
            </section>
          );
        }

        if (type === "logo") {
          const src = toPublicSrc?.(tienda?.logo?.url || tienda?.logoUrl);
          return (
            <section key={b.id} className="v-section v-center">
              {src ? <img src={src} alt="logo" style={{ maxWidth: 180, filter: "brightness(.95)" }} /> : null}
            </section>
          );
        }

        return null;
      })}
    </>
  );
}

/* ========= Componentes auxiliares ========= */

function VintageStatsSection({ productosCount, categoriasCount }) {
  return (
    <section className="vintage-stats">
      <div className="vintage-stats-grid">
        <div className="vintage-stat">
          <div className="vintage-stat-ico"><FiShoppingCart /></div>
          <div className="vintage-stat-body">
            <h3>{productosCount}</h3>
            <p>Productos Totales</p>
          </div>
        </div>
        <div className="vintage-stat">
          <div className="vintage-stat-ico"><FiLayers /></div>
          <div className="vintage-stat-body">
            <h3>{categoriasCount}</h3>
            <p>Categorías</p>
          </div>
        </div>
        <div className="vintage-stat">
          <div className="vintage-stat-ico"><FiTrendingUp /></div>
          <div className="vintage-stat-body">
            <h3>100%</h3>
            <p>Calidad Garantizada</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function VintageSection({ title, icon, children }) {
  return (
    <section className="v-section">
      <div className="v-head">
        <div className="v-icon">{icon}</div>
        <h2 className="v-title">{title}</h2>
        <div className="v-line" />
      </div>
      {children}
    </section>
  );
}

function VintageInfoCard({ title, icon, children }) {
  return (
    <div className="vintage-info-card">
      <div className="vintage-info-head">
        <div className="vintage-info-ico">{icon}</div>
        <h3 className="vintage-info-title">{title}</h3>
      </div>
      <div className="vintage-info-content">{children}</div>
    </div>
  );
}

function VintageProductCard({ p = {}, toPublicSrc }) {
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

  const to = buildProductoHref(p);

  const Media = ({ children }) =>
    to ? (
      <Link to={to} className="vp-media" title="Ver detalles">
        {children}
      </Link>
    ) : (
      <div className="vp-media">{children}</div>
    );

  return (
    <article className="vp-card">
      <div className="vp-frame" />
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
                     <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#A8A8A8' font-family='Georgia' font-size='16'>Sin imagen</text>
                   </svg>`
                );
            }}
          />
        ) : (
          <div className="vp-placeholder"><FiShoppingBag size={24} /></div>
        )}
        {p.destacado && (
          <span className="vp-badge"><FiStar size={14} /> Exclusivo</span>
        )}
      </Media>

      <div className="vp-body">
        <div className="vp-top">
          <h4 className="vp-title">
            {to ? (
              <Link to={to} className="vp-link">{p?.nombre || p?.title || "Producto"}</Link>
            ) : (
              <span>{p?.nombre || p?.title || "Producto"}</span>
            )}
          </h4>
          {categoria && <span className="vp-chip">{categoria}</span>}
        </div>

        {p?.descripcion && (
          <p className="vp-desc">
            {String(p.descripcion).length > 110
              ? `${String(p.descripcion).slice(0, 110)}…`
              : String(p.descripcion)}
          </p>
        )}

        <div className="vp-foot">
          {conPrecio ? (
            <span className="vp-price">{precio}</span>
          ) : (
            <span className="vp-variants">Con variantes</span>
          )}
          {to && <Link to={to} className="vp-btn">Ver detalles</Link>}
        </div>
      </div>
    </article>
  );
}

function VintageHours({ horario = {} }) {
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
    <div className="vintage-hours">
      {dias.map((d) => (
        <Fragment key={d.id}>
          <span className="vintage-hours-day">{d.label}</span>
          <span className="vintage-hours-time">{horario?.[d.id] || "Cerrado"}</span>
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
  return { from: m?.[0] || "", to: m?.[1] || "" };
}

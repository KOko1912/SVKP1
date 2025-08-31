// Página pública – respeta el layout del vendedor (mismos bloques/props que Pagina.jsx)

import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import "./Vendedor/Vendedor.css";
import "./Vendedor/PaginaGrid.css";
import {
  FiFacebook, FiInstagram, FiYoutube, FiPhone, FiMail, FiClock,
  FiMapPin, FiExternalLink, FiMessageCircle, FiShoppingBag, FiStar,
  FiEye, FiSearch, FiTruck, FiCreditCard, FiRefreshCw
} from "react-icons/fi";
import { useParams, Link } from "react-router-dom";
import NavBarUsuario from "./Usuario/NavBarUsuario";

/* ================= Bases ================= */
const API   = (import.meta.env.VITE_API_URL    || "http://localhost:5000").replace(/\/$/, "");
const FILES = (import.meta.env.VITE_FILES_BASE || API).replace(/\/$/, "");

/* ================= Helpers ================= */
const grad = (from, to) => `linear-gradient(135deg, ${from}, ${to})`;

/** 🔗 Normaliza cualquier URL (absoluta de Supabase o relativa local) */
const toPublicSrc = (u) => {
  const v =
    typeof u === "string"
      ? u
      : (u?.url || u?.path || u?.src || u?.href || u?.filepath || u?.location || u?.image || u?.thumbnail || "");
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `${FILES}${v.startsWith("/") ? "" : "/"}${v}`;
};

// Fetch robusto
async function getJsonOrThrow(url) {
  const r = await fetch(url);
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* noop */ }
  if (!r.ok) {
    const msg = data?.error || data?.message || (`HTTP ${r.status}: ` + (text || "").slice(0,120));
    throw new Error(msg);
  }
  return data ?? {};
}

/* Defaults de bloques (mismo mapa que editor/pagina) */
const DEFAULT_PROPS = {
  hero:     { showLogo: true, showDescripcion: true, align: 'center' },
  featured: { title: 'Destacados', limit: 8 },
  grid:     { title: 'Todos los productos', limit: 12, showFilter: true },
  category: { title: '', categoriaId: null, limit: 12, showFilter: true },
  product:  { productoId: null },
  banner:   { title: 'Promoción', ctaText: 'Ver más', ctaUrl: '' },
  logo:     { shape: 'rounded', frame: 'thin' },
};

/* ================= Hook: media query (para alternar grid/carrusel) ================= */
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const m = window.matchMedia(query);
    const onChange = () => setMatches(m.matches);
    onChange();
    m.addEventListener?.("change", onChange);
    return () => m.removeEventListener?.("change", onChange);
  }, [query]);
  return matches;
}

/* ================= Página pública ================= */
export default function SVKT() {
  const { slug } = useParams();
  const [tienda, setTienda] = useState(null);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const usuario = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("usuario") || "null"); } catch { return null; }
  }, []);

  // Tema
  useEffect(() => {
    document.body.classList.add("vendor-theme");
    return () => document.body.classList.remove("vendor-theme");
  }, []);

  useEffect(() => {
    if (!tienda?.colorPrincipal) return;
    const { from, to } = extractColors(tienda.colorPrincipal);
    const contrast = bestTextOn(from, to);
    const root = document.documentElement.style;

    root.setProperty("--brand-from", from);
    root.setProperty("--brand-to", to);
    root.setProperty("--brand-contrast", contrast);
    root.setProperty("--brand-gradient", grad(from, to));
    root.setProperty("--primary-color", from);
    root.setProperty("--primary-hover", from);

    // Colores más sutiles para mejor contraste
    root.setProperty("--brand-from-light", hexToRgba(from, 0.15));
    root.setProperty("--brand-to-light", hexToRgba(to, 0.15));
    root.setProperty("--brand-shadow", hexToRgba(from, 0.25));

    const softHalos =
      `radial-gradient(900px 600px at 0% -10%, ${hexToRgba(from, 0.2)}, transparent 60%),` +
      `radial-gradient(900px 600px at 100% -10%, ${hexToRgba(to, 0.2)}, transparent 60%)`;
    const pageBg = `${softHalos}, linear-gradient(135deg, ${from}, ${to})`;
    root.setProperty("--page-bg", pageBg);
  }, [tienda?.colorPrincipal]);

  // Carga pública por slug
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const tiendaData = await getJsonOrThrow(`${API}/api/tienda/public/${encodeURIComponent(slug)}`);
        setTienda(tiendaData);

        try {
          const dp = await getJsonOrThrow(`${API}/api/v1/productos?tiendaId=${tiendaData.id}`);
          setProductos(Array.isArray(dp?.items) ? dp.items : Array.isArray(dp) ? dp : []);
        } catch { setProductos([]); }

        try {
          const dc = await getJsonOrThrow(`${API}/api/v1/categorias?tiendaId=${tiendaData.id}`);
          setCategorias(Array.isArray(dc) ? dc : []);
        } catch { setCategorias([]); }
      } catch (e) {
        setError(e.message || "No se encontró la tienda");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  // Normaliza y ordena los bloques igual que en Pagina.jsx
  const orderedBlocks = useMemo(() => {
    const raw = tienda?.homeLayout ?? null;
    const blocks = Array.isArray(raw) ? raw : Array.isArray(raw?.blocks) ? raw.blocks : [];
    const withDefaults = blocks.map(b => ({
      ...b,
      props: { ...(DEFAULT_PROPS[b.type] || {}), ...(b.props || {}) },
      gs: { ...(b.gs || {}) },
      z: Number.isFinite(+b.z) ? +b.z : 1,
    }));
    return withDefaults.sort((a, b) => {
      const ay = a.gs?.y ?? 0, by = b.gs?.y ?? 0;
      if (ay !== by) return ay - by;
      const ax = a.gs?.x ?? 0, bx = b.gs?.x ?? 0;
      if (ax !== bx) return ax - bx;
      return (a.z||1) - (b.z||1);
    });
  }, [tienda?.homeLayout]);

  /* ===== Inyectar estilos adicionales (arregla cards en desktop/móvil) ===== */
  useEffect(() => {
    const css = `
@media (min-width: 1024px) {
  .row-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 24px;
  }
}
.poster-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  background: rgba(0,0,0,0.18);
  box-shadow: 0 14px 28px var(--brand-shadow, rgba(0,0,0,.25));
  overflow: hidden;
  min-height: 420px;
}
.poster-media {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
}
.poster-media > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.poster-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px 16px;
  flex: 1;
}
.poster-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.poster-title {
  font-weight: 800;
  line-height: 1.15;
  color: var(--text-primary, #fff);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.poster-desc {
  color: var(--text-secondary, #e5e7eb);
  font-size: .92rem;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 3.9em;
}
.poster-footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.poster-price .price { font-weight: 900; font-size: 1.15rem; }
.poster-price .original-price { margin-left: 8px; text-decoration: line-through; opacity: .7; }

.row-scroll {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 76%;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 6px;
}
@media (min-width: 480px) and (max-width: 1023.98px) {
  .row-scroll { grid-auto-columns: 58%; }
}
.row-scroll > .poster-card { scroll-snap-align: start; }

/* extras que ya tenías */
.banner-cta { color:#fff; margin-left:12px; text-decoration:underline; font-weight:600; transition:opacity .2s; }
.banner-cta:hover { opacity:.9; }
.current-day { color: var(--brand-from); font-weight:600; }
.footer-credits { margin-top:2rem; padding-top:1.5rem; border-top:1px solid rgba(255,255,255,.1); text-align:center; color:var(--text-tertiary); font-size:.9rem; }
.btn-sm { padding:.5rem 1rem; font-size:.9rem; }
    `.trim();
    const id = "svkt-inline-fixes";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.innerText = css;
      document.head.appendChild(el);
    }
  }, []);

  if (loading) {
    return (
      <div className="vendedor-container">
        {usuario ? <NavBarUsuario /> : null}
        <div className="loading-screen">
          <div className="loading-spinner" />
          <div>Cargando tienda...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vendedor-container">
        {usuario ? <NavBarUsuario /> : null}
        <div className="error-message">
          <h2>Tienda no encontrada</h2>
          <p>{error}</p>
          <Link to="/" className="btn btn-primary">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="vendedor-container">
      {usuario ? <NavBarUsuario /> : null}

      {/* Si el layout no trae hero, muestra uno por defecto */}
      {!(orderedBlocks || []).some(b => b.type === "hero") && <HeroPortada tienda={tienda} />}

      <VendorInfoSection tienda={tienda} />

      {(orderedBlocks || []).length > 0 ? (
        <RenderBlocks
          layout={orderedBlocks}
          productos={productos}
          categorias={categorias}
          tienda={tienda}
        />
      ) : (
        <>
          <RowSection title="Todos los productos" icon={<FiShoppingBag />} items={productos} />
          {productos.some(p => p.destacado) && (
            <RowSection title="Destacados" icon={<FiStar />} items={productos.filter(p => p.destacado)} />
          )}
          {categorias.map(cat => {
            const items = productos.filter(p =>
              Array.isArray(p.categorias) && p.categorias.some(pc => pc.categoriaId === cat.id)
            );
            if (!items.length) return null;
            return <RowSection key={cat.id} title={cat.nombre} icon={<FiShoppingBag />} items={items} />;
          })}
        </>
      )}

      <StorePolicies tienda={tienda} />
      <SocialLinks redes={tienda?.redes} />
      <ContactFooter tienda={tienda} />
    </div>
  );
}

/* =============== Render de bloques (con buscador y CTA en banner) =============== */
function RenderBlocks({ layout = [], productos = [], categorias = [], tienda }) {
  if (!Array.isArray(layout) || !layout.length) return null;
  const catName = (id) => categorias.find(c => Number(c.id) === Number(id))?.nombre || "Categoría";

  return (
    <>
      {layout.map(b => {
        const type = b.type;
        const p = b.props || {};

        if (type === "hero") {
          return (
            <HeroPortada
              key={b.id}
              tienda={tienda}
              align={p.align}
              showLogo={p.showLogo}
              showDescripcion={p.showDescripcion}
            />
          );
        }

        if (type === "featured") {
          const items = productos.filter(x => x.destacado).slice(0, p.limit ?? 8);
          if (!items.length) return null;
          return <RowSection key={b.id} title={p.title || "Destacados"} icon={<FiStar />} items={items} />;
        }

        if (type === "grid") {
          const items = productos.slice(0, p.limit ?? 12);
          if (!items.length) return null;
          return (
            <RowSection
              key={b.id}
              title={p.title || "Todos los productos"}
              icon={<FiShoppingBag />}
              items={items}
              enableSearch={!!p.showFilter}
            />
          );
        }

        if (type === "category") {
          const id = Number(p.categoriaId);
          if (!id) return null;
          const items = productos
            .filter(prod => Array.isArray(prod.categorias) && prod.categorias.some(pc => Number(pc.categoriaId) === id))
            .slice(0, p.limit ?? 12);
          if (!items.length) return null;
          return (
            <RowSection
              key={b.id}
              title={p.title || catName(id)}
              icon={<FiShoppingBag />}
              items={items}
              enableSearch={!!p.showFilter}
            />
          );
        }

        if (type === "product") {
          const id = Number(p.productoId);
          if (!id) return null;
          const item = productos.find(prod => Number(prod.id) === id);
          if (!item) return null;
          return <RowSection key={b.id} title={item.nombre || "Producto"} icon={<FiShoppingBag />} items={[item]} />;
        }

        if (type === "banner") {
          const src = toPublicSrc(tienda?.bannerPromoUrl);
          return (
            <section key={b.id} className="store-section">
              <div className="pv-banner" style={{ backgroundImage: src ? `url(${src})` : undefined }}>
                <div className="pv-banner-content">
                  <strong>{p.title || "Promoción"}</strong>
                  {p.ctaText ? (
                    p.ctaUrl
                      ? <a href={p.ctaUrl} target="_blank" rel="noreferrer" className="banner-cta">{p.ctaText}</a>
                      : <em style={{ marginLeft: 8 }}>{p.ctaText}</em>
                  ) : null}
                </div>
              </div>
            </section>
          );
        }

        if (type === "logo") {
          const logoUrl = toPublicSrc(tienda?.logo?.url || tienda?.logoUrl);
          return (
            <section key={b.id} className="store-section" style={{ display: "grid", placeItems: "center" }}>
              {logoUrl ? <img src={logoUrl} alt="logo" style={{ maxWidth: 180 }} /> : null}
            </section>
          );
        }

        return null;
      })}
    </>
  );
}

/* =============== Componentes UI =============== */
function HeroPortada({ tienda, align = "center", showLogo = true, showDescripcion = true }) {
  const portada = toPublicSrc(tienda?.portada?.url || tienda?.portadaUrl);
  const logo    = toPublicSrc(tienda?.logo?.url    || tienda?.logoUrl);
  const colors  = extractColors(tienda?.colorPrincipal || grad("#6d28d9", "#c026d3"));

  const justify =
    align === "left" ? "flex-start" :
    align === "right" ? "flex-end" :
    "center";

  return (
    <header
      className="tienda-hero"
      style={{
        backgroundImage: portada
          ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.35)), url(${portada})`
          : grad(colors.from, colors.to),
        color: bestTextOn(colors.from, colors.to),
        justifyContent: justify
      }}
    >
      <div className="tienda-hero-content" style={{ textAlign: align }}>
        {showLogo && logo && <img src={logo} alt="Logo" className="tienda-hero-logo" loading="lazy" />}
        <div>
          <h1>{tienda?.nombre || "Mi Tienda"}</h1>
          {showDescripcion && <p>{tienda?.descripcion || "Descripción de la tienda"}</p>}
        </div>
      </div>
    </header>
  );
}

function VendorInfoSection({ tienda }) {
  const logo = toPublicSrc(tienda?.logo?.url || tienda?.logoUrl);
  return (
    <section className="store-section">
      <div className="store-info-card">
        <div className="store-info-header">
          {logo ? (
            <img src={logo} alt="Logo" className="store-logo" loading="lazy" />
          ) : (
            <div className="store-logo placeholder" />
          )}
          <div>
            <h2>{tienda?.nombre || "Mi Tienda"}</h2>
            <div className="store-categories">
              {tienda?.categoria && <span>{tienda.categoria}</span>}
              {(tienda?.subcategorias || []).map((cat, i) => (<span key={i}>{cat}</span>))}
            </div>
          </div>
        </div>

        <div className="store-info-body">
          <p>{tienda?.descripcion || "No hay descripción disponible"}</p>
          <div className="store-contact-buttons">
            {tienda?.telefonoContacto && (
              <a href={`tel:${tienda.telefonoContacto}`} className="btn btn-primary"><FiPhone /> Llamar</a>
            )}
            {tienda?.telefonoContacto && (
              <a className="btn" href={`https://wa.me/${String(tienda.telefonoContacto).replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer">
                <FiMessageCircle /> WhatsApp
              </a>
            )}
            {tienda?.email && (<a href={`mailto:${tienda.email}`} className="btn"><FiMail /> Email</a>)}
            {tienda?.ubicacionUrl && (
              <a href={tienda.ubicacionUrl} className="btn" target="_blank" rel="noreferrer">
                <FiMapPin /> Ubicación <FiExternalLink />
              </a>
            )}
          </div>
        </div>
      </div>

      <StoreHours horario={tienda?.horario} />
    </section>
  );
}

function StoreHours({ horario = {} }) {
  const dias = [
    { id: "lun", label: "Lunes" }, { id: "mar", label: "Martes" },
    { id: "mie", label: "Miércoles" }, { id: "jue", label: "Jueves" },
    { id: "vie", label: "Viernes" }, { id: "sab", label: "Sábado" }, { id: "dom", label: "Domingo" },
  ];

  // Determinar día actual
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'short' }).toLowerCase().substring(0, 3);

  return (
    <div className="store-hours">
      <h3><FiClock /> Horario de atención</h3>
      <div className="hours-grid">
        {dias.map(dia => {
          const isToday = dia.id === today;
          return (
            <Fragment key={dia.id}>
              <span className={isToday ? "current-day" : ""}>{dia.label}{isToday ? " (Hoy)" : ""}</span>
              <span className={isToday ? "current-day" : ""}>{horario[dia.id] || "Cerrado"}</span>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function RowSection({ title, icon, items = [], enableSearch = false }) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const ref = useRef(null);
  const [showControls, setShowControls] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!enableSearch || !q.trim()) return items;
    const needle = q.toLowerCase();
    return items.filter(p => {
      const t = `${p?.nombre||p?.title||""} ${p?.descripcion||p?.detalle||p?.resumen||""}`.toLowerCase();
      return t.includes(needle);
    });
  }, [items, enableSearch, q]);

  const checkScroll = () => {
    if (!ref.current) return;
    const el = ref.current;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    checkScroll();
    return () => el.removeEventListener("scroll", checkScroll);
  }, []);

  const scrollBy = (dx) => {
    if (ref.current) {
      ref.current.scrollBy({ left: dx, behavior: "smooth" });
      setTimeout(checkScroll, 320);
    }
  };

  return (
    <section
      className="store-section"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div className="row-head">
        <h2 className="section-title">
          {icon} {title} <span className="item-count">({filtered.length})</span>
        </h2>

        <div className="row-tools">
          {enableSearch && (
            <label className="grid-filter">
              <FiSearch />
              <input
                type="search"
                placeholder="Buscar en esta sección…"
                value={q}
                onChange={(e)=>setQ(e.target.value)}
              />
            </label>
          )}
          {!isDesktop && filtered.length > 0 && (
            <div className={`row-actions ${showControls ? "visible" : ""}`}>
              <button type="button" className="btn-circle" onClick={() => scrollBy(-380)} disabled={!canScrollLeft} aria-label="Anterior">◀</button>
              <button type="button" className="btn-circle" onClick={() => scrollBy(380)} disabled={!canScrollRight} aria-label="Siguiente">▶</button>
            </div>
          )}
        </div>
      </div>

      {isDesktop ? (
        <div className="row-grid">
          {filtered.length > 0 ? (
            filtered.map((p) => <PosterCard key={p.id || `p-${p._id}`} p={p} />)
          ) : (
            <div className="empty-state">
              <FiShoppingBag size={48} />
              <p>No hay productos en esta sección</p>
            </div>
          )}
        </div>
      ) : (
        <div ref={ref} className="row-scroll">
          {filtered.length > 0 ? (
            filtered.map((p) => <PosterCard key={p.id || `p-${p._id}`} p={p} />)
          ) : (
            <div className="empty-state">
              <FiShoppingBag size={48} />
              <p>No hay productos en esta sección</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function PosterCard({ p = {} }) {
  const pickImage = (prod) => {
    const candidates = [
      prod?.imagenes?.find(x => x?.isPrincipal)?.url,
      prod?.imagenes?.[0]?.url,
      prod?.imagen, prod?.thumb, prod?.foto, prod?.cover
    ].filter(Boolean);
    return toPublicSrc(candidates[0]);
  };

  const img = pickImage(p);
  const categoria =
    p?.categoria?.nombre ||
    p?.categoria ||
    (Array.isArray(p?.categorias) ? (p.categorias[0]?.nombre || p.categorias[0]?.categoria?.nombre) : "") ||
    p?.category ||
    "";

  const conPrecio =
    typeof p?.precio === "number" || (typeof p?.precio === "string" && p.precio.trim() !== "");

  const desc = (p?.descripcion || p?.detalle || p?.resumen || "").toString().trim();

  // Enlace público por UUID
  const publicHref = p?.uuid ? `/producto/${p.uuid}` : null;

  const Media = ({ children }) =>
    publicHref ? (
      <Link
        to={publicHref}
        className="poster-media"
        aria-label={`Ver ${p?.nombre || "producto"}`}
        style={{ display: "block", textDecoration: "none" }}
      >
        {children}
      </Link>
    ) : (
      <div className="poster-media">{children}</div>
    );

  return (
    <article className="poster-card">
      <span className="poster-glow" aria-hidden="true" />

      <Media>
        {img ? (
          <img
            src={img}
            alt={p?.nombre || "producto"}
            loading="eager"
            decoding="async"
            width={480}
            height={360}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src =
                "data:image/svg+xml;utf8," +
                encodeURIComponent(
                  `<svg xmlns='http://www.w3.org/2000/svg' width='480' height='360'>
                      <rect width='100%' height='100%' fill='#f3f4f6'/>
                      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#9ca3af' font-family='sans-serif' font-size='16'>Sin imagen</text>
                   </svg>`
                );
            }}
          />
        ) : (
          <div className="image-placeholder"><FiShoppingBag size={24} /></div>
        )}
        {p.destacado && <div className="featured-badge"><FiStar size={14} /></div>}
      </Media>

      <div className="poster-body">
        <div className="poster-header">
          {publicHref ? (
            <Link to={publicHref} className="poster-title" title={p?.nombre} style={{ textDecoration: "none" }}>
              {p?.nombre || p?.title || "Producto"}
            </Link>
          ) : (
            <h4 className="poster-title" title={p?.nombre}>{p?.nombre || p?.title || "Producto"}</h4>
          )}

          {categoria && <div className="poster-chip">{categoria}</div>}
        </div>

        {desc && <p className="poster-desc">{desc.length > 80 ? `${desc.substring(0, 80)}…` : desc}</p>}

        <div className="poster-footer">
          {conPrecio ? (
            <div className="poster-price">
              <span className="price">
                {(() => {
                  const n = Number(p.precio || 0);
                  return isFinite(n) ? `$${n.toFixed(2)}` : "$0.00";
                })()}
              </span>
              {p.precioOriginal && (
                <span className="original-price">
                  {(() => {
                    const n = Number(p.precioOriginal);
                    return isFinite(n) ? `$${n.toFixed(2)}` : "";
                  })()}
                </span>
              )}
            </div>
          ) : (
            <span className="poster-badge">Con variantes</span>
          )}

          {publicHref && (
            <Link to={publicHref} className="btn btn-primary btn-sm">
              <FiEye /> Ver detalle
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

/* =============== Policies / Social / Footer =============== */
function StorePolicies({ tienda }) {
  return (
    <section className="store-section policies-section">
      <div className="policy-card">
        <div className="policy-icon">
          <FiTruck size={24} />
        </div>
        <h3>Envíos</h3>
        <p>{tienda?.envioCobertura || "No especificado"}</p>
        <p>{tienda?.envioCosto || "Costo no especificado"}</p>
        <p>{tienda?.envioTiempo || "Tiempo no especificado"}</p>
      </div>
      <div className="policy-card">
        <div className="policy-icon">
          <FiCreditCard size={24} />
        </div>
        <h3>Métodos de pago</h3>
        <div className="payment-methods">
          {(tienda?.metodosPago || []).map((metodo, i) => (<span key={i}>{metodo}</span>))}
        </div>
      </div>
      <div className="policy-card">
        <div className="policy-icon">
          <FiRefreshCw size={24} />
        </div>
        <h3>Devoluciones</h3>
        <p>{tienda?.devoluciones || "Política no especificada"}</p>
      </div>
    </section>
  );
}

function SocialLinks({ redes = {} }) {
  if (!redes?.facebook && !redes?.instagram && !redes?.tiktok) return null;
  return (
    <section className="store-section social-section">
      <h2 className="section-title">Síguenos</h2>
      <div className="social-links">
        {redes.facebook && (
          <a href={redes.facebook} target="_blank" rel="noopener noreferrer" className="social-link facebook">
            <FiFacebook /> Facebook
          </a>
        )}
        {redes.instagram && (
          <a href={redes.instagram} target="_blank" rel="noopener noreferrer" className="social-link instagram">
            <FiInstagram /> Instagram
          </a>
        )}
        {redes.tiktok && (
          <a href={redes.tiktok} target="_blank" rel="noopener noreferrer" className="social-link tiktok">
            <FiYoutube /> TikTok
          </a>
        )}
      </div>
    </section>
  );
}

function ContactFooter({ tienda }) {
  const tel = tienda?.telefonoContacto;
  const mail = tienda?.email;
  return (
    <footer className="store-footer">
      <div className="footer-section">
        <div>
          <h3>Contacto</h3>
          {tel && <p><FiPhone /> {tel}</p>}
          {mail && <p><FiMail /> {mail}</p>}
        </div>
        <div className="footer-credits">
          <p>Tienda creada con SVKT</p>
        </div>
      </div>
    </footer>
  );
}

/* =============== Helpers color =============== */
function extractColors(gradientString) {
  const m = gradientString?.match(/#([0-9a-f]{6})/gi);
  return { from: m?.[0] || "#6d28d9", to: m?.[1] || "#c026d3" };
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
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function bestTextOn(hexA, hexB) {
  const L = (luminance(hexToRgb(hexA)) + luminance(hexToRgb(hexB))) / 2;
  return L > 0.45 ? "#111111" : "#ffffff";
}

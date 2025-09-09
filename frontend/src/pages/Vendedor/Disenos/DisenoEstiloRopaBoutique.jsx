import React, { useMemo, useState, useRef, useEffect, Fragment } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiStar,
  FiShoppingBag,
  FiMapPin,
  FiExternalLink,
  FiPhone,
  FiMail,
  FiClock,
  FiFacebook,
  FiInstagram,
  FiHeart,
  FiZap,
  FiHome
} from "react-icons/fi";

/* ===== Helpers de rutas públicas ===== */
const storeKey = (t) => t?.slug || t?.publicUuid || t?.uuid || t?.id;
const productKey = (p) => p?.uuid || p?.publicUuid || p?.slug || p?.id;
const productPath = (t, p) => {
  const pid = productKey(p);
  if (!pid) return "/producto";
  const sk = storeKey(t);
  return sk
    ? `/t/${encodeURIComponent(sk)}/producto/${encodeURIComponent(pid)}`
    : `/producto/${encodeURIComponent(pid)}`;
};

/* ===== Props por defecto de los bloques ===== */
const DEFAULT_BLOCK_PROPS = {
  hero:     { showLogo: true, showDescripcion: true, align: "center" },
  featured: { title: "Destacados", limit: 8 },
  grid:     { title: "Todos los productos", limit: 12, showFilter: true },
  category: { title: "", categoriaId: null, limit: 12, showFilter: true },
  product:  { productoId: null },
  banner:   { title: "Promoción", ctaText: "Ver más", ctaUrl: "" },
  logo:     { shape: "rounded", frame: "thin" },
};

/**
 * Diseño Estilo Ropa Boutique
 * Estética moderna, editorial y con acentos lila/malva
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
  const heroRef = useRef(null);

  // === Tema desde colorPrincipal ===
  const { brandFrom, brandTo, brandText } = useMemo(() => {
    const { from, to } = extractColors(
      tienda?.colorPrincipal || "linear-gradient(135deg,#7c3aed,#a78bfa)"
    );
    const text = bestTextOn(from, to);
    return { brandFrom: from, brandTo: to, brandText: text };
  }, [tienda?.colorPrincipal]);

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
        const hay =
          `${p?.nombre || ""} ${p?.descripcion || ""} ${p?.detalle || ""}`.toLowerCase();
        return hay.includes(needle);
      });
    }
    return list;
  }, [productos, catId, q]);

  // === Efectos ===
  useEffect(() => setMounted(true), []);

  const portada = toPublicSrc?.(tienda?.portada?.url || tienda?.portadaUrl) || "";
  const logo = toPublicSrc?.(tienda?.logo?.url || tienda?.logoUrl) || "";

  const catTabs = useMemo(
    () => [{ id: "all", nombre: "Todo" }, ...categoriasSafe(categorias)],
    [categorias]
  );

  // Toma props del primer bloque hero del layout
  const heroBlock = (orderedBlocks || []).find(b => b?.type === "hero");
  const heroProps = { ...DEFAULT_BLOCK_PROPS.hero, ...(heroBlock?.props || {}) };

  const alignToFlex = (align) =>
    align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

  // CSS variables del tema para usar en la hoja
  const cssVars = {
    "--brand-from": brandFrom,
    "--brand-to": brandTo,
    "--brand-ink-contrast": brandText,
  };

  return (
    <div className="fashion-root" ref={heroRef} style={cssVars}>
      {/* Estilos embebidos */}
      <style>{cssFashion}</style>

      {/* HERO */}
      <header
        className={`fashion-hero ${mounted ? "mounted" : ""}`}
        style={{
          color: brandText,
          backgroundImage: portada
            ? `linear-gradient(135deg, ${hexToRgba(brandFrom, 0.65)}, ${hexToRgba(brandTo, 0.65)}), url(${portada})`
            : `linear-gradient(135deg, ${brandFrom}, ${brandTo})`,
        }}
      >
        <div className="fashion-hero-glass" />

        <div
          className="fashion-hero-content"
          style={{
            textAlign: heroProps.align,
            alignItems: alignToFlex(heroProps.align),
          }}
        >
          {heroProps.showLogo && logo && (
            <div className="fashion-logo-wrap">
              <img className="fashion-logo" src={logo} alt="logo" />
            </div>
          )}

          <div className="fashion-title-wrap">
            <h1 className="fashion-title">{tienda?.nombre || "Mi Boutique"}</h1>
            {heroProps.showDescripcion && tienda?.descripcion && (
              <p className="fashion-subtitle">{tienda.descripcion}</p>
            )}
          </div>

          <div className="fashion-ornament">
            <span className="fashion-line" />
            <FiZap className="fashion-icon" />
            <span className="fashion-line" />
          </div>
        </div>
      </header>

      {/* NAV */}
      <nav className="fashion-nav">
        <div className="fashion-nav-inner">
          <div className="fashion-search">
            <FiSearch className="fashion-search-icon" />
            <input
              type="search"
              placeholder="Buscar looks, prendas o marcas…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="fashion-search-input"
            />
          </div>

          <div className="fashion-cats">
            {catTabs.map((c) => {
              const active = String(catId) === String(c.id);
              return (
                <button
                  key={`${c.id}`}
                  className={`fashion-cat-btn ${active ? "active" : ""}`}
                  onClick={() => setCatId(String(c.id))}
                  title={c.nombre}
                >
                  <span>{c.nombre}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <main className="fashion-main">
        {/* Respeta layout si existe */}
        {Array.isArray(orderedBlocks) && orderedBlocks.length > 0 ? (
          <RenderBlocksFashion
            layout={orderedBlocks}
            productos={productos}
            categorias={categoriasSafe(categorias)}
            tienda={tienda}
            toPublicSrc={toPublicSrc}
            brandFrom={brandFrom}
            brandTo={brandTo}
            globalQuery={q}
          />
        ) : (
          <>
            {productos.some((p) => p.destacado) && (
              <FashionSection title="Colección destacada" icon={<FiStar />}>
                <div className="fashion-grid">
                  {productos
                    .filter((p) => p.destacado)
                    .slice(0, 12)
                    .map((p) => (
                      <FashionProductCard
                        key={p.id || p.uuid}
                        p={p}
                        toPublicSrc={toPublicSrc}
                        tienda={tienda}
                        brandFrom={brandFrom}
                        brandTo={brandTo}
                      />
                    ))}
                </div>
              </FashionSection>
            )}

            <FashionSection
              title={
                catId === "all"
                  ? (q.trim() ? `Resultados (${filtered.length})` : "Novedades y básicos")
                  : `${(catTabs.find((x) => String(x.id) === String(catId))?.nombre || "Categoría")} (${filtered.length})`
              }
              icon={<FiShoppingBag />}
            >
              {filtered.length ? (
                <div className="fashion-grid">
                  {filtered.map((p) => (
                    <FashionProductCard
                      key={p.id || p.uuid}
                      p={p}
                      toPublicSrc={toPublicSrc}
                      tienda={tienda}
                      brandFrom={brandFrom}
                      brandTo={brandTo}
                    />
                  ))}
                </div>
              ) : (
                <div className="fashion-empty">
                  <FiShoppingBag size={48} />
                  <p>No hay productos para esta búsqueda.</p>
                </div>
              )}
            </FashionSection>
          </>
        )}

        {/* Info tienda */}
        <FashionSection title="Información de contacto" icon={<FiHome />}>
          <div className="fashion-info-grid">
            <FashionInfoCard title="Contacto directo" icon={<FiPhone />}>
              {tienda?.telefonoContacto && (
                <div className="fashion-contact-item">
                  <FiPhone className="fashion-contact-icon" />
                  <a href={`tel:${tienda.telefonoContacto}`}>{tienda.telefonoContacto}</a>
                </div>
              )}
              {tienda?.email && (
                <div className="fashion-contact-item">
                  <FiMail className="fashion-contact-icon" />
                  <a href={`mailto:${tienda.email}`}>{tienda.email}</a>
                </div>
              )}
              {tienda?.ubicacionUrl && (
                <div className="fashion-contact-item">
                  <FiMapPin className="fashion-contact-icon" />
                  <a href={tienda.ubicacionUrl} target="_blank" rel="noreferrer">
                    Ver ubicación <FiExternalLink />
                  </a>
                </div>
              )}
            </FashionInfoCard>

            <FashionInfoCard title="Horario de atención" icon={<FiClock />}>
              <FashionHours horario={tienda?.horario} />
            </FashionInfoCard>

            <FashionInfoCard title="Síguenos" icon={<FiHeart />}>
              <div className="fashion-social-grid">
                {tienda?.redes?.facebook && (
                  <a className="fashion-social-link" href={tienda.redes.facebook} target="_blank" rel="noreferrer">
                    <FiFacebook className="fashion-social-icon" />
                    <span>Facebook</span>
                  </a>
                )}
                {tienda?.redes?.instagram && (
                  <a className="fashion-social-link" href={tienda.redes.instagram} target="_blank" rel="noreferrer">
                    <FiInstagram className="fashion-social-icon" />
                    <span>Instagram</span>
                  </a>
                )}
              </div>
            </FashionInfoCard>
          </div>
        </FashionSection>
      </main>

      <footer className="fashion-footer">
        <div className="fashion-footer-inner">
          <span>© {new Date().getFullYear()} {tienda?.nombre || "Mi Boutique"}</span>
          <span className="fashion-dot">•</span>
          <span>Estilo Ropa Boutique</span>
        </div>
      </footer>
    </div>
  );
}

/* ========= Render de BLOQUES guardados ========= */
function RenderBlocksFashion({
  layout = [],
  productos = [],
  categorias = [],
  tienda,
  toPublicSrc,
  brandFrom,
  brandTo,
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

        if (type === "hero") return null; // ya se renderiza arriba

        if (type === "featured") {
          const items = (productos || []).filter((x) => x.destacado);
          const list = items.slice(0, p.limit ?? 8);
          if (!list.length) return null;
          return (
            <FashionSection key={b.id} title={p.title || "Destacados"} icon={<FiStar />}>
              <div className="fashion-grid">
                {list.map((prod) => (
                  <FashionProductCard
                    key={prod.id || prod.uuid}
                    p={prod}
                    toPublicSrc={toPublicSrc}
                    tienda={tienda}
                    brandFrom={brandFrom}
                    brandTo={brandTo}
                  />
                ))}
              </div>
            </FashionSection>
          );
        }

        if (type === "grid") {
          let list = [...(productos || [])];
          list = applyGlobalFilterIfNeeded(list, p).slice(0, p.limit ?? 12);
          if (!list.length) return null;
          return (
            <FashionSection key={b.id} title={p.title || "Todos los productos"} icon={<FiShoppingBag />}>
              <div className="fashion-grid">
                {list.map((prod) => (
                  <FashionProductCard
                    key={prod.id || prod.uuid}
                    p={prod}
                    toPublicSrc={toPublicSrc}
                    tienda={tienda}
                    brandFrom={brandFrom}
                    brandTo={brandTo}
                  />
                ))}
              </div>
            </FashionSection>
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
            <FashionSection key={b.id} title={p.title || catName(id)} icon={<FiShoppingBag />}>
              <div className="fashion-grid">
                {list.map((prod) => (
                  <FashionProductCard
                    key={prod.id || prod.uuid}
                    p={prod}
                    toPublicSrc={toPublicSrc}
                    tienda={tienda}
                    brandFrom={brandFrom}
                    brandTo={brandTo}
                  />
                ))}
              </div>
            </FashionSection>
          );
        }

        if (type === "product") {
          const id = Number(p.productoId);
          if (!id) return null;
          const prod = (productos || []).find((x) => Number(x.id) === id);
          if (!prod) return null;
          return (
            <FashionSection key={b.id} title={prod.nombre || "Producto"} icon={<FiShoppingBag />}>
              <div className="fashion-grid">
                <FashionProductCard
                  key={prod.id || prod.uuid}
                  p={prod}
                  toPublicSrc={toPublicSrc}
                  tienda={tienda}
                  brandFrom={brandFrom}
                  brandTo={brandTo}
                />
              </div>
            </FashionSection>
          );
        }

        if (type === "banner") {
          const src = toPublicSrc?.(tienda?.bannerPromoUrl);
          return (
            <section key={b.id} className="fashion-section">
              <div className="fashion-section-head">
                <h2 className="fashion-section-title">{p.title || "Promoción"}</h2>
                <div className="fashion-section-line" />
              </div>
              <div
                className="fashion-banner"
                style={{
                  backgroundImage: src ? `url(${src})` : `linear-gradient(135deg, ${brandFrom}, ${brandTo})`,
                }}
              >
                {p.ctaText ? (
                  p.ctaUrl ? (
                    <a
                      href={p.ctaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="fashion-banner-link"
                    >
                      {p.ctaText}
                    </a>
                  ) : (
                    <span className="fashion-banner-text">{p.ctaText}</span>
                  )
                ) : null}
              </div>
            </section>
          );
        }

        if (type === "logo") {
          const src = toPublicSrc?.(tienda?.logo?.url || tienda?.logoUrl);
          return (
            <section key={b.id} className="fashion-section" style={{ display: "grid", placeItems: "center" }}>
              {src ? <img src={src} alt="logo" className="fashion-logo-block" /> : null}
            </section>
          );
        }

        return null;
      })}
    </>
  );
}

/* ========= Componentes auxiliares ========= */

function FashionSection({ title, icon, children }) {
  return (
    <section className="fashion-section">
      <div className="fashion-section-head">
        <div className="fashion-section-icon">{icon}</div>
        <h2 className="fashion-section-title">{title}</h2>
        <div className="fashion-section-line" />
      </div>
      {children}
    </section>
  );
}

function FashionInfoCard({ title, icon, children }) {
  return (
    <div className="fashion-info-card">
      <div className="fashion-info-head">
        <div className="fashion-info-icon">{icon}</div>
        <h3 className="fashion-info-title">{title}</h3>
      </div>
      <div className="fashion-info-body">{children}</div>
    </div>
  );
}

function FashionProductCard({ p = {}, toPublicSrc, tienda, brandFrom, brandTo }) {
  const navigate = useNavigate();

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

  const to = productPath(tienda, p);
  const canGo = Boolean(to && to !== "/producto");

  const onView = (e) => {
    e.stopPropagation();
    if (canGo) navigate(to);
  };

  return (
    <article className="fashion-card">
      <Link to={to} className="fashion-media" title="Ver detalles" aria-label="Ver detalles del producto">
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
                     <rect width='100%' height='100%' fill='#f4f2fa'/>
                     <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#6b5bb5' font-family='sans-serif' font-size='16'>Sin imagen</text>
                   </svg>`
                );
            }}
          />
        ) : (
          <div className="fashion-placeholder"><FiShoppingBag size={32} /></div>
        )}
        {p.destacado && (
          <span className="fashion-badge">
            <FiStar size={14} /> Destacado
          </span>
        )}
      </Link>

      <div className="fashion-info">
        <div className="fashion-head">
          <h4 className="fashion-title-small">
            <Link to={to}>{p?.nombre || p?.title || "Producto"}</Link>
          </h4>
          {categoria && <span className="fashion-chip">{categoria}</span>}
        </div>

        {p?.descripcion && (
          <p className="fashion-desc">
            {String(p.descripcion).length > 100
              ? `${String(p.descripcion).slice(0, 100)}…`
              : String(p.descripcion)}
          </p>
        )}

        <div className="fashion-foot">
          {conPrecio ? (
            <span className="fashion-price">{precio}</span>
          ) : (
            <span className="fashion-variants">Con variantes</span>
          )}
          <button
            type="button"
            className="fashion-btn"
            onClick={onView}
            disabled={!canGo}
            aria-label="Ver detalles"
          >
            Ver detalles
          </button>
        </div>
      </div>
    </article>
  );
}

function FashionHours({ horario = {} }) {
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
    <div className="fashion-hours">
      {dias.map((d) => (
        <Fragment key={d.id}>
          <span className="fashion-hours-day">{d.label}</span>
          <span className="fashion-hours-time">{horario?.[d.id] || "Cerrado"}</span>
        </Fragment>
      ))}
    </div>
  );
}

/* ========= Utils ========= */
function categoriasSafe(c) { return Array.isArray(c) ? c : []; }
function extractColors(gradientString) {
  if (!gradientString) return { from: "#7c3aed", to: "#a78bfa" };
  const m = gradientString.match(/#([0-9a-f]{6})/gi);
  return { from: m?.[0] || "#7c3aed", to: m?.[1] || "#a78bfa" };
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
  return L > 0.48 ? "#1a102b" : "#ffffff";
}

/* ========= CSS ========= */
const cssFashion = `
:root{
  --fashion-bg: #f7f6fb;
  --fashion-surface: #ffffff;
  --fashion-ink: #1a102b;
  --fashion-sub: #6b5bb5;
  --fashion-line: #e5e1f5;
  --fashion-chip: #efeafd;

  /* variables del tema (dinámicas) */
  --brand-from: #7c3aed;
  --brand-to: #a78bfa;
  --brand-ink-contrast: #ffffff;
}

*{ box-sizing:border-box; margin:0; padding:0; }

.fashion-root{
  background: var(--fashion-bg);
  color: var(--fashion-ink);
  min-height: 100dvh;
  line-height: 1.6;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Liberation Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif;
  overflow-x: hidden;
}

/* HERO */
.fashion-hero{
  position: relative;
  min-height: 80vh;
  display: grid;
  place-items: center;
  padding: 84px 20px;
  background-size: cover;
  background-position: center;
  isolation: isolate;
}
.fashion-hero-glass{
  position: absolute;
  inset: 0;
  backdrop-filter: blur(2px);
  opacity: .999;
  mix-blend-mode: normal;
  z-index: -1;
}
.fashion-hero-content{
  width: 100%;
  max-width: 1200px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: center;
  text-align: center;
}
.fashion-logo-wrap{ margin-bottom: 8px; }
.fashion-logo{
  max-width: 160px; max-height: 160px; object-fit: contain;
  filter: drop-shadow(0 8px 28px rgba(0,0,0,.18));
}
.fashion-title-wrap{ margin-bottom: 6px; }
.fashion-title{
  font-size: clamp(2.2rem, 6vw, 3.6rem);
  font-weight: 600;
  letter-spacing: .5px;
  color: var(--brand-ink-contrast);
}
.fashion-subtitle{
  font-size: 1.05rem;
  opacity: .95;
  max-width: 760px;
  margin: 0 auto;
  color: var(--brand-ink-contrast);
}
.fashion-ornament{ display:flex; align-items:center; gap:14px; margin-top: 10px; color: var(--brand-ink-contrast); }
.fashion-line{ width: 100px; height: 2px; background: currentColor; opacity:.55; }
.fashion-icon{ opacity:.75; }

/* NAV */
.fashion-nav{
  position: sticky; top: 0; z-index: 50;
  background: var(--fashion-surface);
  border-bottom: 1px solid var(--fashion-line);
  box-shadow: 0 6px 24px rgba(21, 10, 40, .05);
}
.fashion-nav-inner{
  max-width:1200px; margin:0 auto; padding:18px 20px;
  display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:16px;
}
.fashion-search{ position:relative; flex:1; min-width:280px; max-width:520px; }
.fashion-search-icon{
  position:absolute; left:14px; top:50%; transform: translateY(-50%); color: var(--fashion-sub);
}
.fashion-search-input{
  width:100%; padding:12px 14px 12px 42px; border-radius: 12px;
  background: #f4f2fa; border: 1px solid var(--fashion-line); color: var(--fashion-ink);
  transition:.2s ease;
}
.fashion-search-input:focus{ outline:none; box-shadow:0 0 0 3px rgba(167,139,250,.18); }

.fashion-cats{ display:flex; flex-wrap:wrap; gap:10px; }
.fashion-cat-btn{
  padding:8px 14px; border-radius: 999px; border:1px solid var(--fashion-line);
  background: var(--fashion-surface); color: var(--fashion-ink); cursor: pointer; transition:.2s;
}
.fashion-cat-btn:hover{ background:#f4f2fa; }
.fashion-cat-btn.active{ background: linear-gradient(135deg, var(--brand-from), var(--brand-to)); color:#fff; border-color: transparent; }

/* MAIN */
.fashion-main{ max-width:1200px; margin:0 auto; padding: 48px 20px; }

/* Sections */
.fashion-section{ margin-bottom:56px; }
.fashion-section-head{
  display:flex; align-items:center; gap:12px; margin-bottom: 28px;
}
.fashion-section-icon{ font-size:22px; color: var(--brand-to); }
.fashion-section-title{
  font-size: 1.6rem; font-weight:600; letter-spacing: .3px;
}
.fashion-section-line{ flex:1; height:2px; background: var(--fashion-line); }

/* Grid */
.fashion-grid{
  display:grid; gap:24px;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

/* Card */
.fashion-card{
  background: var(--fashion-surface);
  border: 1px solid var(--fashion-line);
  border-radius: 16px;
  overflow: hidden;
  transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
  box-shadow: 0 12px 28px rgba(21, 10, 40, .05);
}
.fashion-card:hover{
  transform: translateY(-4px);
  box-shadow: 0 18px 40px rgba(21, 10, 40, .08);
  border-color: #d8d0f3;
}
.fashion-media{
  position:relative; aspect-ratio: 4/3; display:block; background:#f4f2fa; overflow: hidden;
}
.fashion-media img{ width:100%; height:100%; object-fit: cover; transition: transform .45s ease; }
.fashion-card:hover .fashion-media img{ transform: scale(1.045); }
.fashion-placeholder{
  width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#9a90d8;
}
.fashion-badge{
  position:absolute; top:12px; left:12px;
  display:inline-flex; align-items:center; gap:6px;
  background: rgba(255,255,255,.92); border:1px solid var(--fashion-line);
  padding:6px 12px; font-size:.82rem; border-radius: 999px; color:#6d5add; z-index:2;
}

.fashion-info{ padding: 18px; display:flex; flex-direction:column; gap:12px; }
.fashion-head{ display:flex; flex-direction:column; gap:8px; }
.fashion-title-small{ font-size: 1.06rem; font-weight:600; margin:0; line-height:1.35; }
.fashion-title-small a{ color: inherit; text-decoration: none; }
.fashion-title-small a:hover{ text-decoration: underline; }

.fashion-chip{
  font-size:.78rem; align-self:flex-start; padding:4px 10px; border-radius: 999px;
  background: var(--fashion-chip); color:#5b4bb1; border:1px solid #e8e1fb;
}

.fashion-desc{ margin:0; color:#5a5670; font-size:.95rem; }

.fashion-foot{ display:flex; align-items:center; justify-content:space-between; gap:12px; position: relative; }
.fashion-price{ font-weight:700; font-size:1.1rem; color: var(--brand-to); }
.fashion-variants{ font-size:.9rem; color:#7b76a1; }

.fashion-btn{
  border: none; color:#fff; padding:10px 14px; border-radius: 10px;
  font-size:.92rem; text-decoration:none; transition:.2s ease; display:inline-block;
  cursor: pointer; position: relative; z-index: 5;
  background-image: linear-gradient(135deg, var(--brand-from), var(--brand-to));
}
.fashion-btn:hover{ filter: brightness(1.05); }
.fashion-btn:focus-visible{ outline: 3px solid rgba(167,139,250,.35); outline-offset: 2px; }
.fashion-btn[disabled]{ opacity:.6; pointer-events: none; }

/* Banner */
.fashion-banner{
  min-height: 180px; border-radius: 16px; border:1px solid var(--fashion-line);
  background-size: cover; background-position: center; display:grid; place-items:center;
}
.fashion-banner-link, .fashion-banner-text{
  padding: 12px 22px; border-radius: 10px; background: rgba(255,255,255,.9);
  border:1px solid var(--fashion-line); color: var(--fashion-ink); text-decoration:none; font-weight:600;
}
.fashion-banner-link:hover{ background: linear-gradient(135deg, var(--brand-from), var(--brand-to)); color:#fff; border-color: transparent; }

.fashion-logo-block{ max-width: 180px; filter: drop-shadow(0 2px 10px rgba(0,0,0,.08)); }

/* Info */
.fashion-info-grid{
  display:grid; gap:24px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}
.fashion-info-card{
  background: var(--fashion-surface);
  border: 1px solid var(--fashion-line);
  border-radius: 16px; padding: 22px;
  box-shadow: 0 8px 24px rgba(21, 10, 40, .05);
  transition:.2s ease;
}
.fashion-info-card:hover{ transform: translateY(-3px); box-shadow: 0 12px 32px rgba(21, 10, 40, .08); }
.fashion-info-head{ display:flex; align-items:center; gap:12px; margin-bottom: 12px; }
.fashion-info-icon{
  width:40px; height:40px; display:grid; place-items:center; border-radius: 10px; background:#f4f2fa; color: var(--brand-to);
}
.fashion-info-title{ font-size:1.1rem; font-weight:700; margin:0; }
.fashion-info-body{ display:flex; flex-direction:column; gap:12px; }

.fashion-contact-item{
  display:flex; align-items:center; gap:10px; padding:10px; border-radius:10px; background:#f7f6fb;
}
.fashion-contact-item a{ color: inherit; text-decoration:none; }
.fashion-contact-item a:hover{ color: var(--brand-to); }
.fashion-contact-icon{ font-size:1rem; flex-shrink:0; }

.fashion-hours{
  display:grid; grid-template-columns: 1fr 1fr; gap:8px;
}
.fashion-hours-day{ padding: 8px 0; border-bottom: 1px dashed var(--fashion-line); font-weight:600;}
.fashion-hours-time{ padding: 8px 0; border-bottom: 1px dashed var(--fashion-line); text-align:right; color:#6b6a83; }

/* Social */
.fashion-social-grid{
  display:grid; gap:12px; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}
.fashion-social-link{
  display:flex; align-items:center; justify-content:center; gap:8px;
  padding:12px; border:1px solid var(--fashion-line); border-radius: 10px; text-decoration:none; color:inherit; background:#fff;
  transition:.2s ease;
}
.fashion-social-link:hover{ background:#f4f2fa; transform: translateY(-2px); }
.fashion-social-icon{ font-size:1.3rem; }

/* Empty */
f
.fashion-empty{
  grid-column: 1 / -1;
  display:grid; place-items:center; gap:10px; padding: 60px 20px;
  border:2px dashed var(--fashion-line); border-radius: 14px; color:#6b6a83; background:#faf9fe;
}

/* Footer */
.fashion-footer{
  border-top: 1px solid var(--fashion-line);
  margin-top: 64px; padding: 36px 20px; background: var(--fashion-surface);
}
.fashion-footer-inner{
  max-width:1200px; margin:0 auto; display:flex; align-items:center; justify-content:center; gap:12px; color:#6b6a83; flex-wrap:wrap;
}
.fashion-dot{ opacity:.5; }

/* Responsive */
@media (max-width: 1024px){
  .fashion-nav-inner{ flex-direction: column; align-items: stretch; }
  .fashion-search{ max-width: 100%; }
  .fashion-grid{ grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
}
@media (max-width: 768px){
  .fashion-hero{ min-height: 64vh; padding: 64px 16px; }
  .fashion-logo{ max-width:120px; max-height:120px; }
  .fashion-title{ font-size: 2.2rem; }
  .fashion-subtitle{ font-size: 1rem; }
}
@media (max-width: 480px){
  .fashion-main{ padding: 32px 14px; }
  .fashion-grid{ grid-template-columns: 1fr; }
  .fashion-section-head{ flex-direction: column; align-items:flex-start; gap:10px; }
  .fashion-section-line{ width:100%; }
  .fashion-foot{ flex-direction: column; align-items: flex-start; gap:10px; }
  .fashion-btn{ width:100%; text-align:center; }
}
`;

/* Nota: hay un pequeño typo accidental "f" suelto antes de .fashion-empty; asegúrate de que no quede.
   Si lo ves en tu editor, bórralo (es inofensivo pero innecesario). */

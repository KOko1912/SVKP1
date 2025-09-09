// E:\SVKP1\frontend\src\pages\Vendedor\Disenos\DisenoEstiloComidaRapida.jsx
import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiSearch, FiStar, FiShoppingBag, FiMessageCircle, FiMapPin, FiExternalLink,
  FiPhone, FiMail, FiClock, FiFacebook, FiInstagram, FiYoutube, FiFramer, FiLoader
} from "react-icons/fi";

/**
 * Diseño Estilo Comida Rápida – cálido, enérgico y directo
 * Props compatibles con Pagina.jsx:
 * - tienda, productos, categorias, orderedBlocks
 * - toPublicSrc (func), API, FILES, isPublic (opcionales)
 */
export default function DisenoEstiloComidaRapida({
  tienda,
  productos = [],
  categorias = [],
  orderedBlocks = [],
  toPublicSrc,
  API,
  FILES,
  isPublic,
}) {
  const storeKey = useMemo(
    () => tienda?.slug || tienda?.publicUuid || tienda?.uuid || tienda?.id,
    [tienda]
  );

  // ===== Tema desde colorPrincipal (kétchup/mostaza fallback) =====
  const theme = useMemo(() => {
    const { from, to } = extractColors(
      tienda?.colorPrincipal || "linear-gradient(135deg,#ef4444,#f59e0b)"
    );
    return {
      from,
      to,
      contrast: bestTextOn(from, to),
      grease: hexToRgba("#000000", 0.18),
      smoke: hexToRgba("#ffffff", 0.08),
    };
  }, [tienda?.colorPrincipal]);

  // Inyecta variables CSS del tema
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--ff-from", theme.from);
    root.setProperty("--ff-to", theme.to);
    root.setProperty("--ff-contrast", theme.contrast);
    root.setProperty("--ff-grease", theme.grease);
    root.setProperty("--ff-smoke", theme.smoke);
  }, [theme]);

  const hasHero = (orderedBlocks || []).some((b) => b.type === "hero");

  return (
    <div className="fastfood-root">
      <style>{FASTFOOD_CSS}</style>

      {/* Fondo con textura "plancha" y halos cálidos */}
      <div className="ff-bg" aria-hidden="true">
        <div className="ff-halos" />
        <div className="ff-dots" />
      </div>

      {!hasHero && <FFHero tienda={tienda} toPublicSrc={toPublicSrc} />}

      <FFVendorInfo tienda={tienda} toPublicSrc={toPublicSrc} />

      {/* Layout dinámico respetando el orden guardado */}
      {(orderedBlocks || []).length > 0 ? (
        <FFRenderBlocks
          layout={orderedBlocks}
          productos={productos}
          categorias={categorias}
          tienda={tienda}
          toPublicSrc={toPublicSrc}
          storeKey={storeKey}
        />
      ) : (
        <>
          <FFRowSection
            title="Todo al paso"
            icon={<FiShoppingBag />}
            items={productos}
            storeKey={storeKey}
            toPublicSrc={toPublicSrc}
            enableSearch
          />
          {productos.some((p) => p.destacado) && (
            <FFRowSection
              title="Súper recomendados"
              icon={<FiStar />}
              items={productos.filter((p) => p.destacado)}
              storeKey={storeKey}
              toPublicSrc={toPublicSrc}
            />
          )}
          {categorias.map((cat) => {
            const items = productos.filter(
              (p) =>
                Array.isArray(p.categorias) &&
                p.categorias.some(
                  (pc) => Number(pc.categoriaId) === Number(cat.id)
                )
            );
            if (!items.length) return null;
            return (
              <FFRowSection
                key={cat.id}
                title={cat.nombre}
                icon={<FiShoppingBag />}
                items={items}
                storeKey={storeKey}
                toPublicSrc={toPublicSrc}
              />
            );
          })}
        </>
      )}

      <FFPolicies tienda={tienda} />
      <FFSocial redes={tienda?.redes} />
      <FFFooter tienda={tienda} />
    </div>
  );
}

/* ===================== Render de bloques ===================== */
function FFRenderBlocks({
  layout = [],
  productos = [],
  categorias = [],
  tienda,
  toPublicSrc,
  storeKey,
}) {
  if (!Array.isArray(layout) || !layout.length) return null;
  const catName = (id) =>
    categorias.find((c) => Number(c.id) === Number(id))?.nombre || "Categoría";

  return (
    <>
      {layout.map((b) => {
        const p = b.props || {};

        if (b.type === "hero") {
          return (
            <FFHero
              key={b.id}
              tienda={tienda}
              align={p.align}
              showLogo={p.showLogo}
              showDescripcion={p.showDescripcion}
              toPublicSrc={toPublicSrc}
            />
          );
        }

        if (b.type === "featured") {
          const items = productos.filter((x) => x.destacado).slice(0, p.limit ?? 8);
          if (!items.length) return null;
          return (
            <FFRowSection
              key={b.id}
              title={p.title || "Súper recomendados"}
              icon={<FiStar />}
              items={items}
              storeKey={storeKey}
              toPublicSrc={toPublicSrc}
            />
          );
        }

        if (b.type === "grid") {
          const items = productos.slice(0, p.limit ?? 12);
          if (!items.length) return null;
          return (
            <FFRowSection
              key={b.id}
              title={p.title || "Todo al paso"}
              icon={<FiShoppingBag />}
              items={items}
              storeKey={storeKey}
              toPublicSrc={toPublicSrc}
              enableSearch={!!p.showFilter}
            />
          );
        }

        if (b.type === "category") {
          const id = Number(p.categoriaId);
          if (!id) return null;
          const items = productos
            .filter(
              (prod) =>
                Array.isArray(prod.categorias) &&
                prod.categorias.some((pc) => Number(pc.categoriaId) === id)
            )
            .slice(0, p.limit ?? 12);
          if (!items.length) return null;
          return (
            <FFRowSection
              key={b.id}
              title={p.title || catName(id)}
              icon={<FiShoppingBag />}
              items={items}
              storeKey={storeKey}
              toPublicSrc={toPublicSrc}
              enableSearch={!!p.showFilter}
            />
          );
        }

        if (b.type === "product") {
          const id = Number(p.productoId);
          if (!id) return null;
          const item = productos.find((prod) => Number(prod.id) === id);
          if (!item) return null;
          return (
            <FFRowSection
              key={b.id}
              title={item.nombre || "Producto"}
              icon={<FiShoppingBag />}
              items={[item]}
              storeKey={storeKey}
              toPublicSrc={toPublicSrc}
            />
          );
        }

        if (b.type === "banner") {
          return (
            <FFBanner
              key={b.id}
              tienda={tienda}
              title={p.title}
              ctaText={p.ctaText}
              ctaUrl={p.ctaUrl}
              toPublicSrc={toPublicSrc}
            />
          );
        }

        if (b.type === "logo") {
          return (
            <FFLogo
              key={b.id}
              tienda={tienda}
              shape={p.shape}
              frame={p.frame}
              toPublicSrc={toPublicSrc}
            />
          );
        }

        return null;
      })}
    </>
  );
}

/* ===================== Componentes UI ===================== */
function FFHero({ tienda, align = "center", showLogo = true, showDescripcion = true, toPublicSrc }) {
  const portada = normalizePublicSrc(toPublicSrc, tienda?.portada?.url || tienda?.portadaUrl);
  const logo = normalizePublicSrc(toPublicSrc, tienda?.logo?.url || tienda?.logoUrl);
  const { from, to } = extractColors(
    tienda?.colorPrincipal || "linear-gradient(135deg,#ef4444,#f59e0b)"
  );
  const justify = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

  return (
    <header
      className="ff-hero"
      style={{
        color: bestTextOn(from, to),
        justifyContent: justify,
        backgroundImage: portada
          ? `linear-gradient(0deg, rgba(0,0,0,.70), rgba(0,0,0,.45)), url(${portada})`
          : `linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      <div className="ff-hero-fx" aria-hidden="true" />
      <div className="ff-hero-content" style={{ textAlign: align }}>
        {showLogo && logo ? (
          <div className="ff-logo-wrap">
            <img src={logo} alt="Logo" className="ff-hero-logo" />
            <span className="ff-logo-steam" aria-hidden="true" />
          </div>
        ) : null}
        <div>
          <h1 className="ff-title" data-text={tienda?.nombre || "Mi Tienda"}>
            {tienda?.nombre || "Mi Tienda"}
          </h1>
          {showDescripcion && tienda?.descripcion ? (
            <p className="ff-subtitle">{tienda.descripcion}</p>
          ) : null}
          <div className="ff-hero-stripes" aria-hidden="true">
            <span />
            <FiFramer />
            <span />
          </div>
        </div>
      </div>
      <div className="ff-hero-indicator" aria-hidden="true">
        <FiLoader />
      </div>
    </header>
  );
}

function FFVendorInfo({ tienda, toPublicSrc }) {
  const logo = normalizePublicSrc(toPublicSrc, tienda?.logo?.url || tienda?.logoUrl);
  return (
    <section className="ff-section">
      <div className="ff-card vendor">
        <div className="ff-vendor-head">
          {logo ? (
            <img src={logo} alt="Logo" className="ff-vendor-logo" />
          ) : (
            <div className="ff-vendor-logo placeholder" />
          )}
          <div>
            <h2 className="ff-vendor-name">{tienda?.nombre || "Mi Tienda"}</h2>
            <div className="ff-vendor-tags">
              {tienda?.categoria && <span>{tienda.categoria}</span>}
              {(tienda?.subcategorias || []).map((cat, i) => (
                <span key={i}>{cat}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="ff-vendor-body">
          <p className="ff-vendor-desc">
            {tienda?.descripcion || "No hay descripción disponible"}
          </p>
          <div className="ff-cta-row">
            {tienda?.telefonoContacto && (
              <a href={`tel:${tienda.telefonoContacto}`} className="ff-btn ff-btn-primary">
                <FiPhone /> Llamar
              </a>
            )}
            {tienda?.telefonoContacto && (
              <a
                className="ff-btn"
                href={`https://wa.me/${String(tienda.telefonoContacto).replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                <FiMessageCircle /> WhatsApp
              </a>
            )}
            {tienda?.email && (
              <a href={`mailto:${tienda.email}`} className="ff-btn">
                <FiMail /> Email
              </a>
            )}
            {tienda?.ubicacionUrl && (
              <a href={tienda.ubicacionUrl} className="ff-btn" target="_blank" rel="noreferrer">
                <FiMapPin /> Ubicación <FiExternalLink />
              </a>
            )}
          </div>
        </div>
      </div>

      <FFHours horario={tienda?.horario} />
    </section>
  );
}

function FFRowSection({ title, icon, items = [], enableSearch = false, storeKey, toPublicSrc }) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const ref = useRef(null);
  const [q, setQ] = useState("");
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(true);

  const filtered = useMemo(() => {
    if (!enableSearch || !q.trim()) return items;
    const n = q.toLowerCase();
    return items.filter((p) => {
      const t = `${p?.nombre || p?.title || ""} ${p?.descripcion || p?.detalle || p?.resumen || ""}`.toLowerCase();
      return t.includes(n);
    });
  }, [items, enableSearch, q]);

  const checkScroll = () => {
    const el = ref.current;
    if (!el) return;
    setCanL(el.scrollLeft > 0);
    setCanR(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    checkScroll();
    return () => el.removeEventListener("scroll", checkScroll);
  }, []);

  const scrollBy = (dx) => {
    if (!ref.current) return;
    ref.current.scrollBy({ left: dx, behavior: "smooth" });
    setTimeout(checkScroll, 240);
  };

  return (
    <section className="ff-section">
      <div className="ff-row-head">
        <h2 className="ff-section-title">
          <span className="ff-icon">{icon}</span> {title}{" "}
          <span className="ff-count">({filtered.length})</span>
        </h2>

        {enableSearch && (
          <label className="ff-search">
            <FiSearch />
            <input
              type="search"
              placeholder="Buscar combos, burgers, snacks…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <span className="ff-search-underline" />
          </label>
        )}
      </div>

      {isDesktop ? (
        <div className="ff-grid">
          {filtered.length ? (
            filtered.map((p) => (
              <FFCard key={p.id || p.uuid || `p-${Math.random()}`} p={p} storeKey={storeKey} toPublicSrc={toPublicSrc} />
            ))
          ) : (
            <div className="ff-empty">
              <FiShoppingBag size={48} />
              <p>No hay productos en esta sección</p>
            </div>
          )}
        </div>
      ) : (
        <div className="ff-scroll" ref={ref}>
          {filtered.length ? (
            filtered.map((p) => (
              <FFCard key={p.id || p.uuid || `p-${Math.random()}`} p={p} storeKey={storeKey} toPublicSrc={toPublicSrc} />
            ))
          ) : (
            <div className="ff-empty">
              <FiShoppingBag size={48} />
              <p>No hay productos en esta sección</p>
            </div>
          )}

          <button
            type="button"
            className={`ff-scroll-btn left ${canL ? "show" : ""}`}
            onClick={() => scrollBy(-360)}
            aria-label="Anterior"
          >
            ‹
          </button>
          <button
            type="button"
            className={`ff-scroll-btn right ${canR ? "show" : ""}`}
            onClick={() => scrollBy(360)}
            aria-label="Siguiente"
          >
            ›
          </button>
        </div>
      )}
    </section>
  );
}

function FFCard({ p = {}, storeKey, toPublicSrc }) {
  const img = normalizePublicSrc(
    toPublicSrc,
    [
      p?.imagenes?.find((x) => x?.isPrincipal)?.url,
      p?.imagenes?.[0]?.url,
      p?.imagen,
      p?.thumb,
      p?.foto,
      p?.cover,
    ].filter(Boolean)[0]
  );

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
  const precioNum = Number(p.precio || 0);
  const precio = isFinite(precioNum) ? `$${precioNum.toFixed(2)}` : "";

  // URL pública
  const to = useMemo(() => {
    const pid = p?.uuid || p?.publicUuid || p?.id;
    if (!pid) return null;
    if (storeKey) return `/t/${encodeURIComponent(storeKey)}/producto/${encodeURIComponent(pid)}`;
    return `/producto/${encodeURIComponent(pid)}`;
  }, [p?.uuid, p?.publicUuid, p?.id, storeKey]);

  const Media = ({ children }) =>
    to ? (
      <Link to={to} className="ff-card-media" aria-label={`Ver ${p?.nombre || "producto"}`}>
        {children}
      </Link>
    ) : (
      <div className="ff-card-media">{children}</div>
    );

  const short = (s) => (String(s || "").length > 96 ? `${String(s).slice(0, 96)}…` : String(s || ""));

  return (
    <article className="ff-card" aria-label={p?.nombre || "Producto"}>
      <span className="ff-card-glow" aria-hidden="true" />
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
                     <rect width='100%' height='100%' fill='#121212'/>
                     <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#b0b0b0' font-family='sans-serif' font-size='16'>Sin imagen</text>
                   </svg>`
                );
            }}
          />
        ) : (
          <div className="ff-img-ph">
            <FiShoppingBag size={26} />
          </div>
        )}
        {p.destacado && (
          <span className="ff-badge">
            <FiStar size={14} /> Top
          </span>
        )}
      </Media>

      <div className="ff-card-body">
        <div className="ff-card-head">
          {to ? (
            <Link to={to} className="ff-title-sm" title={p?.nombre}>
              {p?.nombre || p?.title || "Producto"}
            </Link>
          ) : (
            <h4 className="ff-title-sm" title={p?.nombre}>
              {p?.nombre || p?.title || "Producto"}
            </h4>
          )}
          {categoria && <span className="ff-chip">{categoria}</span>}
        </div>

        {(p?.descripcion || p?.detalle || p?.resumen) && (
          <p className="ff-desc">{short(p?.descripcion || p?.detalle || p?.resumen)}</p>
        )}

        <div className="ff-card-foot">
          {conPrecio ? (
            <span className="ff-price">{precio}</span>
          ) : (
            <span className="ff-variants">Con variantes</span>
          )}
          {to && (
            <Link to={to} className="ff-btn ff-btn-primary ff-btn-sm">
              Ver detalle
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function FFBanner({ tienda, title, ctaText, ctaUrl, toPublicSrc }) {
  const src = normalizePublicSrc(toPublicSrc, tienda?.bannerPromoUrl);
  return (
    <section className="ff-section">
      <div
        className="ff-banner"
        style={{
          backgroundImage: src
            ? `linear-gradient(90deg, rgba(0,0,0,.55), rgba(0,0,0,.25)), url(${src})`
            : `linear-gradient(135deg, var(--ff-from), var(--ff-to))`,
        }}
      >
        <div className="ff-banner-steam" aria-hidden="true" />
        <div className="ff-banner-inner">
          <strong className="ff-banner-title">{title || "Promo caliente"}</strong>
          {ctaText ? (
            ctaUrl ? (
              <a className="ff-btn ff-btn-primary" href={ctaUrl} target="_blank" rel="noreferrer">
                {ctaText}
              </a>
            ) : (
              <em className="ff-banner-cta-muted">{ctaText}</em>
            )
          ) : null}
        </div>
      </div>
    </section>
  );
}

function FFLogo({ tienda, shape = "rounded", frame = "thin", toPublicSrc }) {
  const src = normalizePublicSrc(toPublicSrc, tienda?.logo?.url || tienda?.logoUrl);
  const shapeCls = { circle: "circle", square: "square", rounded: "rounded", squircle: "squircle" }[shape] || "rounded";
  const frameCls = { none: "none", thin: "thin", thick: "thick" }[frame] || "thin";
  return (
    <section className="ff-section">
      <div className={`ff-logo-block ${shapeCls} ${frameCls}`}>
        {src ? <img src={src} alt="logo" /> : <div className="ff-logo-ph">Logo</div>}
      </div>
    </section>
  );
}

function FFPolicies({ tienda }) {
  return (
    <section className="ff-section ff-policies">
      <div className="ff-policy-card">
        <div className="ff-policy-line" />
        <h3>Envíos</h3>
        <p>{tienda?.envioCobertura || "No especificado"}</p>
        <p>{tienda?.envioCosto || "Costo no especificado"}</p>
        <p>{tienda?.envioTiempo || "Tiempo no especificado"}</p>
      </div>
      <div className="ff-policy-card">
        <div className="ff-policy-line" />
        <h3>Métodos de pago</h3>
        <div className="ff-paylist">
          {(tienda?.metodosPago || []).map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
      </div>
      <div className="ff-policy-card">
        <div className="ff-policy-line" />
        <h3>Devoluciones</h3>
        <p>{tienda?.devoluciones || "Política no especificada"}</p>
      </div>
    </section>
  );
}

function FFSocial({ redes = {} }) {
  if (!redes?.facebook && !redes?.instagram && !redes?.tiktok) return null;
  return (
    <section className="ff-section">
      <h2 className="ff-section-title">
        <span className="ff-icon">🍔</span> Síguenos
      </h2>
      <div className="ff-social">
        {redes.facebook && (
          <a className="ff-social-link" href={redes.facebook} target="_blank" rel="noreferrer">
            <FiFacebook /> <span>Facebook</span>
          </a>
        )}
        {redes.instagram && (
          <a className="ff-social-link" href={redes.instagram} target="_blank" rel="noreferrer">
            <FiInstagram /> <span>Instagram</span>
          </a>
        )}
        {redes.tiktok && (
          <a className="ff-social-link" href={redes.tiktok} target="_blank" rel="noreferrer">
            <FiYoutube /> <span>TikTok</span>
          </a>
        )}
      </div>
    </section>
  );
}

function FFFooter({ tienda }) {
  const tel = tienda?.telefonoContacto;
  const mail = tienda?.email;
  return (
    <footer className="ff-footer">
      <div className="ff-footer-inner">
        <div>
          <h3>Contacto</h3>
          {tel && (
            <p>
              <FiPhone /> {tel}
            </p>
          )}
          {mail && (
            <p>
              <FiMail /> {mail}
            </p>
          )}
        </div>
        <div className="ff-footer-right">
          <span>© {new Date().getFullYear()} {tienda?.nombre || "Mi Tienda"}</span>
          <span className="ff-dot" />
          <span>Estilo Comida Rápida</span>
        </div>
      </div>
      <div className="ff-footer-steam" aria-hidden="true" />
    </footer>
  );
}

function FFHours({ horario = {} }) {
  const dias = [
    { id: "lun", label: "Lunes" },
    { id: "mar", label: "Martes" },
    { id: "mie", label: "Miércoles" },
    { id: "jue", label: "Jueves" },
    { id: "vie", label: "Viernes" },
    { id: "sab", label: "Sábado" },
    { id: "dom", label: "Domingo" },
  ];
  const todayId = new Date().toLocaleDateString("es-ES", { weekday: "short" }).toLowerCase().slice(0, 3);
  return (
    <div className="ff-hours">
      <h3>
        <FiClock /> Horario de atención
      </h3>
      <div className="ff-hours-grid">
        {dias.map((d) => (
          <Fragment key={d.id}>
            <span className={`ff-hours-day ${d.id === todayId ? "today" : ""}`}>
              {d.label}
              {d.id === todayId ? " (Hoy)" : ""}
            </span>
            <span className={`ff-hours-time ${d.id === todayId ? "today" : ""}`}>
              {horario?.[d.id] || "Cerrado"}
            </span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

/* ===================== Hooks / utils ===================== */
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

function normalizePublicSrc(toPublicSrc, u) {
  try {
    if (!u) return "";
    if (typeof u === "string") return toPublicSrc ? toPublicSrc(u) : String(u);
    const v =
      u?.url ||
      u?.path ||
      u?.src ||
      u?.href ||
      u?.filepath ||
      u?.image ||
      u?.thumbnail ||
      "";
    return toPublicSrc ? toPublicSrc(v) : String(v || "");
  } catch {
    return "";
  }
}

/* ======= helpers de color ======= */
function extractColors(gradientString) {
  const m = gradientString?.match(/#([0-9a-f]{6})/gi);
  return { from: m?.[0] || "#ef4444", to: m?.[1] || "#f59e0b" };
}
function hexToRgb(hex) {
  const mm = hex?.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!mm) return [0, 0, 0];
  return [parseInt(mm[1], 16), parseInt(mm[2], 16), parseInt(mm[3], 16)];
}
function hexToRgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
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
  return L > 0.45 ? "#161616" : "#ffffff";
}

/* ===================== CSS (estilo comida rápida) ===================== */
const FASTFOOD_CSS = `
:root{
  --ff-bg: #0b0b0b;
  --ff-surface: rgba(255,255,255,0.04);
  --ff-border: rgba(255,255,255,0.10);
  --ff-text: #fffbea;
  --ff-sub: #ffe7b8;
  --ff-from: #ef4444; /* ketchup */
  --ff-to: #f59e0b;   /* mostaza */
  --ff-contrast: #ffffff;
  --ff-grease: rgba(0,0,0,.18);
  --ff-smoke: rgba(255,255,255,.08);
}

.fastfood-root{
  background: radial-gradient(1200px 700px at 0% -10%, var(--ff-grease), transparent 60%),
              radial-gradient(1200px 700px at 100% -10%, var(--ff-smoke), transparent 60%),
              var(--ff-bg);
  color: var(--ff-text);
  min-height: 100vh;
  line-height: 1.55;
  font-family: 'Bebas Neue', ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial;
  position: relative;
  overflow-x: hidden;
  letter-spacing:.2px;
}

/* Background texture */
.ff-bg{ position: fixed; inset: 0; pointer-events:none; z-index:0; }
.ff-halos{ position:absolute; inset:-10% -10% -10% -10%;
  background:
    radial-gradient(40% 30% at 20% 20%, var(--ff-from), transparent 60%),
    radial-gradient(40% 30% at 80% 10%, var(--ff-to), transparent 60%);
  filter: blur(40px); opacity:.18;
}
.ff-dots{
  position:absolute; inset:0;
  background-image:
    radial-gradient(1px 1px at 10px 10px, rgba(255,255,255,.06) 50%, transparent 55%),
    radial-gradient(1px 1px at 40px 30px, rgba(255,255,255,.06) 50%, transparent 55%);
  background-size: 60px 60px; opacity:.25;
}

/* HERO */
.ff-hero{
  position:relative; min-height:520px; display:flex; align-items:center; justify-content:center;
  padding:84px 18px; background-size:cover; background-position:center; overflow:hidden; isolation:isolate;
}
.ff-hero-fx{ position:absolute; inset:0; opacity:.22; background:
  radial-gradient(circle at 20% 50%, var(--ff-from) 0%, transparent 55%),
  radial-gradient(circle at 80% 20%, var(--ff-to) 0%, transparent 55%); filter: blur(22px);
}
.ff-hero-content{ position:relative; z-index:2; max-width:1100px; width:100%; text-align:center; }
.ff-logo-wrap{ position:relative; display:inline-block; margin-bottom:22px; }
.ff-hero-logo{
  width:112px; height:112px; object-fit:contain; border-radius:20px;
  border:2px solid rgba(255,255,255,.25); background:#0006; box-shadow:0 0 28px rgba(0,0,0,.35);
}
.ff-logo-steam{ position:absolute; top:50%; left:50%; width:160px; height:160px; transform:translate(-50%,-50%);
  border-radius:50%; filter:blur(16px); background: radial-gradient(circle, var(--ff-from), transparent 60%); opacity:.35; }
.ff-title{
  font-size:clamp(2.8rem,6.2vw,4.2rem); font-weight:900; margin:0 0 10px 0;
  text-shadow: 0 0 15px rgba(0,0,0,.6); letter-spacing:1px;
}
.ff-subtitle{ max-width:720px; margin:0 auto; opacity:.96; font: 500 1.15rem/1.6 system-ui, sans-serif; color:var(--ff-sub); }
.ff-hero-stripes{ display:flex; align-items:center; justify-content:center; gap:14px; margin-top:22px; color:var(--ff-sub); }
.ff-hero-stripes > span{ width:120px; height:3px; background:linear-gradient(90deg, transparent, var(--ff-from), transparent); border-radius:4px; }
.ff-hero-indicator{ position:absolute; bottom:24px; left:50%; transform:translateX(-50%); opacity:.9; animation: ff-bounce 1.8s infinite; color:var(--ff-sub) }
@keyframes ff-bounce { 0%,20%,50%,80%,100%{ transform:translateX(-50%) translateY(0) } 40%{ transform:translateX(-50%) translateY(-10px) } 60%{ transform:translateX(-50%) translateY(-5px) } }

/* SECTION + CARDS */
.ff-section{ max-width:1200px; margin:0 auto; padding:42px 18px; position:relative; z-index:1; }
.ff-card.vendor{ background: var(--ff-surface); border:1px solid var(--ff-border); border-radius:18px; overflow:hidden; backdrop-filter: blur(10px); }
.ff-card.vendor::before{ content:""; position:absolute; left:0; right:0; top:0; height:3px; background:linear-gradient(90deg, transparent, var(--ff-from), var(--ff-to), transparent); }
.ff-vendor-head{ display:flex; gap:18px; align-items:center; padding:22px 22px 8px; }
.ff-vendor-logo{ width:76px; height:76px; border-radius:16px; object-fit:contain; border:2px solid var(--ff-border); background:#0005; }
.ff-vendor-logo.placeholder{ width:76px; height:76px; border-radius:16px; background:#161616; border:2px dashed var(--ff-border); }
.ff-vendor-name{ margin:0; font-size:1.55rem; font-weight:900; letter-spacing:.5px; }
.ff-vendor-tags{ display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
.ff-vendor-tags > span{ border:1px solid var(--ff-border); color:#fff8d9; font-size:.9rem; padding:6px 10px; border-radius:999px; background:rgba(255,255,255,.06); font-family:system-ui; }
.ff-vendor-body{ padding:10px 22px 22px; }
.ff-vendor-desc{ margin:8px 0 16px; color:var(--ff-sub); font: 500 1.05rem/1.7 system-ui, sans-serif; }
.ff-cta-row{ display:flex; flex-wrap:wrap; gap:10px; }
.ff-btn{ border:1px solid var(--ff-border); background:rgba(255,255,255,.06); color:var(--ff-text); padding:.65rem 1rem; border-radius:12px; text-decoration:none; display:inline-flex; align-items:center; gap:8px; transition: all .22s ease; font-weight:700; font-family:system-ui; }
.ff-btn:hover{ background:rgba(255,255,255,.12); transform: translateY(-2px); }
.ff-btn-primary{ border-color:transparent; background:linear-gradient(135deg, var(--ff-from), var(--ff-to)); color:#151515; }

/* Hours */
.ff-hours{ margin-top:18px; background: var(--ff-surface); border:1px solid var(--ff-border); border-radius:18px; padding:18px; backdrop-filter: blur(10px); }
.ff-hours > h3{ margin:0 0 12px; display:flex; align-items:center; gap:10px; color:#ffe7b8; font-family:system-ui; }
.ff-hours-grid{ display:grid; grid-template-columns:1fr auto; gap:8px 14px; }
.ff-hours-day.today, .ff-hours-time.today{ color:#ffd166; font-weight:800; }

/* Row head */
.ff-row-head{ display:flex; gap:14px; align-items:center; justify-content:space-between; margin-bottom:18px; flex-wrap:wrap; }
.ff-section-title{ display:flex; align-items:center; gap:10px; font-size:1.45rem; font-weight:900; margin:0; letter-spacing:.6px; }
.ff-count{ color:var(--ff-sub); font-weight:700; font-size:1rem; margin-left:6px; font-family:system-ui; }
.ff-icon{ color:#ffd166; filter: drop-shadow(0 0 10px rgba(255,209,102,.15)); }
.ff-search{ position:relative; display:inline-flex; align-items:center; gap:10px; border:1px solid var(--ff-border); padding:9px 14px; border-radius:12px; background:rgba(255,255,255,.06); min-width:280px; }
.ff-search input{ outline:none; border:0; background:transparent; color:var(--ff-text); min-width:0; width:200px; font-family:system-ui; }
.ff-search-underline{ position:absolute; left:0; bottom:0; width:100%; height:2px; transform:scaleX(0); background:linear-gradient(90deg,transparent,var(--ff-from),var(--ff-to),transparent); transition:transform .25s; }
.ff-search:focus-within .ff-search-underline{ transform:scaleX(1); }

/* grid/carrusel */
.ff-grid{ display:grid; grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); gap:22px; }
.ff-scroll{ position:relative; display:grid; grid-auto-flow:column; grid-auto-columns:78%; gap:18px; overflow-x:auto; scroll-snap-type:x mandatory; padding-bottom:10px; }
@media (min-width:480px) and (max-width:1023.98px){ .ff-scroll{ grid-auto-columns:60%; } }
.ff-scroll > .ff-card{ scroll-snap-align:start; }
.ff-scroll-btn{
  position:sticky; top:40%; align-self:center; z-index:4; opacity:0; pointer-events:none; transform:translateY(-50%);
  border:1px solid var(--ff-border); background:rgba(20,20,20,.92); backdrop-filter:blur(10px);
  width:40px; height:40px; border-radius:999px; display:grid; place-items:center; color:var(--ff-text); font-size:1.2rem;
}
.ff-scroll-btn.left{ left:8px; }
.ff-scroll-btn.right{ right:8px; margin-left:auto; }
.ff-scroll-btn.show{ opacity:1; pointer-events:auto; }
.ff-empty{
  grid-column:1/-1; text-align:center; padding:60px 20px; border:2px dashed var(--ff-border);
  border-radius:16px; color:var(--ff-sub);
}

/* Card */
.ff-card{
  position:relative; border-radius:18px; overflow:hidden; background: var(--ff-surface);
  border:1px solid var(--ff-border); display:flex; flex-direction:column; min-height:360px; transition:transform .2s ease, box-shadow .2s ease;
}
.ff-card:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(0,0,0,0.35); }
.ff-card-glow{ position:absolute; inset:0; border-radius:18px; box-shadow:0 0 26px rgba(255,209,102,.18) inset; opacity:0; transition:opacity .2s; }
.ff-card:hover .ff-card-glow{ opacity:.6; }
.ff-card-media{
  position:relative; display:block; width:100%; aspect-ratio:4/3;
  background:rgba(255,255,255,.06); overflow:hidden;
}
.ff-card-media img{ width:100%; height:100%; object-fit:cover; transition:transform .45s; display:block; }
.ff-card:hover .ff-card-media img{ transform:scale(1.06); }
.ff-img-ph{ width:100%; height:100%; display:grid; place-items:center; color:var(--ff-sub); }
.ff-badge{
  position:absolute; top:12px; left:12px; display:inline-flex; align-items:center; gap:6px;
  font-size:.85rem; padding:8px 12px; border-radius:999px; background:rgba(0,0,0,.65);
  border:1px solid var(--ff-border); color:#ffd166; backdrop-filter:blur(8px); font-family:system-ui;
}
.ff-card-body{ padding:16px; display:flex; flex-direction:column; gap:12px; flex:1; }
.ff-card-head{ display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
.ff-title-sm{ margin:0; font-weight:900; line-height:1.15; color:var(--ff-text); text-decoration:none; font-size:1.08rem; letter-spacing:.3px; }
.ff-title-sm:focus { outline: 2px solid var(--ff-to); outline-offset: 2px; border-radius: 6px; }
.ff-chip{
  border:1px solid var(--ff-border); color:var(--ff-sub); border-radius:999px;
  padding:4px 10px; font-size:.85rem; background: rgba(255,255,255,.06); font-family:system-ui;
}
.ff-desc{
  margin:0; color:var(--ff-sub); font: 500 .98rem/1.6 system-ui, sans-serif;
  display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; min-height:3.6em;
}
.ff-card-foot{ margin-top:auto; display:flex; align-items:center; justify-content:space-between; gap:12px; }
.ff-price{ font-weight:900; font-size:1.18rem; color:#ffd166; text-shadow:0 0 10px rgba(255,209,102,.15); }
.ff-variants{ font-size:.92rem; color:var(--ff-sub); }
.ff-btn-sm{ padding:.55rem .85rem; border-radius:10px; }

/* Banner */
.ff-banner{
  position:relative; border-radius:18px; overflow:hidden; border:1px solid var(--ff-border);
  min-height:170px; display:flex; align-items:center; padding:26px; background-size:cover; background-position:center;
}
.ff-banner-steam{ position:absolute; inset:0; background:
  radial-gradient(80% 60% at 0% 0%, rgba(255,255,255,.12), transparent 60%),
  radial-gradient(80% 60% at 100% 0%, rgba(255,255,255,.12), transparent 60%); mix-blend-mode:screen; pointer-events:none; }
.ff-banner-inner{ position:relative; z-index:2; display:flex; gap:16px; align-items:center; }
.ff-banner-title{ font-size:1.55rem; font-weight:900; letter-spacing:.5px; }
.ff-banner-cta-muted{ margin-left:10px; opacity:.9; }

/* Policies & Social */
.ff-policies{ display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:18px; }
.ff-policy-card{ background: var(--ff-surface); border:1px solid var(--ff-border); border-radius:16px; padding:20px; position:relative; backdrop-filter: blur(10px); }
.ff-policy-card h3{ margin:0 0 10px; color:#ffd166; }
.ff-policy-line{ position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg,transparent,var(--ff-from),var(--ff-to),transparent); }
.ff-paylist{ display:flex; flex-wrap:wrap; gap:10px; }
.ff-paylist > span{ background:rgba(255,255,255,.06); border:1px solid var(--ff-border); padding:6px 10px; border-radius:999px; }

.ff-social{ display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px; }
.ff-social-link{ display:flex; align-items:center; gap:12px; text-decoration:none; color:var(--ff-text);
  border:1px solid var(--ff-border); border-radius:12px; padding:14px; background:rgba(255,255,255,.06); transition: all .2s ease; }
.ff-social-link:hover{ background:rgba(255,255,255,.1); transform: translateY(-3px); }

/* Footer */
.ff-footer{ border-top:1px solid var(--ff-border); margin-top:40px; background:#0f0f0f; position:relative; padding:26px 0; }
.ff-footer-inner{ max-width:1200px; margin:0 auto; padding:0 22px; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
.ff-footer-right{ display:flex; align-items:center; gap:10px; color:var(--ff-sub); font-family:system-ui; }
.ff-dot{ width:5px; height:5px; border-radius:999px; background:var(--ff-sub); }
.ff-footer-steam{ position:absolute; inset:0; background: radial-gradient(30% 20% at 70% 0%, rgba(255,255,255,.06), transparent 60%); pointer-events:none; }

/* Motion reduce */
@media (prefers-reduced-motion: reduce){
  * { animation: none !important; transition: none !important; }
}

/* Responsive */
@media (max-width:480px){
  .ff-grid{ grid-template-columns:1fr; }
  .ff-hero { min-height: 420px; padding: 44px 15px; }
  .ff-title { font-size: 2.35rem; }
  .ff-vendor-head { flex-direction: column; text-align: center; }
  .ff-cta-row { justify-content: center; }
  .ff-footer-inner { flex-direction: column; text-align: center; }
}
`;

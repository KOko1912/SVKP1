// E:\SVKP1\frontend\src\pages\Vendedor\Disenos\DisenoEstiloComidaRapida.jsx
import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiSearch, FiStar, FiShoppingBag, FiMessageCircle, FiMapPin, FiExternalLink,
  FiPhone, FiMail, FiClock, FiFacebook, FiInstagram, FiYoutube, FiFramer, FiLoader
} from "react-icons/fi";
import { buildProductoHref } from "../../../lib/productHref";
import "./comidarapida.css";

/**
 * Diseño Estilo Comida Rápida – cálido, enérgico y directo
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
              <FFCard
                key={p.id || p.uuid || `p-${Math.random()}`}
                p={p}
              />
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
              <FFCard
                key={p.id || p.uuid || `p-${Math.random()}`}
                p={p}
              />
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

function FFCard({ p = {} }) {
  const navigate = useNavigate();

  const img = [
    p?.imagenes?.find((x) => x?.isPrincipal)?.url,
    p?.imagenes?.[0]?.url,
    p?.imagen,
    p?.thumb,
    p?.foto,
    p?.cover,
  ].filter(Boolean)[0];

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

  // Ruta absoluta del producto (igual que Cyberpunk)
  const to = useMemo(() => buildProductoHref(p), [p]);

  const Media = ({ children }) =>
    to ? (
      <Link to={to} className="ff-card-media" aria-label={`Ver ${p?.nombre || "producto"}`}>
        {children}
      </Link>
    ) : (
      <div className="ff-card-media">{children}</div>
    );

  const short = (s) => (String(s || "").length > 96 ? `${String(s).slice(0, 96)}…` : String(s || ""));

  const goDetail = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (to) navigate(to);
  };

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
            <button
              type="button"
              onClick={goDetail}
              className="ff-btn ff-btn-primary ff-btn-sm"
            >
              Ver detalle
            </button>
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

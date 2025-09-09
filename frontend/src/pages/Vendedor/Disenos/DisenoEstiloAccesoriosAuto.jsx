import React, { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  FiYoutube,
  FiShield,
  FiTrendingUp,
} from "react-icons/fi";
import { buildProductoHref } from "../../../lib/productHref";
import "./automovilistico.css";

/**
 * Diseño “Garage Pro” para accesorios automotrices
 * - limpio, técnico y sin empalmes
 */
export default function DisenoEstiloAccesoriosAuto({
  tienda,
  productos = [],
  categorias = [],
  orderedBlocks = [],
  toPublicSrc,
}) {
  const [q, setQ] = useState("");

  // Tema desde colorPrincipal (fallback: azul petróleo → naranja)
  const theme = useMemo(() => {
    const { from, to } = extractColors(
      tienda?.colorPrincipal || "linear-gradient(135deg,#0ea5e9,#f97316)"
    );
    return {
      from,
      to,
      contrast: bestTextOn(from, to),
    };
  }, [tienda?.colorPrincipal]);

  // Inyecta variables CSS para el tema
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--auto-from", theme.from);
    root.setProperty("--auto-to", theme.to);
    root.setProperty("--auto-contrast", theme.contrast);
  }, [theme]);

  const portada = normalizePublicSrc(toPublicSrc, tienda?.portada?.url || tienda?.portadaUrl);
  const logo = normalizePublicSrc(toPublicSrc, tienda?.logo?.url || tienda?.logoUrl);

  const filtered = useMemo(() => {
    if (!q.trim()) return productos;
    const n = q.trim().toLowerCase();
    return (productos || []).filter((p) => {
      const hay = `${p?.nombre || p?.title || ""} ${p?.descripcion || p?.detalle || ""}`.toLowerCase();
      return hay.includes(n);
    });
  }, [productos, q]);

  const hasHero = (orderedBlocks || []).some((b) => b?.type === "hero");

  return (
    <div className="auto-root">
      {!hasHero && (
        <AutoHero
          tienda={tienda}
          portada={portada}
          logo={logo}
          contrast={theme.contrast}
        />
      )}

      <div className="auto-container">
        <AutoTopBar q={q} setQ={setQ} />

        {/* Layout dinámico respetando bloques; si no hay, mostramos secciones por defecto */}
        {(orderedBlocks || []).length ? (
          <AutoRenderBlocks
            layout={orderedBlocks}
            productos={productos}
            categorias={categorias}
            tienda={tienda}
            toPublicSrc={toPublicSrc}
          />
        ) : (
          <>
            <AutoSection title="Todos los productos" icon={<FiShoppingBag />}>
              <AutoGrid
                items={filtered}
                toPublicSrc={toPublicSrc}
              />
            </AutoSection>

            {productos.some((p) => p.destacado) && (
              <AutoSection title="Destacados" icon={<FiStar />}>
                <AutoGrid
                  items={productos.filter((p) => p.destacado)}
                  toPublicSrc={toPublicSrc}
                />
              </AutoSection>
            )}

            <AutoSection title="Datos de contacto" icon={<FiShield />}>
              <AutoContact tienda={tienda} />
            </AutoSection>
          </>
        )}
      </div>

      <AutoFooter tienda={tienda} />
    </div>
  );
}

/* ======================= BLOQUES ======================= */
function AutoRenderBlocks({ layout = [], productos = [], categorias = [], tienda, toPublicSrc }) {
  const catName = (id) =>
    categorias.find((c) => Number(c.id) === Number(id))?.nombre || "Categoría";

  return (
    <>
      {layout.map((b) => {
        const p = b?.props || {};
        if (b.type === "hero") {
          return (
            <AutoHero
              key={b.id}
              tienda={tienda}
              portada={normalizePublicSrc(toPublicSrc, tienda?.portada?.url || tienda?.portadaUrl)}
              logo={normalizePublicSrc(toPublicSrc, tienda?.logo?.url || tienda?.logoUrl)}
            />
          );
        }
        if (b.type === "featured") {
          const items = productos.filter((x) => x.destacado).slice(0, p.limit ?? 8);
          if (!items.length) return null;
          return (
            <AutoSection key={b.id} title={p.title || "Destacados"} icon={<FiStar />}>
              <AutoGrid items={items} toPublicSrc={toPublicSrc} />
            </AutoSection>
          );
        }
        if (b.type === "grid") {
          const items = productos.slice(0, p.limit ?? 12);
          if (!items.length) return null;
          return (
            <AutoSection key={b.id} title={p.title || "Productos"} icon={<FiShoppingBag />}>
              <AutoGrid items={items} toPublicSrc={toPublicSrc} />
            </AutoSection>
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
            <AutoSection key={b.id} title={p.title || catName(id)} icon={<FiShoppingBag />}>
              <AutoGrid items={items} toPublicSrc={toPublicSrc} />
            </AutoSection>
          );
        }
        if (b.type === "product") {
          const id = Number(p.productoId);
          if (!id) return null;
          const item = productos.find((x) => Number(x.id) === id);
          if (!item) return null;
          return (
            <AutoSection key={b.id} title={item.nombre || "Producto"} icon={<FiShoppingBag />}>
              <AutoGrid items={[item]} toPublicSrc={toPublicSrc} />
            </AutoSection>
          );
        }
        if (b.type === "banner") {
          const src = normalizePublicSrc(toPublicSrc, tienda?.bannerPromoUrl);
          return (
            <AutoBanner key={b.id} title={p.title} ctaText={p.ctaText} ctaUrl={p.ctaUrl} src={src} />
          );
        }
        return null;
      })}
    </>
  );
}

/* ======================= UI ======================= */
function AutoHero({ tienda, portada, logo, contrast = "#fff" }) {
  return (
    <header
      className="auto-hero"
      style={{
        color: contrast,
        backgroundImage: portada
          ? `linear-gradient(0deg, rgba(0,0,0,.70), rgba(0,0,0,.35)), url(${portada})`
          : `linear-gradient(135deg,var(--auto-from),var(--auto-to))`,
      }}
    >
      <div className="auto-hero-inner auto-container">
        {logo ? (
          <img className="auto-hero-logo" src={logo} alt="logo" />
        ) : (
          <div className="auto-hero-logo ph">LOGO</div>
        )}
        <h1 className="auto-hero-title">{tienda?.nombre || "Mi Tienda"}</h1>
        {tienda?.descripcion && <p className="auto-hero-sub">{tienda.descripcion}</p>}
      </div>
    </header>
  );
}

function AutoTopBar({ q, setQ }) {
  return (
    <div className="auto-topbar">
      <label className="auto-search">
        <FiSearch />
        <input
          type="search"
          placeholder="Buscar faros, tapetes, rines…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="auto-search-underline" />
      </label>

      <div className="auto-topstats">
        <span><FiTrendingUp /> Calidad garantizada</span>
      </div>
    </div>
  );
}

function AutoSection({ title, icon, children }) {
  return (
    <section className="auto-section">
      <div className="auto-section-head">
        <h2 className="auto-section-title">
          <span className="auto-icon">{icon}</span>
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function AutoGrid({ items = [], toPublicSrc }) {
  if (!items.length)
    return (
      <div className="auto-empty">
        <FiShoppingBag size={40} />
        <p>No hay productos en esta sección</p>
      </div>
    );

  return (
    <div className="auto-grid">
      {items.map((p) => (
        <AutoCard key={p.id || p.uuid || `p-${Math.random()}`} p={p} toPublicSrc={toPublicSrc} />
      ))}
    </div>
  );
}

function AutoCard({ p = {}, toPublicSrc }) {
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
  const n = Number(p.precio || 0);
  const precio = isFinite(n) ? `$${n.toFixed(2)}` : "";

  const to = buildProductoHref(p);

  const Media = ({ children }) =>
    to ? (
      <Link to={to} className="auto-card-media" aria-label={`Ver ${p?.nombre || "producto"}`}>
        {children}
      </Link>
    ) : (
      <div className="auto-card-media">{children}</div>
    );

  const short = (s) =>
    (String(s || "").length > 90 ? `${String(s).slice(0, 90)}…` : String(s || ""));

  return (
    <article className="auto-card">
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
                     <rect width='100%' height='100%' fill='#0e1116'/>
                     <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#94a3b8' font-family='sans-serif' font-size='16'>Sin imagen</text>
                   </svg>`
                );
            }}
          />
        ) : (
          <div className="auto-img-ph">
            <FiShoppingBag size={26} />
          </div>
        )}
        {p.destacado && <span className="auto-badge"><FiStar size={14} /> Destacado</span>}
      </Media>

      <div className="auto-card-body">
        <div className="auto-card-head">
          {to ? (
            <Link to={to} className="auto-title-sm" title={p?.nombre}>
              {p?.nombre || p?.title || "Producto"}
            </Link>
          ) : (
            <h4 className="auto-title-sm">{p?.nombre || p?.title || "Producto"}</h4>
          )}
          {categoria && <span className="auto-chip">{categoria}</span>}
        </div>

        {(p?.descripcion || p?.detalle) && (
          <p className="auto-desc">{short(p?.descripcion || p?.detalle)}</p>
        )}

        <div className="auto-card-foot">
          {conPrecio ? <span className="auto-price">{precio}</span> : <span className="auto-variants">Con variantes</span>}
          {to && (
            <Link to={to} className="auto-btn auto-btn-primary auto-btn-sm">
              Ver detalle
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function AutoBanner({ title, ctaText, ctaUrl, src }) {
  return (
    <section className="auto-section">
      <div
        className="auto-banner"
        style={{
          backgroundImage: src
            ? `linear-gradient(90deg, rgba(0,0,0,.55), rgba(0,0,0,.2)), url(${src})`
            : `linear-gradient(135deg,var(--auto-from),var(--auto-to))`,
        }}
      >
        <div className="auto-banner-inner">
          <strong className="auto-banner-title">{title || "Promoción"}</strong>
          {ctaText ? (
            ctaUrl ? (
              <a className="auto-btn auto-btn-primary" href={ctaUrl} target="_blank" rel="noreferrer">
                {ctaText}
              </a>
            ) : (
              <em className="auto-banner-cta-muted">{ctaText}</em>
            )
          ) : null}
        </div>
      </div>
    </section>
  );
}

function AutoContact({ tienda = {} }) {
  return (
    <div className="auto-contact">
      <div className="auto-contact-card">
        {tienda?.telefonoContacto && (
          <a href={`tel:${tienda.telefonoContacto}`} className="auto-contact-item">
            <FiPhone /> {tienda.telefonoContacto}
          </a>
        )}
        {tienda?.email && (
          <a href={`mailto:${tienda.email}`} className="auto-contact-item">
            <FiMail /> {tienda.email}
          </a>
        )}
        {tienda?.ubicacionUrl && (
          <a href={tienda.ubicacionUrl} className="auto-contact-item" target="_blank" rel="noreferrer">
            <FiMapPin /> Ubicación <FiExternalLink />
          </a>
        )}
      </div>

      <AutoHours horario={tienda?.horario} />
      <AutoSocial redes={tienda?.redes} />
    </div>
  );
}

function AutoHours({ horario = {} }) {
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
    <div className="auto-hours">
      <h3><FiClock /> Horario</h3>
      <div className="auto-hours-grid">
        {dias.map((d) => (
          <Fragment key={d.id}>
            <span className="auto-hours-day">{d.label}</span>
            <span className="auto-hours-time">{horario?.[d.id] || "Cerrado"}</span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function AutoSocial({ redes = {} }) {
  if (!redes?.facebook && !redes?.instagram && !redes?.tiktok) return null;
  return (
    <div className="auto-social">
      {redes.facebook && (
        <a className="auto-social-link" href={redes.facebook} target="_blank" rel="noreferrer">
          <FiFacebook /> Facebook
        </a>
      )}
      {redes.instagram && (
        <a className="auto-social-link" href={redes.instagram} target="_blank" rel="noreferrer">
          <FiInstagram /> Instagram
        </a>
      )}
      {redes.tiktok && (
        <a className="auto-social-link" href={redes.tiktok} target="_blank" rel="noreferrer">
          <FiYoutube /> TikTok
        </a>
      )}
    </div>
  );
}

function AutoFooter({ tienda }) {
  return (
    <footer className="auto-footer">
      <div className="auto-container auto-footer-inner">
        <span>© {new Date().getFullYear()} {tienda?.nombre || "Mi Tienda"}</span>
        <span className="auto-dot" />
        <span>Diseño Garage Pro</span>
      </div>
    </footer>
  );
}

/* ======================= utils ======================= */
function normalizePublicSrc(toPublicSrc, u) {
  try {
    if (!u) return "";
    if (typeof u === "string") return toPublicSrc ? toPublicSrc(u) : String(u);
    const v =
      u?.url || u?.path || u?.src || u?.href || u?.filepath || u?.image || u?.thumbnail || "";
    return toPublicSrc ? toPublicSrc(v) : String(v || "");
  } catch {
    return "";
  }
}
function extractColors(gradientString) {
  const m = gradientString?.match(/#([0-9a-f]{6})/gi);
  return { from: m?.[0] || "#0ea5e9", to: m?.[1] || "#f97316" };
}
function hexToRgb(hex) {
  const mm = hex?.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!mm) return [0, 0, 0];
  return [parseInt(mm[1], 16), parseInt(mm[2], 16), parseInt(mm[3], 16)];
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
  return L > 0.45 ? "#0e1116" : "#ffffff";
}

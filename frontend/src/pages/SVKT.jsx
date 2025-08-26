import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import "./Vendedor/Vendedor.css";
import "./Vendedor/PaginaGrid.css";
import {
  FiFacebook, FiInstagram, FiYoutube, FiPhone, FiMail, FiClock,
  FiMapPin, FiExternalLink, FiMessageCircle, FiShoppingBag, FiStar, FiEye
} from "react-icons/fi";
import { useParams, Link } from "react-router-dom";
import NavBarUsuario from "./Usuario/NavBarUsuario";

const API   = (import.meta.env.VITE_API_URL    || "http://localhost:5000").replace(/\/$/, "");
const FILES = (import.meta.env.VITE_FILES_BASE || API).replace(/\/$/, "");

/* =============== Helpers =============== */
const grad = (from, to) => `linear-gradient(135deg, ${from}, ${to})`;

/** Normaliza una ruta (acepta string u objeto con {url,path,src,...}) y devuelve un pathname empezando con '/' */
const toWebPath = (u) => {
  if (!u) return "";
  if (Array.isArray(u)) return toWebPath(u.find(Boolean));
  if (typeof u === "object")
    return toWebPath(u.url || u.path || u.src || u.href || u.filepath || u.location || u.image || u.thumbnail || "");

  const raw = String(u).trim();
  if (!raw) return "";

  // normaliza backslashes de Windows
  const s = raw.replace(/\\/g, "/");

  // Si es URL absoluta, quédate con el pathname
  if (/^https?:\/\//i.test(s)) {
    try { return new URL(s).pathname || ""; } catch { /* noop */ }
  }

  // Busca prefijos comunes y garantiza '/' inicial
  const lower = s.toLowerCase();
  const marks = ["/tiendauploads/","tiendauploads/","/uploads/","uploads/","/files/","files/"];
  for (const m of marks) {
    const i = lower.indexOf(m);
    if (i !== -1) {
      const slice = s.slice(i);
      return slice.startsWith("/") ? slice : `/${slice}`;
    }
  }

  return s.startsWith("/") ? s : `/${s}`;
};

/** Une base + pathname y **codifica** (espacios, acentos, etc.) para evitar 404 */
const toPublicUrl = (u) => {
  const p = toWebPath(u);
  return p ? `${FILES}${encodeURI(p)}` : "";
};

// Toma principal o primera imagen válida
const primaryImageFrom = (imagenes = []) => {
  if (!Array.isArray(imagenes) || !imagenes.length) return "";
  const get = (o) => o?.url || o?.path || o?.src || o?.location || o?.image || o?.thumbnail || "";
  const principal = imagenes.find(x => typeof x === "object" && x?.isPrincipal);
  if (principal) return get(principal);
  for (const it of imagenes) {
    if (typeof it === "string" && it) return it;
    const v = get(it);
    if (v) return v;
  }
  return "";
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

/* =============== Página =============== */
export default function SVKT() {
  const { slug } = useParams();
  const [tienda, setTienda] = useState(null);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ¿hay sesión de usuario? (para mostrar NavBarUsuario)
  const usuario = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("usuario") || "null"); } catch { return null; }
  }, []);

  // Tema global
  useEffect(() => {
    document.body.classList.add("vendor-theme");
    return () => document.body.classList.remove("vendor-theme");
  }, []);

  // Variables CSS de marca
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
    const softHalos =
      `radial-gradient(900px 600px at 0% -10%, ${from}22, transparent 60%),` +
      `radial-gradient(900px 600px at 100% -10%, ${to}22, transparent 60%)`;
    root.setProperty("--page-bg", `${softHalos}, linear-gradient(135deg, ${from}, ${to})`);
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
        <div className="error-message">Error: {error}</div>
      </div>
    );
  }

  const blocks = tienda?.homeLayout?.blocks;

  return (
    <div className="vendedor-container">
      {usuario ? <NavBarUsuario /> : null}

      {Array.isArray(blocks) && blocks.some(b => b.type === "hero") ? null : (
        <HeroPortada tienda={tienda} />
      )}

      <VendorInfoSection tienda={tienda} />

      {Array.isArray(blocks) && blocks.length > 0 ? (
        <RenderBlocks layout={blocks} productos={productos} categorias={categorias} tienda={tienda} />
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

/* =============== Render de bloques =============== */
function RenderBlocks({ layout = [], productos = [], categorias = [], tienda }) {
  if (!Array.isArray(layout) || !layout.length) return null;
  const catName = (id) => categorias.find(c => Number(c.id) === Number(id))?.nombre || "Categoría";

  return (
    <>
      {layout.map(b => {
        const type = b.type;
        const p = b.props || {};

        if (type === "hero") {
          return <HeroPortada key={b.id} tienda={tienda} align={p.align} showLogo={p.showLogo} showDescripcion={p.showDescripcion} />;
        }

        if (type === "featured") {
          const items = productos.filter(x => x.destacado).slice(0, p.limit ?? 8);
          if (!items.length) return null;
          return <RowSection key={b.id} title={p.title || "Destacados"} icon={<FiStar />} items={items} />;
        }

        if (type === "grid") {
          const items = productos.slice(0, p.limit ?? 12);
          if (!items.length) return null;
          return <RowSection key={b.id} title={p.title || "Todos los productos"} icon={<FiShoppingBag />} items={items} />;
        }

        if (type === "category") {
          const id = Number(p.categoriaId);
          if (!id) return null;
          const items = productos
            .filter(prod => Array.isArray(prod.categorias) && prod.categorias.some(pc => Number(pc.categoriaId) === id))
            .slice(0, p.limit ?? 12);
          if (!items.length) return null;
          return <RowSection key={b.id} title={p.title || catName(id)} icon={<FiShoppingBag />} items={items} />;
        }

        if (type === "product") {
          const id = Number(p.productoId);
          if (!id) return null;
          const item = productos.find(prod => Number(prod.id) === id);
          if (!item) return null;
          return <RowSection key={b.id} title={item.nombre || "Producto"} icon={<FiShoppingBag />} items={[item]} />;
        }

        if (type === "banner") {
          const src = toPublicUrl(tienda?.bannerPromoUrl);
          return (
            <section key={b.id} className="store-section">
              <div className="pv-banner" style={{ backgroundImage: src ? `url(${src})` : undefined }}>
                <div className="pv-banner-content">
                  <strong>{p.title || "Promoción"}</strong>
                  {p.ctaText ? <em>{p.ctaText}</em> : null}
                </div>
              </div>
            </section>
          );
        }

        if (type === "logo") {
          return (
            <section key={b.id} className="store-section" style={{ display: "grid", placeItems: "center" }}>
              {tienda?.logoUrl ? <img src={toPublicUrl(tienda.logoUrl)} alt="logo" style={{ maxWidth: 180 }} /> : null}
            </section>
          );
        }

        return null;
      })}
    </>
  );
}

/* =============== Componentes =============== */
function HeroPortada({ tienda, align = "center", showLogo = true, showDescripcion = true }) {
  const portada = toPublicUrl(tienda?.portadaUrl);
  const logo = toPublicUrl(tienda?.logoUrl);
  const colors = extractColors(tienda?.colorPrincipal || grad("#6d28d9", "#c026d3"));

  const justify = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

  return (
    <header
      className="tienda-hero"
      style={{
        backgroundImage: portada
          ? `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${portada})`
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
  return (
    <section className="store-section">
      <div className="store-info-card">
        <div className="store-info-header">
          <img src={toPublicUrl(tienda?.logoUrl)} alt="Logo" className="store-logo" loading="lazy" />
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
              <a href={`tel:${tienda.telefonoContacto}`} className="btn primary"><FiPhone /> Llamar</a>
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
  return (
    <div className="store-hours">
      <h3><FiClock /> Horario de atención</h3>
      <div className="hours-grid">
        {dias.map(dia => (
          <Fragment key={dia.id}>
            <span>{dia.label}</span>
            <span>{horario[dia.id] || "Cerrado"}</span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function RowSection({ title, icon, items = [] }) {
  const ref = useRef(null);
  const [showControls, setShowControls] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (ref.current) {
      setCanScrollLeft(ref.current.scrollLeft > 0);
      setCanScrollRight(ref.current.scrollLeft < ref.current.scrollWidth - ref.current.clientWidth);
    }
  };

  useEffect(() => {
    const current = ref.current;
    if (current) {
      current.addEventListener("scroll", checkScroll);
      checkScroll();
    }
    return () => { if (current) current.removeEventListener("scroll", checkScroll); };
  }, []);

  const scrollBy = (dx) => {
    if (ref.current) {
      ref.current.scrollBy({ left: dx, behavior: "smooth" });
      setTimeout(checkScroll, 300);
    }
  };

  return (
    <section className="store-section"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div className="row-head">
        <h2 className="section-title">{icon} {title} <span className="item-count">({items.length})</span></h2>
        {items.length > 0 && (
          <div className={`row-actions ${showControls ? "visible" : ""}`}>
            <button type="button" className="btn-circle" onClick={() => scrollBy(-380)} disabled={!canScrollLeft} aria-label="Scroll left">◀</button>
            <button type="button" className="btn-circle" onClick={() => scrollBy(380)} disabled={!canScrollRight} aria-label="Scroll right">▶</button>
          </div>
        )}
      </div>

      <div ref={ref} className="row-scroll">
        {items.length > 0 ? items.map((p) => <PosterCard key={p.id || `p-${p._id}`} p={p} />) : (
          <div className="empty-state">
            <FiShoppingBag size={48} />
            <p>No hay productos en esta sección</p>
          </div>
        )}
      </div>
    </section>
  );
}

function PosterCard({ p = {} }) {
  const img = toPublicUrl(primaryImageFrom(p?.imagenes)) ||
              toPublicUrl(p?.imagen || p?.thumb || p?.foto || p?.cover);

  const categoria =
    p?.categoria || p?.category || (Array.isArray(p?.categorias) && p.categorias[0]?.nombre) || "";

  const conPrecio =
    typeof p?.precio === "number" || (typeof p?.precio === "string" && p.precio.trim() !== "");

  const desc = (p?.descripcion || p?.detalle || p?.resumen || "").toString().trim();

  // ✅ Enlace PÚBLICO por UUID (no por slug)
  const publicHref = p?.uuid ? `/producto/${p.uuid}` : null;

  const Media = ({ children }) =>
    publicHref ? (
      <Link to={publicHref} className="poster-media" aria-label={`Ver ${p?.nombre || "producto"}`}>
        {children}
      </Link>
    ) : (
      <div className="poster-media">{children}</div>
    );

  return (
    <article className="poster-card">
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
        {publicHref ? (
          <Link to={publicHref} className="poster-title linklike" title={p?.nombre}>
            {p?.nombre || p?.title || "Producto"}
          </Link>
        ) : (
          <h4 className="poster-title" title={p?.nombre}>{p?.nombre || p?.title || "Producto"}</h4>
        )}

        {categoria && <div className="poster-meta">{categoria}</div>}
        {desc && <div className="poster-desc">{desc.length > 80 ? `${desc.substring(0, 80)}…` : desc}</div>}

        <div className="poster-actions-row">
          {conPrecio ? (
            <div className="poster-price">
              <span className="price">${Number(p.precio || 0).toFixed(2)}</span>
              {p.precioOriginal && (<span className="original-price">${Number(p.precioOriginal).toFixed(2)}</span>)}
            </div>
          ) : (
            <div className="poster-price"><span className="badge">Ver variantes</span></div>
          )}
          {publicHref && (
            <Link to={publicHref} className="btn btn-secondary btn-sm">
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
        <h3>Envíos</h3>
        <p>{tienda?.envioCobertura || "No especificado"}</p>
        <p>{tienda?.envioCosto || "Costo no especificado"}</p>
        <p>{tienda?.envioTiempo || "Tiempo no especificado"}</p>
      </div>
      <div className="policy-card">
        <h3>Métodos de pago</h3>
        <div className="payment-methods">
          {(tienda?.metodosPago || []).map((metodo, i) => (<span key={i}>{metodo}</span>))}
        </div>
      </div>
      <div className="policy-card">
        <h3>Devoluciones</h3>
        <p>{tienda?.devoluciones || "Política no especificada"}</p>
      </div>
    </section>
  );
}

function SocialLinks({ redes = {} }) {
  if (!redes.facebook && !redes.instagram && !redes.tiktok) return null;
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

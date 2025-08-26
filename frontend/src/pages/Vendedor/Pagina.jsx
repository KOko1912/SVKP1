// E:\SVKP1\frontend\src\pages\Vendedor\Pagina.jsx
import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Nabvendedor from "./Nabvendedor";
import "./Vendedor.css";
import "./PaginaGrid.css";
import {
  FiFacebook, FiInstagram, FiYoutube, FiPhone, FiMail, FiClock,
  FiMapPin, FiExternalLink, FiMessageCircle, FiShoppingBag, FiStar, FiSearch
} from "react-icons/fi";
import Swal from "sweetalert2";

/* ===================== Bases ===================== */
const API_BASE  = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
const FILES_ENV = (import.meta.env.VITE_FILES_BASE || "").replace(/\/$/, "");
const FILES_BASE = (
  FILES_ENV
    ? (/^https?:\/\//i.test(FILES_ENV) ? FILES_ENV : `${API_BASE}${FILES_ENV.startsWith("/") ? "" : "/"}${FILES_ENV}`)
    : API_BASE
).replace(/\/$/, "");

/* ===================== Helpers ===================== */
const grad = (from, to) => `linear-gradient(135deg, ${from}, ${to})`;

const toWebPath = (u) => {
  if (!u) return "";
  if (Array.isArray(u)) return toWebPath(u.find(Boolean));
  if (typeof u === "object")
    return toWebPath(u.url || u.path || u.src || u.href || u.filepath || u.location || u.image || u.thumbnail || "");
  const raw = String(u).trim();
  if (!raw) return "";
  const clean = raw.replace(/\\/g, "/");
  if (/^https?:\/\//i.test(clean)) {
    try { return new URL(clean).pathname || ""; } catch { /* noop */ }
  }
  const lower = clean.toLowerCase();
  const marks = ["/tiendauploads/","tiendauploads/","/uploads/","uploads/","/files/","files/"];
  for (const m of marks) {
    const i = lower.indexOf(m.replace(/^\//,""));
    if (i !== -1) {
      const slice = clean.slice(i);
      return slice.startsWith("/") ? slice : `/${slice}`;
    }
  }
  return clean.startsWith("/") ? clean : `/${clean}`;
};

const toPublicUrl = (u) => {
  const p = toWebPath(u);
  return p ? `${FILES_BASE}${encodeURI(p)}` : "";
};

const slugify = (str = "") =>
  String(str)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);

const safeJsonParse = (t, fb=null) => { try { return JSON.parse(t); } catch { return fb; } };

/* ===================== Página ===================== */
export default function Pagina() {
  const usuario = useMemo(() => safeJsonParse(localStorage.getItem("usuario") || "{}", {}), []);
  const headers = { "x-user-id": usuario?.id };

  const [tienda, setTienda] = useState(null);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Tema global
  useEffect(() => {
    document.body.classList.add("vendor-theme");
    return () => document.body.classList.remove("vendor-theme");
  }, []);

  // Propaga tema a variables CSS
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
    const pageBg = `${softHalos}, linear-gradient(135deg, ${from}, ${to})`;
    root.setProperty("--page-bg", pageBg);
  }, [tienda?.colorPrincipal]);

  // Carga datos del vendedor
  useEffect(() => {
    (async () => {
      try {
        const rt = await fetch(`${API_BASE}/api/tienda/me`, { headers });
        const dt = await rt.json();
        if (!rt.ok) throw new Error(dt?.message || dt?.error || "No se pudo cargar la tienda");
        setTienda(dt);

        const rp = await fetch(`${API_BASE}/api/v1/productos?tiendaId=${dt.id}`, { headers });
        const dp = await rp.json();
        setProductos(Array.isArray(dp?.items) ? dp.items : Array.isArray(dp) ? dp : []);

        const rc = await fetch(`${API_BASE}/api/v1/categorias?tiendaId=${dt.id}`, { headers });
        const dc = await rc.json();
        setCategorias(Array.isArray(dc) ? dc : []);
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ===================== Acciones: Publicar / Ver / Copiar ===================== */
  const computePublicKey  = (t) => t?.slug || t?.publicUuid || t?.uuid || t?.id;
  const computePublicPath = (t) => `/t/${computePublicKey(t)}`;
  const buildPublicUrl    = (t) => `${window.location.origin}/#${computePublicPath(t)}`;

  async function publishStore(t) {
    try {
      if (!t) throw new Error("No hay tienda cargada");
      if (t?.isPublished && t?.slug) {
        throw new Error("La tienda ya fue publicada y el slug no se puede cambiar.");
      }

      const { value: desiredSlug } = await Swal.fire({
        title: "Publicar tienda",
        input: "text",
        inputLabel: "Slug público (puedes personalizarlo)",
        inputValue: t.slug || (t.nombre ? slugify(t.nombre) : "") || "",
        inputPlaceholder: "mi-tienda-bonita",
        showCancelButton: true,
        confirmButtonText: "Publicar",
        cancelButtonText: "Cancelar",
        allowOutsideClick: false
      });
      if (desiredSlug === undefined) return; // cancelado

      const resp = await fetch(`${API_BASE}/api/tienda/publicar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-user-id": t.usuarioId || usuario?.id },
        body: JSON.stringify({ publish: true, slug: desiredSlug || t.slug || t.nombre || "" })
      });

      const raw = await resp.text();
      let data;
      try { data = JSON.parse(raw); } catch {
        throw new Error(`HTTP ${resp.status}: ${raw?.slice(0, 120) || 'Respuesta no JSON'}`);
      }
      if (!resp.ok) throw new Error(data?.error || data?.message || "No se pudo publicar");

      setTienda((prev) => ({
        ...prev,
        slug: data?.tienda?.slug || prev?.slug,
        isPublished: true,
        publishedAt: data?.tienda?.publishedAt
      }));

      await Swal.fire({ icon: "success", title: "¡Tienda publicada!", timer: 1400, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Error al publicar", text: e.message || String(e) });
    }
  }

  function openPublicView(t) {
    if (!t) return;
    if (!t?.isPublished || !computePublicKey(t)) {
      Swal.fire({ icon: "info", title: "Aún sin publicar", text: "Publica tu tienda para ver la URL pública." });
      return;
    }
    window.open(buildPublicUrl(t), "_blank", "noopener,noreferrer");
  }

  async function copyPublicLink(t) {
    try {
      if (!t?.isPublished || !computePublicKey(t)) {
        throw new Error("Publica la tienda primero para obtener tu enlace.");
      }
      const url = buildPublicUrl(t);
      await navigator.clipboard.writeText(url);
      Swal.fire({ icon: "success", title: "Enlace copiado", text: url, timer: 1500, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: "error", title: "No se pudo copiar", text: e.message || String(e) });
    }
  }

  /* ===================== Layout normalizado ===================== */
  const orderedBlocks = useMemo(() => {
    const raw = tienda?.homeLayout ?? null;
    const blocks = Array.isArray(raw) ? raw : Array.isArray(raw?.blocks) ? raw.blocks : [];
    // aplica defaults y orden por posición visual (y -> x -> z)
    const withDefaults = blocks.map(b => ({
      ...b,
      props: { ...(DEFAULT_PROPS[b.type] || {}), ...(b.props || {}) },
      gs: { ...(b.gs || {}) },
      z: Number.isFinite(+b.z) ? +b.z : 1,
    }));
    return withDefaults
      .sort((a, b) => {
        const ay = a.gs?.y ?? 0, by = b.gs?.y ?? 0;
        if (ay !== by) return ay - by;
        const ax = a.gs?.x ?? 0, bx = b.gs?.x ?? 0;
        if (ax !== bx) return ax - bx;
        return (a.z||1) - (b.z||1);
      });
  }, [tienda?.homeLayout]);

  /* ===================== Render principal ===================== */
  if (loading) return (
    <div className="vendedor-container">
      <Nabvendedor />
      <div className="loading-screen">
        <div className="loading-spinner" />
        <div>Cargando tienda...</div>
      </div>
    </div>
  );

  if (error) return (
    <div className="vendedor-container">
      <Nabvendedor />
      <div className="error-message">Error: {error}</div>
    </div>
  );

  return (
    <div className="vendedor-container">
      <Nabvendedor />

      {/* Barra de publicación / compartir */}
      {tienda && (
        <div style={{
          display: "flex", gap: "12px", padding: "12px 16px",
          background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(226,232,240,0.7)", position: "sticky",
          top: "var(--vendor-safe-top, 0px)", zIndex: 9
        }}>
          <button
            className="btn primary"
            onClick={() => publishStore(tienda)}
            disabled={Boolean(tienda?.isPublished && tienda?.slug)}
            title={tienda?.isPublished ? "Ya publicada" : "Publicar tienda"}
          >
            {tienda?.isPublished ? "Ya publicada" : "Publicar tienda"}
          </button>
          <button className="btn" onClick={() => openPublicView(tienda)}>
            Ver vista pública
          </button>
          <button className="btn" onClick={() => copyPublicLink(tienda)}>
            Copiar enlace público
          </button>
          <span style={{ marginLeft: "auto", alignSelf: "center", fontSize: 14, opacity: 0.8 }}>
            {tienda?.isPublished && tienda?.slug
              ? `URL: ${window.location.origin}/#/t/${tienda.slug}`
              : "URL: Aún sin publicar"}
          </span>
        </div>
      )}

      {/* Si el layout no trae hero en la primera "fila", muestra uno por defecto arriba */}
      {!(orderedBlocks || []).some(b => b.type === "hero") && <HeroPortada tienda={tienda} />}

      {/* Ficha + horario */}
      <VendorInfoSection tienda={tienda} />

      {/* Render según layout configurado (respetando orden) */}
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
              Array.isArray(p.categorias) &&
              p.categorias.some(pc => pc.categoriaId === cat.id)
            );
            if (!items.length) return null;
            return (
              <RowSection
                key={cat.id}
                title={cat.nombre}
                icon={<FiShoppingBag />}
                items={items}
              />
            );
          })}
        </>
      )}

      {/* Políticas, redes, footer */}
      <StorePolicies tienda={tienda} />
      <SocialLinks redes={tienda?.redes} />
      <ContactFooter tienda={tienda} />
    </div>
  );
}

/* =================== Render de bloques =================== */
const DEFAULT_PROPS = {
  hero:     { showLogo: true, showDescripcion: true, align: 'center' },
  featured: { title: 'Destacados', limit: 8 },
  grid:     { title: 'Todos los productos', limit: 12, showFilter: true },
  category: { title: '', categoriaId: null, limit: 12, showFilter: true },
  product:  { productoId: null },
  banner:   { title: 'Promoción', ctaText: 'Ver más', ctaUrl: '' },
  logo:     { shape: 'rounded', frame: 'thin' },
};

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
          const src = toPublicUrl(tienda?.bannerPromoUrl);
          return (
            <section key={b.id} className="store-section">
              <div className="pv-banner" style={{ backgroundImage: src ? `url(${src})` : undefined }}>
                <div className="pv-banner-content">
                  <strong>{p.title || "Promoción"}</strong>
                  {p.ctaText ? (
                    p.ctaUrl
                      ? <a href={p.ctaUrl} target="_blank" rel="noreferrer" style={{ color: "#fff", marginLeft: 8, textDecoration: "underline" }}>{p.ctaText}</a>
                      : <em style={{ marginLeft: 8 }}>{p.ctaText}</em>
                  ) : null}
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

/* =================== Componentes =================== */
function HeroPortada({ tienda, align = "center", showLogo = true, showDescripcion = true }) {
  const portada = toPublicUrl(tienda?.portadaUrl);
  const logo = toPublicUrl(tienda?.logoUrl);
  const colors = extractColors(tienda?.colorPrincipal || grad("#6d28d9", "#c026d3"));

  const justify =
    align === "left" ? "flex-start" :
    align === "right" ? "flex-end" :
    "center";

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
          <img
            src={toPublicUrl(tienda?.logoUrl)}
            alt="Logo"
            className="store-logo"
            loading="lazy"
          />
          <div>
            <h2>{tienda?.nombre || "Mi Tienda"}</h2>
            <div className="store-categories">
              {tienda?.categoria && <span>{tienda.categoria}</span>}
              {(tienda?.subcategorias || []).map((cat, i) => (
                <span key={i}>{cat}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="store-info-body">
          <p>{tienda?.descripcion || "No hay descripción disponible"}</p>

          <div className="store-contact-buttons">
            {tienda?.telefonoContacto && (
              <a href={`tel:${tienda.telefonoContacto}`} className="btn primary">
                <FiPhone /> Llamar
              </a>
            )}
            {tienda?.telefonoContacto && (
              <a
                className="btn"
                href={`https://wa.me/${String(tienda.telefonoContacto).replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                <FiMessageCircle /> WhatsApp
              </a>
            )}
            {tienda?.email && (
              <a href={`mailto:${tienda.email}`} className="btn">
                <FiMail /> Email
              </a>
            )}
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

function RowSection({ title, icon, items = [], enableSearch = false }) {
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
          {filtered.length > 0 && (
            <div className={`row-actions ${showControls ? "visible" : ""}`}>
              <button type="button" className="btn-circle" onClick={() => scrollBy(-380)} disabled={!canScrollLeft} aria-label="Scroll left">◀</button>
              <button type="button" className="btn-circle" onClick={() => scrollBy(380)} disabled={!canScrollRight} aria-label="Scroll right">▶</button>
            </div>
          )}
        </div>
      </div>

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
    </section>
  );
}

function PosterCard({ p = {} }) {
  const pickImage = (prod) => {
    const cand = [
      prod?.imagenes?.find(x => x?.isPrincipal)?.url,
      prod?.imagenes?.[0]?.url,
      prod?.imagen, prod?.thumb, prod?.foto, prod?.cover
    ];
    return toPublicUrl(cand.find(Boolean));
  };

  const img = pickImage(p);
  const categoria = p?.categoria || p?.category || (p?.categorias?.[0]?.nombre) || "";
  const conPrecio = typeof p?.precio === "number" || (typeof p?.precio === "string" && p.precio.trim() !== "");
  const desc = (p?.descripcion || p?.detalle || p?.resumen || "").toString().trim();

  return (
    <article className="poster-card">
      <div className="poster-media">
        {img ? <img src={img} alt={p?.nombre || "producto"} loading="lazy"
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
        /> : (
          <div className="image-placeholder"><FiShoppingBag size={24} color="#9ca3af" /></div>
        )}
        {p.destacado && <div className="featured-badge"><FiStar size={14} /></div>}
      </div>
      <div className="poster-body">
        <h4 className="poster-title" title={p?.nombre}>{p?.nombre || p?.title || "Producto"}</h4>
        {categoria && <div className="poster-meta">{categoria}</div>}
        {desc && <div className="poster-desc">{desc.length > 60 ? `${desc.substring(0, 60)}...` : desc}</div>}
        {conPrecio ? (
          <div className="poster-price">
            <span className="price">${Number(p.precio || 0).toFixed(2)}</span>
            {p.precioOriginal && (<span className="original-price">${Number(p.precioOriginal).toFixed(2)}</span>)}
          </div>
        ) : (
          <div className="poster-price"><span className="badge">Ver variantes</span></div>
        )}
      </div>
    </article>
  );
}

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
      </div>
    </footer>
  );
}

/* ===================== Helpers color ===================== */
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

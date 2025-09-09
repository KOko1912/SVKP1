// frontend/src/pages/Vendedor/Disenos/TemplateBase.jsx
import React from "react";
import { Link } from "react-router-dom";

/**
 * TemplateBase — motor genérico para plantillas de tienda.
 * Props que recibe desde Pagina.jsx / SVKT.jsx:
 *   { theme, tienda, productos, categorias, orderedBlocks, toPublicSrc, isPublic }
 */
export default function TemplateBase({
  theme = {},
  tienda = {},
  productos = [],
  categorias = [],
  orderedBlocks = [],
  toPublicSrc,
  isPublic,
}) {
  const cfg = {
    name: theme.name || "base",
    bg: theme.bg || "#0b0c10",
    surface: theme.surface || "rgba(255,255,255,0.06)",
    text: theme.text || "#f2f4f8",
    sub: theme.sub || "#c8d0df",
    accent: theme.accent || "#7c3aed",
    fontFamily: theme.fontFamily || "ui-sans-serif, system-ui, sans-serif",
    heroFallback: theme.heroFallback || "",
    bannerMinH: theme.bannerMinH || "280px",
    heroOverlay: theme.heroOverlay || "radial-gradient(60% 60% at 50% 40%, rgba(124,58,237,.18), transparent)",
    card: theme.card || { objectFit: "cover", bannerPos: "center 40%" },
  };

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

  const portada =
    toPublicSrc?.(tienda?.portada?.url || tienda?.portadaUrl) || "";
  const logo =
    toPublicSrc?.(tienda?.logo?.url || tienda?.logoUrl) || "";

  const hasHero = (orderedBlocks || []).some((b) => b.type === "hero");

  return (
    <div className="tplbase-root" style={{ background: cfg.bg, color: cfg.text, fontFamily: cfg.fontFamily }}>
      <style>{css(cfg)}</style>

      {/* HERO */}
      <section className="tplbase-hero" style={{ minHeight: cfg.bannerMinH }}>
        {portada ? (
          <div
            className="tplbase-hero-bg"
            style={{
              backgroundImage: `${cfg.heroOverlay}, url('${portada}')`,
              backgroundPosition: cfg.card.bannerPos || "center 40%",
            }}
            aria-hidden="true"
          />
        ) : (
          <div className="tplbase-hero-bg" aria-hidden="true" />
        )}

        <div className="tplbase-hero-inner">
          {logo && (
            <img
              className="tplbase-logo"
              src={logo}
              alt={tienda?.nombre || "Logo"}
              loading="lazy"
            />
          )}
          <h1 className="tplbase-title">{tienda?.nombre || "Tu tienda"}</h1>
          <p className="tplbase-desc">
            {tienda?.descripcion || cfg.heroFallback || "Productos increíbles a un clic."}
          </p>
        </div>
      </section>

      {/* GRID SIMPLE */}
      <section className="tplbase-section">
        <div className="tplbase-section-header">
          <h2 className="tplbase-h2">Todos los productos</h2>
        </div>

        <div className="tplbase-grid">
          {productos?.length ? (
            productos.map((p) => {
              const img =
                toPublicSrc?.(
                  [
                    p?.imagenes?.find((x) => x?.isPrincipal)?.url,
                    p?.imagenes?.[0]?.url,
                    p?.portadaUrl,
                    p?.imagenUrl,
                  ].find(Boolean)
                ) || "";
              const to = productPath(tienda, p);

              return (
                <article key={String(p?.uuid || p?.id)} className="tplbase-card">
                  <Link to={to} className="tplbase-card-media" aria-label={(p?.nombre || "Producto") + " — ver detalle"}>
                    {img ? (
                      <img src={img} alt={p?.nombre || "Producto"} loading="lazy" />
                    ) : (
                      <div className="tplbase-card-ph" />
                    )}
                  </Link>
                  <div className="tplbase-card-body">
                    <h3 className="tplbase-card-title">
                      <Link to={to}>{p?.nombre || p?.title || "Producto"}</Link>
                    </h3>
                    {typeof p?.precio === "number" || typeof p?.precio === "string" ? (
                      <div className="tplbase-card-price">
                        {String(p?.precio).startsWith("$") ? p?.precio : `$${p?.precio}`}
                      </div>
                    ) : p?.hasVariantes ? (
                      <div className="tplbase-card-variants">Con variantes</div>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="tplbase-empty">Aún no hay productos.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function css(cfg) {
  return `
.tplbase-root {
  --surface: ${cfg.surface};
  --sub: ${cfg.sub};
  --accent: ${cfg.accent};
}
.tplbase-hero {
  position: relative;
  display: grid;
  place-items: center;
  padding: 48px 16px;
  overflow: hidden;
}
.tplbase-hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(0,0,0,.35), rgba(0,0,0,.35));
  background-size: cover;
  background-repeat: no-repeat;
  filter: saturate(1.1);
}
.tplbase-hero-inner {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 960px;
}
.tplbase-logo {
  width: 96px;
  height: 96px;
  object-fit: contain;
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0,0,0,.35);
  margin-bottom: 12px;
  background: rgba(255,255,255,.06);
  padding: 8px;
}
.tplbase-title {
  font-size: clamp(28px, 4vw, 40px);
  line-height: 1.1;
  margin: 6px 0;
}
.tplbase-desc {
  color: var(--sub);
  max-width: 720px;
  margin: 8px auto 0;
}
.tplbase-section {
  padding: 28px 16px 46px;
}
.tplbase-section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
}
.tplbase-h2 {
  font-size: 18px;
  letter-spacing: .2px;
  color: var(--sub);
}
.tplbase-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
}
.tplbase-card {
  background: var(--surface);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0,0,0,.15);
  transition: transform .2s ease, box-shadow .2s ease;
}
.tplbase-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(0,0,0,.24);
}
.tplbase-card-media {
  display: block;
  aspect-ratio: 1/1;
  background: rgba(255,255,255,.04);
}
.tplbase-card-media img {
  width: 100%;
  height: 100%;
  object-fit: ${cfg.card.objectFit || "cover"};
}
.tplbase-card-ph {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  opacity: .5;
}
.tplbase-card-body {
  padding: 10px 12px 14px;
}
.tplbase-card-title {
  font-size: 14px;
  margin: 0 0 6px;
}
.tplbase-card-title a {
  color: inherit;
  text-decoration: none;
}
.tplbase-card-title a:hover { text-decoration: underline; }
.tplbase-card-price, .tplbase-card-variants {
  font-size: 13px;
  color: var(--sub);
}
.tplbase-empty {
  opacity: .8;
  text-align: center;
  padding: 28px 12px;
}
`;
}

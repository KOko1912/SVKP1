// Devuelve SIEMPRE una ruta ABSOLUTA válida para el detalle
export function buildProductoHref(p) {
  const hasUuid  = p?.uuid || p?.publicUuid;
  const hasSlug  = p?.slug;
  const hasIdNum = Number.isFinite(+p?.id);

  if (hasUuid) return `/producto/${encodeURIComponent(p.uuid || p.publicUuid)}`;
  if (hasSlug) return `/producto/${encodeURIComponent(p.slug)}`;
  if (hasIdNum) return `/producto-id/${encodeURIComponent(p.id)}`;
  return null; // si no hay nada, mejor NO renderizar el botón
}

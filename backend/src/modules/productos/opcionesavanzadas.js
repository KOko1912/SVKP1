// backend/src/modules/productos/opcionesavanzadas.js

/* Helpers locales */
function toNum(x) {
  if (x === null || x === undefined || x === '') return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}
function toInt(x) {
  if (x === null || x === undefined || x === '') return null;
  const n = Number(x);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
function isNonEmptyStr(x) {
  return typeof x === 'string' && x.trim().length > 0;
}

/**
 * Normaliza la estructura de licenciamiento a:
 * { original: boolean, notas?: string } | null
 * Soporta tanto `licenciamiento` completo como `licOriginal` / `licNotas`.
 */
function normalizeLicenciamiento(body) {
  if (body && typeof body.licenciamiento === 'object' && body.licenciamiento !== null) {
    const { original, notas } = body.licenciamiento;
    const out = {};
    if (typeof original === 'boolean') out.original = original;
    if (isNonEmptyStr(notas)) out.notas = String(notas);
    return Object.keys(out).length ? out : null;
  }
  // Compatibilidad con payloads planos
  if ('licOriginal' in body || 'licNotas' in body) {
    const out = { original: !!body.licOriginal };
    if (isNonEmptyStr(body.licNotas)) out.notas = String(body.licNotas);
    return out;
  }
  return null;
}

/**
 * Construye el objeto parcial para Prisma con los campos de "Opciones avanzadas".
 * Úsalo en PATCH de productos.
 */
function buildAdvancedPatch(body = {}, { producto } = {}) {
  const {
    sku, gtin, marca, condicion,
    pesoGramos, altoCm, anchoCm, largoCm, claseEnvio,
    diasPreparacion, politicaDevolucion, digitalUrl,
  } = body;

  const partial = {
    ...(sku               !== undefined ? { sku } : {}),
    ...(gtin              !== undefined ? { gtin } : {}),
    ...(marca             !== undefined ? { marca } : {}),
    ...(condicion         !== undefined ? { condicion } : {}),
    ...(pesoGramos        !== undefined ? { pesoGramos: toNum(pesoGramos) } : {}),
    ...(altoCm            !== undefined ? { altoCm: toNum(altoCm) } : {}),
    ...(anchoCm           !== undefined ? { anchoCm: toNum(anchoCm) } : {}),
    ...(largoCm           !== undefined ? { largoCm: toNum(largoCm) } : {}),
    ...(claseEnvio        !== undefined ? { claseEnvio } : {}),
    ...(diasPreparacion   !== undefined ? { diasPreparacion: toInt(diasPreparacion) } : {}),
    ...(politicaDevolucion!== undefined ? { politicaDevolucion } : {}),
  };

  // digitalUrl se permite para cualquier tipo (tu UI ya lo oculta cuando no aplica).
  if (digitalUrl !== undefined) {
    partial.digitalUrl = isNonEmptyStr(digitalUrl) ? String(digitalUrl) : null;
  }

  const lic = normalizeLicenciamiento(body);
  if (lic !== null) partial.licenciamiento = lic;

  // Nada de variantes aquí: sólo “Opciones avanzadas” del producto.
  return partial;
}

module.exports = {
  buildAdvancedPatch,
  normalizeLicenciamiento,
  // (exporto helpers por si luego los quieres reutilizar)
  _utils: { toNum, toInt, isNonEmptyStr }
};

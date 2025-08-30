// backend/src/modules/tiendas/routes.js
const { Router } = require('express');
const prisma = require('../../config/db');

const router = Router();

const toInt = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : d;
};

const mapRow = (t) => ({
  id: t.id,
  publicUuid: t.publicUuid,
  slug: t.slug,
  nombre: t.nombre,
  descripcion: t.descripcion,
  categoria: t.categoria,
  ciudad: t.ciudad,
  pais: t.pais,
  // compat con frontend
  logoUrl: t.logo?.url || null,
  portadaUrl: t.portada?.url || null,
});

/**
 * GET /api/tiendas/public   (alias: GET /api/tiendas)
 * Lista tiendas PUBLICADAS, con filtro opcional q
 */
router.get(['/public', '/'], async (req, res) => {
  try {
    const q     = String(req.query.q || '').trim();
    const page  = toInt(req.query.page, 1);
    const limit = Math.min(100, toInt(req.query.limit, 48));
    const skip  = (page - 1) * limit;

    const where = { isPublished: true };
    if (q) {
      where.OR = [
        { nombre:      { contains: q, mode: 'insensitive' } },
        { descripcion: { contains: q, mode: 'insensitive' } },
        { slug:        { contains: q, mode: 'insensitive' } },
        { publicUuid:  { contains: q, mode: 'insensitive' } },
        { categoria:   { contains: q, mode: 'insensitive' } },
        { ciudad:      { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.tienda.count({ where }),
      prisma.tienda.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ updatedAt: 'desc' }], // usa sólo campos que EXISTEN
        // OJO: usar select con nested select; NUNCA include + select
        select: {
          id: true,
          publicUuid: true,
          slug: true,
          nombre: true,
          descripcion: true,
          categoria: true,
          ciudad: true,
          pais: true,
          logo: { select: { url: true } },
          portada: { select: { url: true } },
        },
      }),
    ]);

    res.json({ page, limit, total, items: rows.map(mapRow) });
  } catch (err) {
    console.error('tiendas/public error:', err);
    res.status(500).json({ error: 'Error listando tiendas públicas' });
  }
});

/**
 * GET /api/tiendas/search?q=&page=&limit=
 * Búsqueda de tiendas PUBLICADAS
 */
router.get('/search', async (req, res) => {
  try {
    const qRaw  = String(req.query.q || req.query.search || '').trim();
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip  = (page - 1) * limit;

    const baseWhere = { isPublished: true };
    let where = baseWhere;

    if (qRaw) {
      const txt    = qRaw.replace(/^@/, '');
      const tokens = txt.split(/\s+/).filter(Boolean).slice(0, 6);

      where = {
        ...baseWhere,
        OR: [
          { nombre:      { contains: txt, mode: 'insensitive' } },
          { descripcion: { contains: txt, mode: 'insensitive' } },
          { slug:        { contains: txt, mode: 'insensitive' } },
          { publicUuid:  { contains: txt, mode: 'insensitive' } },
          { skuRef:      { contains: txt, mode: 'insensitive' } },
          ...(tokens.length ? [{ seoKeywords: { hasSome: tokens } }] : []),
          ...(tokens.length ? [{ aliases:     { hasSome: tokens } }] : []),
        ],
      };
    }

    const [total, rows] = await Promise.all([
      prisma.tienda.count({ where }),
      prisma.tienda.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        select: {
          id: true,
          publicUuid: true,
          slug: true,
          nombre: true,
          descripcion: true,
          categoria: true,
          ciudad: true,
          pais: true,
          logo: { select: { url: true } },
          portada: { select: { url: true } },
        },
      }),
    ]);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      items: rows.map(mapRow),
    });
  } catch (err) {
    console.error('tiendas/search error:', err);
    res.status(500).json({ error: 'Error buscando tiendas' });
  }
});

module.exports = router;

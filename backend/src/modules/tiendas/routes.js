// backend/src/modules/tiendas/routes.js
const { Router } = require('express');
const prisma = require('../../config/db');

const router = Router();

/**
 * GET /api/tiendas/search?q=&page=&limit=
 * Devuelve tiendas PUBLICADAS que coincidan por:
 *  - nombre, descripcion, slug, publicUuid, skuRef (contains, insensitive)
 *  - seoKeywords, aliases (hasSome con tokens)
 * Mapea relaciones Media -> logoUrl/portadaUrl para el frontend.
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
        include: { logo: true, portada: true },
        select: {
          id: true,
          publicUuid: true,
          slug: true,
          nombre: true,
          descripcion: true,
          categoria: true,
          seoKeywords: true,
          skuRef: true,
          aliases: true,
          ciudad: true,
          pais: true,
          // relaciones
          logo: true,
          portada: true,
        },
      }),
    ]);

    const items = rows.map((t) => ({
      id: t.id,
      publicUuid: t.publicUuid,
      slug: t.slug,
      nombre: t.nombre,
      descripcion: t.descripcion,
      categoria: t.categoria,
      seoKeywords: t.seoKeywords,
      skuRef: t.skuRef,
      aliases: t.aliases,
      ciudad: t.ciudad,
      pais: t.pais,
      // compat para frontend:
      logoUrl: t.logo?.url || null,
      portadaUrl: t.portada?.url || null,
    }));

    res.json({
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      items,
    });
  } catch (err) {
    console.error('tiendas/search error:', err);
    res.status(500).json({ error: 'Error buscando tiendas' });
  }
});

module.exports = router;

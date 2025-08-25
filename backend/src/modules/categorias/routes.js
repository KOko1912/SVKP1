const express = require('express');
const prisma = require('../../config/db');

const router = express.Router();

/* ========== helpers ========== */
function getUserId(req) {
  const raw = req.headers['x-user-id'] || '';
  if (raw) return Number(raw);
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(\d+)$/i);
  return m ? Number(m[1]) : null;
}
function slugify(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}
async function uniqueSlugForCategory(tiendaId, nombre, excludeId) {
  const base = slugify(nombre) || 'categoria';
  let slug = base, i = 1;
  while (
    await prisma.categoria.findFirst({
      where: { tiendaId, slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    })
  ) {
    slug = `${base}-${++i}`;
  }
  return slug;
}
const toInt = (v) => (Number.isFinite(+v) ? Math.trunc(+v) : null);

/* ========== LISTAR ========== */
// GET /api/v1/categorias?tiendaId=123 | ?slug=mi-tienda
router.get('/', async (req, res) => {
  try {
    let tiendaId = toInt(req.query.tiendaId);
    const slug = (req.query.slug || '').toString().trim().toLowerCase();

    if (!tiendaId && slug) {
      const t = await prisma.tienda.findFirst({ where: { slug }, select: { id: true } });
      if (t) tiendaId = t.id;
    }

    if (!tiendaId) {
      const userId = getUserId(req);
      if (userId) {
        const t = await prisma.tienda.findFirst({ where: { usuarioId: userId }, select: { id: true } });
        if (t) tiendaId = t.id;
      }
    }

    if (!tiendaId) return res.json([]); // sin tienda => vacío

    const rows = await prisma.categoria.findMany({
      where: { tiendaId },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      select: { id: true, tiendaId: true, nombre: true, slug: true, orden: true, createdAt: true, updatedAt: true },
    });
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudieron cargar las categorías' });
  }
});

/* ========== CREAR ========== */
// POST /api/v1/categorias   { tiendaId?, nombre }
router.post('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const tienda = await prisma.tienda.findFirst({ where: { usuarioId: userId } });
    const tiendaId = Number(req.body.tiendaId || tienda?.id);
    const nombre = String(req.body.nombre || '').trim();

    if (!tiendaId) return res.status(400).json({ error: 'Sin tienda' });
    if (!nombre)   return res.status(400).json({ error: 'Nombre requerido' });

    const slug = await uniqueSlugForCategory(tiendaId, nombre);
    const creada = await prisma.categoria.create({
      data: { tiendaId, nombre, slug, orden: req.body.orden ?? 0 },
      select: { id: true, tiendaId: true, nombre: true, slug: true, orden: true, createdAt: true, updatedAt: true },
    });
    res.status(201).json(creada);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo crear la categoría' });
  }
});

/* ========== RENOMBRAR / EDITAR ========== */
// PATCH /api/v1/categorias/:id  { nombre?, orden? }
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cat = await prisma.categoria.findUnique({ where: { id } });
    if (!cat) return res.status(404).json({ error: 'No existe' });

    const updates = {};
    if (req.body.nombre !== undefined) {
      const nombre = String(req.body.nombre || '').trim();
      if (!nombre) return res.status(400).json({ error: 'Nombre inválido' });
      updates.nombre = nombre;
      updates.slug = await uniqueSlugForCategory(cat.tiendaId, nombre, id);
    }
    if (req.body.orden !== undefined) {
      const n = Number(req.body.orden);
      updates.orden = Number.isFinite(n) ? Math.trunc(n) : 0;
    }

    const updated = await prisma.categoria.update({
      where: { id },
      data: { ...updates, updatedAt: new Date() },
      select: { id: true, tiendaId: true, nombre: true, slug: true, orden: true, createdAt: true, updatedAt: true },
    });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo actualizar la categoría' });
  }
});

/* ========== ELIMINAR ========== */
// DELETE /api/v1/categorias/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.productoCategoria.deleteMany({ where: { categoriaId: id } }).catch(() => {});
    await prisma.categoria.delete({ where: { id } });
    res.json({ ok: true, id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo eliminar la categoría' });
  }
});

module.exports = router;

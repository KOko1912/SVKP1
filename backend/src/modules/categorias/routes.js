// backend/src/modules/categorias/routes.js
const express = require('express');
const prisma = require('../../config/db'); // o: const { prisma } = require('../../config/db');

const router = express.Router();

function getUserId(req) {
  const raw = req.headers['x-user-id'] || '';
  if (raw) return Number(raw);
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(\d+)$/i);
  return m ? Number(m[1]) : null;
}

router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const tienda = await prisma.tienda.findUnique({ where: { usuarioId: userId } });
    const tiendaId = Number(req.query.tiendaId || tienda?.id);
    if (!tiendaId) return res.json([]);

    const list = await prisma.categoria.findMany({
      where: { tiendaId },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    });
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudieron cargar las categorías' });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const tienda = await prisma.tienda.findUnique({ where: { usuarioId: userId } });
    const tiendaId = Number(req.body.tiendaId || tienda?.id);
    const nombre = String(req.body.nombre || '').trim();
    if (!tiendaId || !nombre) return res.status(400).json({ error: 'Datos inválidos' });

    const slugBase = slugify(nombre);
    let slug = slugBase, i = 1;
    while (await prisma.categoria.findFirst({ where: { tiendaId, slug } })) {
      slug = `${slugBase}-${++i}`;
    }

    const creada = await prisma.categoria.create({ data: { tiendaId, nombre, slug } });
    res.json(creada);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo crear la categoría' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const nombre = String(req.body.nombre || '').trim();
    if (!id || !nombre) return res.status(400).json({ error: 'Datos inválidos' });

    const cat = await prisma.categoria.findUnique({ where: { id } });
    if (!cat) return res.status(404).json({ error: 'No existe' });

    const slugBase = slugify(nombre);
    let slug = slugBase, i = 1;
    while (await prisma.categoria.findFirst({ where: { tiendaId: cat.tiendaId, slug, NOT: { id } } })) {
      slug = `${slugBase}-${++i}`;
    }

    const act = await prisma.categoria.update({
      where: { id },
      data: { nombre, slug, updatedAt: new Date() },
    });
    res.json(act);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo renombrar la categoría' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cat = await prisma.categoria.findUnique({ where: { id }, include: { children: true } });
    if (!cat) return res.status(404).json({ error: 'No existe' });
    if (cat.children?.length) return res.status(400).json({ error: 'Tiene subcategorías' });

    await prisma.productoCategoria.deleteMany({ where: { categoriaId: id } });
    await prisma.categoria.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo eliminar la categoría' });
  }
});

function slugify(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

module.exports = router;

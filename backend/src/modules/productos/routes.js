// backend/src/modules/productos/routes.js
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

const productInclude = {
  imagenes: { orderBy: { orden: 'asc' } },
  inventario: true,
  variantes: { include: { inventario: true, imagenes: true } },
  categorias: { include: { categoria: true } },
};

// GET /api/v1/productos?tiendaId=&q=&estado=&categoria=
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const tienda = await prisma.tienda.findUnique({ where: { usuarioId: userId } });
    const tiendaId = Number(req.query.tiendaId || tienda?.id);
    if (!tiendaId) return res.json([]);

    const { q = '', estado = '', categoria = '' } = req.query;
    const where = { tiendaId, deletedAt: null };

    if (estado) where.estado = String(estado);
    if (q) {
      const term = String(q).trim();
      where.OR = [
        { nombre: { contains: term, mode: 'insensitive' } },
        { slug: { contains: term, mode: 'insensitive' } },
        { sku: { contains: term, mode: 'insensitive' } },
      ];
    }
    if (categoria) {
      where.categorias = { some: { categoria: { slug: String(categoria), tiendaId } } };
    }

    const rows = await prisma.producto.findMany({
      where,
      include: productInclude,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });

    res.json(rows); // el front espera array
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudieron cargar los productos' });
  }
});

// GET /api/v1/productos/:id
router.get('/:id', async (req, res) => {
  try {
    const p = await prisma.producto.findUnique({
      where: { id: Number(req.params.id) },
      include: productInclude,
    });
    if (!p) return res.status(404).json({ error: 'No existe' });
    res.json(p);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al cargar el producto' });
  }
});

// POST /api/v1/productos
router.post('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const tienda = await prisma.tienda.findUnique({ where: { usuarioId: userId } });
    const tiendaId = Number(req.body.tiendaId || tienda?.id);

    const {
      nombre, descripcion, tipo = 'SIMPLE', estado = 'DRAFT', visible = true, destacado = false,
      precio = null, precioComparativo = null, costo = null, descuentoPct = null,
      sku = null, marca = null, gtin = null, condicion = null,
      pesoGramos = null, altoCm = null, anchoCm = null, largoCm = null, claseEnvio = null,
      diasPreparacion = null, politicaDevolucion = null, digitalUrl = null, licenciamiento = null,
      categoriasIds = [], imagenes = [], inventario = null,
    } = req.body;

    if (!tiendaId || !nombre) return res.status(400).json({ error: 'Datos inválidos' });

    const slug = await uniqueSlugForProduct(tiendaId, nombre);

    // validar categorias de la tienda
    const cats = Array.isArray(categoriasIds) ? categoriasIds : [];
    if (cats.length) {
      const valid = await prisma.categoria.findMany({ where: { id: { in: cats }, tiendaId } });
      if (valid.length !== cats.length) return res.status(400).json({ error: 'Categorías inválidas' });
    }

    const data = {
      tiendaId, slug, nombre, descripcion, tipo, estado, visible, destacado,
      sku, gtin, marca, condicion,
      precio: precio ?? null, precioComparativo: precioComparativo ?? null, costo: costo ?? null,
      descuentoPct: descuentoPct ?? null,
      pesoGramos, altoCm, anchoCm, largoCm, claseEnvio, diasPreparacion,
      politicaDevolucion, digitalUrl, licenciamiento,
      imagenes: imagenes.length ? { create: imagenes } : undefined,
      categorias: cats.length
        ? { create: cats.map((cid) => ({ categoria: { connect: { id: cid } } })) }
        : undefined,
    };

    if (tipo === 'SIMPLE' && inventario && typeof inventario.stock === 'number') {
      data.inventario = {
        create: {
          stock: inventario.stock,
          umbralAlerta: inventario.umbralAlerta ?? 0,
          permitirBackorder: !!inventario.permitirBackorder,
        },
      };
    }

    const creado = await prisma.producto.create({ data, include: productInclude });
    res.json(creado);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo crear el producto' });
  }
});

// PATCH /api/v1/productos/:id
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const p = await prisma.producto.findUnique({ where: { id } });
    if (!p) return res.status(404).json({ error: 'No existe' });

    const { nombre, descripcion, estado, visible, destacado, precio, precioComparativo, costo, descuentoPct } = req.body;

    const data = {
      ...(nombre !== undefined ? { nombre } : {}),
      ...(descripcion !== undefined ? { descripcion } : {}),
      ...(estado !== undefined ? { estado } : {}),
      ...(visible !== undefined ? { visible: !!visible } : {}),
      ...(destacado !== undefined ? { destacado: !!destacado } : {}),
      ...(precio !== undefined ? { precio } : {}),
      ...(precioComparativo !== undefined ? { precioComparativo } : {}),
      ...(costo !== undefined ? { costo } : {}),
      ...(descuentoPct !== undefined ? { descuentoPct } : {}),
      updatedAt: new Date(),
    };

    if (nombre !== undefined) {
      data.slug = await uniqueSlugForProduct(p.tiendaId, nombre, p.id);
    }

    const act = await prisma.producto.update({
      where: { id },
      data,
      include: productInclude,
    });
    res.json(act);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo actualizar' });
  }
});

// DELETE lógico
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const p = await prisma.producto.findUnique({ where: { id } });
    if (!p) return res.status(404).json({ error: 'No existe' });

    await prisma.producto.update({
      where: { id },
      data: { deletedAt: new Date(), visible: false, estado: 'ARCHIVED' },
    });
    res.json({ ok: true, id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo eliminar' });
  }
});

async function uniqueSlugForProduct(tiendaId, nombre, excludeId) {
  const base = slugify(nombre);
  let slug = base, i = 1;
  while (await prisma.producto.findFirst({ where: { tiendaId, slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) } })) {
    slug = `${base}-${++i}`;
  }
  return slug;
}

function slugify(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

module.exports = router;

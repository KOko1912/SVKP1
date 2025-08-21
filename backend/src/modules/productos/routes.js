// backend/src/modules/productos/routes.js
const express = require('express');
const prisma = require('../../config/db'); // o: const { prisma } = require('../../config/db');

const router = express.Router();

/* ========== helpers ========== */

function getUserId(req) {
  const raw = req.headers['x-user-id'] || '';
  if (raw) return Number(raw);
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(\d+)$/i);
  return m ? Number(m[1]) : null;
}

function toNum(x) {
  if (x === null || x === undefined) return null;
  const n = Number(x);
  return Number.isNaN(n) ? null : n;
}

function slugify(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function uniqueSlugForProduct(tiendaId, nombre, excludeId) {
  const base = slugify(nombre) || 'producto';
  let slug = base, i = 1;
  // uq_producto_tienda_slug
  while (await prisma.producto.findFirst({
    where: { tiendaId, slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) }
  })) {
    slug = `${base}-${++i}`;
  }
  return slug;
}

const productInclude = {
  imagenes: { orderBy: { orden: 'asc' } },
  inventario: true,
  variantes: { include: { inventario: true, imagenes: true } },
  categorias: { include: { categoria: true } },
  atributos: true,
};

/** Calcula stock total y rango de precio para variantes */
function mapForList(p) {
  const stockProducto = p.inventario?.stock ?? 0;
  const stockVar = (p.variantes || []).reduce((acc, v) => acc + (v.inventario?.stock ?? 0), 0);
  const stockTotal = stockProducto + stockVar;

  let precioDesde = null, precioHasta = null;
  if (p.tipo === 'VARIANTE') {
    const precios = (p.variantes || [])
      .map(v => toNum(v.precio))
      .filter(v => v != null);
    if (precios.length) {
      precioDesde = Math.min(...precios);
      precioHasta = Math.max(...precios);
    }
  }
  return { ...p, stockTotal, precioDesde, precioHasta };
}

/* ========== RUTAS ========== */

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
        { slug:   { contains: term, mode: 'insensitive' } },
        { sku:    { contains: term, mode: 'insensitive' } },
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

    res.json(rows.map(mapForList)); // añadimos stockTotal y precioDesde/Hasta
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
    res.json(mapForList(p));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al cargar el producto' });
  }
});

// POST /api/v1/productos
// Soporta: SIMPLE (con inventario), VARIANTE (con variantes[]), DIGITAL (digitalUrl), SERVICIO/BUNDLE (atributos[])
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
      categoriasIds = [], imagenes = [],
      inventario = null,   // SIMPLE
      variantes = [],      // VARIANTE
      atributos = [],      // SERVICIO / BUNDLE / meta
    } = req.body;

    if (!tiendaId || !nombre) return res.status(400).json({ error: 'Datos inválidos' });

    const slug = await uniqueSlugForProduct(tiendaId, nombre);

    // validar categorías
    const cats = Array.isArray(categoriasIds) ? categoriasIds.map(Number) : [];
    if (cats.length) {
      const valid = await prisma.categoria.findMany({ where: { id: { in: cats }, tiendaId } });
      if (valid.length !== cats.length) return res.status(400).json({ error: 'Categorías inválidas' });
    }

    const data = {
      tiendaId, slug, nombre, descripcion, tipo, estado, visible, destacado,
      sku, gtin, marca, condicion,
      // precios directos solo para SIMPLE (para VARIANTE van en cada variante)
      precio:             tipo === 'SIMPLE' ? toNum(precio) : null,
      precioComparativo:  tipo === 'SIMPLE' ? toNum(precioComparativo) : null,
      costo:              tipo === 'SIMPLE' ? toNum(costo) : null,
      descuentoPct:       tipo === 'SIMPLE' ? (descuentoPct ?? null) : null,
      pesoGramos, altoCm, anchoCm, largoCm, claseEnvio, diasPreparacion,
      politicaDevolucion, digitalUrl: tipo === 'DIGITAL' ? (digitalUrl || null) : null, licenciamiento,
      imagenes: imagenes?.length ? {
        create: imagenes.map((m, i) => ({
          url: m.url, alt: m.alt || null, isPrincipal: !!m.isPrincipal, orden: m.orden ?? i
        }))
      } : undefined,
      categorias: cats.length ? {
        create: cats.map((categoriaId) => ({ categoria: { connect: { id: categoriaId } } }))
      } : undefined,
      atributos: atributos?.length ? {
        create: atributos.map(a => ({ clave: String(a.clave), valor: String(a.valor) }))
      } : undefined,
    };

    // Inventario para SIMPLE
    if (tipo === 'SIMPLE' && inventario && typeof inventario.stock !== 'undefined') {
      data.inventario = {
        create: {
          stock: Number(inventario.stock ?? 0),
          umbralAlerta: Number(inventario.umbralAlerta ?? 0),
          permitirBackorder: !!inventario.permitirBackorder,
        }
      };
    }

    // Variantes para VARIANTE
    if (tipo === 'VARIANTE' && Array.isArray(variantes) && variantes.length) {
      data.variantes = {
        create: variantes.map((v) => ({
          sku: v.sku || null,
          nombre: v.nombre || null,
          opciones: v.opciones || null, // JSON { color, talla, ... }
          precio: toNum(v.precio),
          precioComparativo: toNum(v.precioComparativo),
          costo: toNum(v.costo),
          inventario: v.inventario ? {
            create: {
              stock: Number(v.inventario.stock ?? 0),
              umbralAlerta: Number(v.inventario.umbralAlerta ?? 0),
              permitirBackorder: !!v.inventario.permitirBackorder,
            }
          } : undefined,
          imagenes: v.imagenes?.length ? {
            create: v.imagenes.map((m, i) => ({
              url: m.url, alt: m.alt || null, orden: m.orden ?? i
            }))
          } : undefined,
        }))
      };
    }

    const creado = await prisma.producto.create({
      data,
      include: productInclude,
    });

    res.json(mapForList(creado));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo crear el producto' });
  }
});

// PATCH /api/v1/productos/:id
// Actualiza básicos + reemplaza imágenes/categorías y upsert de inventario (solo SIMPLE).
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const p = await prisma.producto.findUnique({ where: { id } });
    if (!p) return res.status(404).json({ error: 'No existe' });

    const {
      nombre, descripcion, estado, visible, destacado,
      precio, precioComparativo, costo, descuentoPct,
      imagenes, categoriasIds, inventario, atributos, digitalUrl
    } = req.body;

    const data = {
      ...(nombre        !== undefined ? { nombre } : {}),
      ...(descripcion   !== undefined ? { descripcion } : {}),
      ...(estado        !== undefined ? { estado } : {}),
      ...(visible       !== undefined ? { visible: !!visible } : {}),
      ...(destacado     !== undefined ? { destacado: !!destacado } : {}),
      // precios directos solo si el producto es SIMPLE
      ...(p.tipo === 'SIMPLE' && precio             !== undefined ? { precio: toNum(precio) } : {}),
      ...(p.tipo === 'SIMPLE' && precioComparativo  !== undefined ? { precioComparativo: toNum(precioComparativo) } : {}),
      ...(p.tipo === 'SIMPLE' && costo              !== undefined ? { costo: toNum(costo) } : {}),
      ...(p.tipo === 'SIMPLE' && descuentoPct       !== undefined ? { descuentoPct } : {}),
      ...(p.tipo === 'DIGITAL' && digitalUrl        !== undefined ? { digitalUrl: digitalUrl || null } : {}),
      updatedAt: new Date(),
    };

    // slug si cambió el nombre
    if (nombre !== undefined) {
      data.slug = await uniqueSlugForProduct(p.tiendaId, nombre, p.id);
    }

    const tx = [];

    // Reemplazo de imágenes
    if (Array.isArray(imagenes)) {
      tx.push(prisma.productoImagen.deleteMany({ where: { productoId: id } }));
      tx.push(prisma.productoImagen.createMany({
        data: imagenes.map((m, i) => ({
          productoId: id,
          url: m.url,
          alt: m.alt || null,
          isPrincipal: !!m.isPrincipal,
          orden: m.orden ?? i
        }))
      }));
    }

    // Reemplazo de categorías
    if (Array.isArray(categoriasIds)) {
      const cats = categoriasIds.map(Number);
      tx.push(prisma.productoCategoria.deleteMany({ where: { productoId: id } }));
      if (cats.length) {
        tx.push(prisma.productoCategoria.createMany({
          data: cats.map(categoriaId => ({ productoId: id, categoriaId }))
        }));
      }
    }

    // Atributos (servicio/bundle/meta)
    if (Array.isArray(atributos)) {
      tx.push(prisma.productoAtributo.deleteMany({ where: { productoId: id } }));
      if (atributos.length) {
        tx.push(prisma.productoAtributo.createMany({
          data: atributos.map(a => ({
            productoId: id,
            clave: String(a.clave),
            valor: String(a.valor),
          }))
        }));
      }
    }

    // Inventario para SIMPLE (upsert / delete)
    if (p.tipo === 'SIMPLE') {
      if (inventario) {
        tx.push(prisma.inventario.upsert({
          where: { uq_inventario_producto: { productoId: id } },
          create: {
            productoId: id,
            stock: Number(inventario.stock ?? 0),
            umbralAlerta: Number(inventario.umbralAlerta ?? 0),
            permitirBackorder: !!inventario.permitirBackorder,
          },
          update: {
            stock: Number(inventario.stock ?? 0),
            umbralAlerta: Number(inventario.umbralAlerta ?? 0),
            permitirBackorder: !!inventario.permitirBackorder,
          }
        }));
      } else {
        tx.push(prisma.inventario.deleteMany({ where: { productoId: id } }));
      }
    }

    // update principal
    tx.unshift(prisma.producto.update({ where: { id }, data }));

    const [updated] = await prisma.$transaction(tx, { isolationLevel: 'ReadCommitted' });

    const full = await prisma.producto.findUnique({
      where: { id: updated.id },
      include: productInclude,
    });

    res.json(mapForList(full));
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

/* ===== Variantes ===== */

// POST /api/v1/productos/:id/variantes
router.post('/:id/variantes', async (req, res) => {
  try {
    const productoId = Number(req.params.id);
    const p = await prisma.producto.findUnique({ where: { id: productoId } });
    if (!p) return res.status(404).json({ error: 'Producto no existe' });
    if (p.tipo !== 'VARIANTE') return res.status(400).json({ error: 'El producto no es de tipo VARIANTE' });

    const { sku, nombre, opciones, precio, precioComparativo, costo, inventario, imagenes = [] } = req.body;

    const created = await prisma.variante.create({
      data: {
        productoId,
        sku: sku || null,
        nombre: nombre || null,
        opciones: opciones || null,
        precio: toNum(precio),
        precioComparativo: toNum(precioComparativo),
        costo: toNum(costo),
        inventario: inventario ? {
          create: {
            stock: Number(inventario.stock ?? 0),
            umbralAlerta: Number(inventario.umbralAlerta ?? 0),
            permitirBackorder: !!inventario.permitirBackorder,
          }
        } : undefined,
        imagenes: imagenes?.length ? {
          create: imagenes.map((m, i) => ({ url: m.url, alt: m.alt || null, orden: m.orden ?? i }))
        } : undefined,
      },
      include: { inventario: true, imagenes: true }
    });

    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error creando variante' });
  }
});

// PATCH /api/v1/variantes/:varianteId
router.patch('/variantes/:varianteId', async (req, res) => {
  try {
    const varianteId = Number(req.params.varianteId);
    const { sku, nombre, opciones, precio, precioComparativo, costo, inventario, imagenes } = req.body;

    const tx = [];

    if (Array.isArray(imagenes)) {
      tx.push(prisma.varianteImagen.deleteMany({ where: { varianteId } }));
      if (imagenes.length) {
        tx.push(prisma.varianteImagen.createMany({
          data: imagenes.map((m, i) => ({ varianteId, url: m.url, alt: m.alt || null, orden: m.orden ?? i }))
        }));
      }
    }

    if (inventario) {
      tx.push(prisma.inventario.upsert({
        where: { uq_inventario_variante: { varianteId } },
        create: {
          varianteId,
          stock: Number(inventario.stock ?? 0),
          umbralAlerta: Number(inventario.umbralAlerta ?? 0),
          permitirBackorder: !!inventario.permitirBackorder,
        },
        update: {
          stock: Number(inventario.stock ?? 0),
          umbralAlerta: Number(inventario.umbralAlerta ?? 0),
          permitirBackorder: !!inventario.permitirBackorder,
        }
      }));
    }

    tx.unshift(prisma.variante.update({
      where: { id: varianteId },
      data: {
        ...(sku         !== undefined ? { sku } : {}),
        ...(nombre      !== undefined ? { nombre } : {}),
        ...(opciones    !== undefined ? { opciones } : {}),
        ...(precio      !== undefined ? { precio: toNum(precio) } : {}),
        ...(precioComparativo !== undefined ? { precioComparativo: toNum(precioComparativo) } : {}),
        ...(costo       !== undefined ? { costo: toNum(costo) } : {}),
      },
      include: { inventario: true, imagenes: true }
    }));

    const [updated] = await prisma.$transaction(tx, { isolationLevel: 'ReadCommitted' });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error actualizando variante' });
  }
});

// DELETE /api/v1/variantes/:varianteId
router.delete('/variantes/:varianteId', async (req, res) => {
  try {
    const varianteId = Number(req.params.varianteId);
    await prisma.variante.delete({ where: { id: varianteId } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error eliminando variante' });
  }
});

/* ===== DIGITAL: set digitalUrl rápida (si subes archivo, usa upload.js/digital y luego pega la URL aquí) ===== */

router.post('/:id/digital', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { url } = req.body;
    const p = await prisma.producto.update({
      where: { id },
      data: { digitalUrl: url || null },
      include: productInclude,
    });
    res.json(mapForList(p));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo asignar archivo digital' });
  }
});

module.exports = router;

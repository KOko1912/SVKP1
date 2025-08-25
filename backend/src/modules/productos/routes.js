// backend/src/modules/productos/routes.js
const express = require('express');
const { buildAdvancedPatch } = require('./opcionesavanzadas');
const prisma = require('../../config/db');

const router = express.Router();

/* ================== Helpers ================== */
function getUserId(req) {
  const raw = req.headers['x-user-id'] || '';
  if (raw) return Number(raw);
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(\d+)$/i);
  return m ? Number(m[1]) : null;
}
function toNum(x) {
  if (x === null || x === undefined || x === '') return null;
  const n = Number(x);
  return Number.isNaN(n) ? null : n;
}
function toInt(x) {
  if (x === null || x === undefined || x === '') return null;
  const n = Number(x);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
function isNonEmptyStr(x) {
  return typeof x === 'string' && x.trim().length > 0;
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
  while (
    await prisma.producto.findFirst({
      where: { tiendaId, slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    })
  ) {
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
/** Agrega stockTotal y precioDesde/Hasta para tarjetas/listado */
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
/** Genera combinaciones a partir de [{nombre, valores:[...]}, ...] */
function genCombos(opciones = []) {
  const clean = (Array.isArray(opciones) ? opciones : [])
    .filter(o => isNonEmptyStr(o?.nombre) && Array.isArray(o?.valores) && o.valores.length > 0)
    .map(o => ({ nombre: String(o.nombre), valores: o.valores.map(v => String(v)) }));
  if (!clean.length) return [];
  return clean.reduce((acc, opt) => {
    const next = [];
    for (const base of acc) {
      for (const v of opt.valores) next.push({ ...base, [opt.nombre]: v });
    }
    return next;
  }, [{}]);
}
/** Decide tipo final a partir del payload */
function inferTipo(payload) {
  const hasVariantes = Array.isArray(payload.variantes) && payload.variantes.length > 0;
  const hasOpciones  = Array.isArray(payload.opciones) && payload.opciones.length > 0;
  const isServicio   = !!payload.servicioInfo;
  const isBundle     = isNonEmptyStr(payload.bundleIncluye);
  const hasDigital   = isNonEmptyStr(payload.digitalUrl);
  if (hasVariantes || hasOpciones) return 'VARIANTE';
  if (isServicio) return 'SERVICIO';
  if (isBundle)   return 'BUNDLE';
  if (hasDigital) return 'DIGITAL';
  return 'SIMPLE';
}

/* ========== LISTADO BÁSICO (interno) ========== */
// GET /api/v1/productos
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const tienda = await prisma.tienda.findUnique({ where: { usuarioId: userId } });
    const tiendaId = Number(req.query.tiendaId || tienda?.id);
    if (!tiendaId) return res.json([]);

    const { q = '', estado = '', categoria = '' } = req.query;

    // 🔧 Si NO se piden archivados, ocultamos soft-deleted
    // Si se piden ARCHIVED, mostramos también los que tienen deletedAt != null
    const where = { tiendaId };
    if (estado !== 'ARCHIVED') where.deletedAt = null;
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

    res.json(rows.map(mapForList));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudieron cargar los productos' });
  }
});

/* ========== PÚBLICO POR UUID ========== */
// GET /api/v1/productos/public/uuid/:uuid
router.get('/public/uuid/:uuid', async (req, res) => {
  try {
    const p = await prisma.producto.findUnique({
      where: { uuid: String(req.params.uuid) },
      include: productInclude,
    });
    if (!p || p.deletedAt) return res.status(404).json({ error: 'No existe' });
    if (!p.visible || p.estado !== 'ACTIVE') return res.status(404).json({ error: 'No disponible' });

    const pub = mapForList(p);
    const { costo, ...safe } = pub; // ocultar costo en público
    res.json(safe);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al cargar' });
  }
});

/* ========== DETALLE (interno) ========== */
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

/* ========== CREAR (unificado) ========== */
// POST /api/v1/productos
router.post('/', async (req, res) => {
  try {
    const userId  = getUserId(req);
    const tienda  = await prisma.tienda.findUnique({ where: { usuarioId: userId } });
    const tiendaId = Number(req.body.tiendaId || tienda?.id);
    if (!tiendaId) return res.status(400).json({ error: 'Sin tienda' });

    const {
      nombre, descripcion,
      tipo,
      estado = 'DRAFT', visible = true, destacado = false,
      precio = null, precioComparativo = null, costo = null, descuentoPct = null,
      sku = null, marca = null, gtin = null, condicion = null,
      pesoGramos = null, altoCm = null, anchoCm = null, largoCm = null, claseEnvio = null,
      diasPreparacion = null, politicaDevolucion = null,
      digitalUrl = null, licenciamiento = null,
      categoriasIds = [], imagenes = [],
      inventario = null,   // para SIMPLE
      variantes = [],      // manual
      opciones = [],       // autogeneración
      servicioInfo = null, bundleIncluye = '',
      atributos = [],
    } = req.body;

    if (!isNonEmptyStr(nombre)) return res.status(400).json({ error: 'Nombre requerido' });

    // validar categorías de la tienda
    const cats = Array.isArray(categoriasIds) ? categoriasIds.map(Number).filter(Number.isFinite) : [];
    if (cats.length) {
      const valid = await prisma.categoria.findMany({ where: { id: { in: cats }, tiendaId } });
      if (valid.length !== cats.length) return res.status(400).json({ error: 'Categorías inválidas' });
    }

    // decidir tipo final
    let finalTipo = (tipo && tipo !== 'AUTO') ? tipo : inferTipo({ variantes, opciones, servicioInfo, bundleIncluye, digitalUrl });

    // si no hay variantes manuales pero hay opciones ⇒ generamos
    let finalVariantes = Array.isArray(variantes) ? variantes.slice() : [];
    if ((!finalVariantes.length) && Array.isArray(opciones) && opciones.length) {
      const combos = genCombos(opciones).slice(0, 200);
      finalVariantes = combos.map((ops) => ({
        sku: null,
        nombre: Object.values(ops).join(' / '),
        opciones: ops,
        precio: precio != null ? Number(precio) : null,
        precioComparativo: precioComparativo != null ? Number(precioComparativo) : null,
        costo: costo != null ? Number(costo) : null,
        inventario: inventario ? { ...inventario } : null,
        imagenes: [],
      }));
    }

    const slug = await uniqueSlugForProduct(tiendaId, nombre);

    const isVariante = finalTipo === 'VARIANTE';
    const baseAttr = [];
    if (Array.isArray(atributos)) {
      for (const a of atributos) {
        if (a && a.clave != null) baseAttr.push({ clave: String(a.clave), valor: a.valor != null ? String(a.valor) : '' });
      }
    }
    if (servicioInfo) {
      for (const [k,v] of Object.entries(servicioInfo)) baseAttr.push({ clave: `servicio.${k}`, valor: String(v ?? '') });
    }
    if (isNonEmptyStr(bundleIncluye)) baseAttr.push({ clave: 'bundle.incluye', valor: String(bundleIncluye) });

    const data = {
      tiendaId, slug, nombre, descripcion, tipo: finalTipo, estado, visible, destacado,
      sku, gtin, marca, condicion,
      precio:            isVariante ? null : toNum(precio),
      precioComparativo: isVariante ? null : toNum(precioComparativo),
      costo:             isVariante ? null : toNum(costo),
      descuentoPct:      isVariante ? null : toInt(descuentoPct),
      pesoGramos, altoCm, anchoCm, largoCm, claseEnvio, diasPreparacion,
      politicaDevolucion,
      digitalUrl: isNonEmptyStr(digitalUrl) ? digitalUrl : null,
      licenciamiento,
      imagenes: (Array.isArray(imagenes) && imagenes.length) ? {
        create: imagenes
          .filter(m => m && m.url)
          .map((m, i) => ({
            url: m.url,
            alt: m.alt || null,
            isPrincipal: !!m.isPrincipal || i === 0,
            orden: Number.isFinite(m.orden) ? m.orden : i
          }))
      } : undefined,
      categorias: cats.length ? {
        create: cats.map(categoriaId => ({ categoria: { connect: { id: categoriaId } } }))
      } : undefined,
      atributos: baseAttr.length ? { create: baseAttr } : undefined,
    };

    if (!isVariante && inventario && typeof inventario.stock !== 'undefined') {
      data.inventario = {
        create: {
          stock: toInt(inventario.stock) ?? 0,
          umbralAlerta: toInt(inventario.umbralAlerta) ?? 0,
          permitirBackorder: !!inventario.permitirBackorder,
        }
      };
    }

    if (isVariante && finalVariantes.length) {
      data.variantes = {
        create: finalVariantes.map((v) => ({
          sku: v.sku || null,
          nombre: v.nombre || null,
          opciones: v.opciones || null,
          precio: toNum(v.precio),
          precioComparativo: toNum(v.precioComparativo),
          costo: toNum(v.costo),
          inventario: v.inventario ? {
            create: {
              stock: toInt(v.inventario.stock) ?? 0,
              umbralAlerta: toInt(v.inventario.umbralAlerta) ?? 0,
              permitirBackorder: !!v.inventario.permitirBackorder,
            }
          } : undefined,
          imagenes: (Array.isArray(v.imagenes) && v.imagenes.length) ? {
            create: v.imagenes
              .filter(m => m && m.url)
              .map((m, i) => ({ url: m.url, alt: m.alt || null, orden: Number.isFinite(m.orden) ? m.orden : i }))
          } : undefined,
        }))
      };
    }

    const creado = await prisma.producto.create({ data, include: productInclude });
    res.json(mapForList(creado));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo crear el producto', code: e?.code || null, message: e?.message || null, meta: e?.meta || null });
  }
});

/* ========== EDITAR ========== */
// PATCH /api/v1/productos/:id
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

    const isVariante      = p.tipo === 'VARIANTE';
    const allowInventory  = p.tipo === 'SIMPLE';
    const allowDigitalUrl = true;

    const data = {
      ...(nombre        !== undefined ? { nombre } : {}),
      ...(descripcion   !== undefined ? { descripcion } : {}),
      ...(estado        !== undefined ? { estado } : {}),
      ...(visible       !== undefined ? { visible: !!visible } : {}),
      ...(destacado     !== undefined ? { destacado: !!destacado } : {}),
      ...(!isVariante && precio             !== undefined ? { precio: toNum(precio) } : {}),
      ...(!isVariante && precioComparativo  !== undefined ? { precioComparativo: toNum(precioComparativo) } : {}),
      ...(!isVariante && costo              !== undefined ? { costo: toNum(costo) } : {}),
      ...(!isVariante && descuentoPct       !== undefined ? { descuentoPct: toInt(descuentoPct) } : {}),
      ...(allowDigitalUrl && digitalUrl      !== undefined ? { digitalUrl: digitalUrl || null } : {}),
      updatedAt: new Date(),
    };

    // 👉 APLICA AQUÍ todas las “Opciones avanzadas”
    Object.assign(data, buildAdvancedPatch(req.body, { producto: p }));

    if (nombre !== undefined) {
      data.slug = await uniqueSlugForProduct(p.tiendaId, nombre, p.id);
    }

    const tx = [];

    // Imágenes
    if (Array.isArray(imagenes)) {
      let imgs = imagenes.filter(m => m && m.url);
      const seen = new Set();
      imgs = imgs.filter(m => {
        if (seen.has(m.url)) return false; seen.add(m.url); return true;
      });
      if (imgs.length) {
        let found = false;
        imgs = imgs.map((m, i) => {
          const isP = !found && (m.isPrincipal || i === 0);
          if (isP) found = true;
          return { ...m, isPrincipal: isP, orden: Number.isFinite(m.orden) ? m.orden : i };
        });
      }
      tx.push(prisma.productoImagen.deleteMany({ where: { productoId: id } }));
      if (imgs.length) {
        tx.push(prisma.productoImagen.createMany({
          data: imgs.map((m, i) => ({
            productoId: id,
            url: m.url,
            alt: m.alt || null,
            isPrincipal: !!m.isPrincipal,
            orden: Number.isFinite(m.orden) ? m.orden : i
          })),
          skipDuplicates: true
        }));
      }
    }

    // Categorías
    if (Array.isArray(categoriasIds)) {
      const cats = categoriasIds.map(Number).filter(Number.isFinite);
      tx.push(prisma.productoCategoria.deleteMany({ where: { productoId: id } }));
      if (cats.length) {
        const valid = await prisma.categoria.findMany({
          where: { id: { in: cats }, tiendaId: p.tiendaId },
          select: { id: true },
        });
        const validIds = new Set(valid.map(c => c.id));
        const toInsert = cats.filter(cid => validIds.has(cid));
        if (toInsert.length) {
          tx.push(prisma.productoCategoria.createMany({
            data: toInsert.map(categoriaId => ({ productoId: id, categoriaId })),
            skipDuplicates: true
          }));
        }
      }
    }

    // Atributos flexibles
    if (Array.isArray(atributos)) {
      tx.push(prisma.productoAtributo.deleteMany({ where: { productoId: id } }));
      if (atributos.length) {
        tx.push(prisma.productoAtributo.createMany({
          data: atributos
            .filter(a => a && a.clave != null)
            .map(a => ({
              productoId: id,
              clave: String(a.clave),
              valor: a.valor != null ? String(a.valor) : '',
            })),
          skipDuplicates: true
        }));
      }
    }

    // Inventario (solo SIMPLE)
    if (allowInventory) {
      if (inventario) {
        const currentInv = await prisma.inventario.findFirst({ where: { productoId: id } });
        if (currentInv) {
          tx.push(prisma.inventario.update({
            where: { id: currentInv.id },
            data: {
              stock: toInt(inventario.stock) ?? 0,
              umbralAlerta: toInt(inventario.umbralAlerta) ?? 0,
              permitirBackorder: !!inventario.permitirBackorder,
            }
          }));
        } else {
          tx.push(prisma.inventario.create({
            data: {
              productoId: id,
              stock: toInt(inventario.stock) ?? 0,
              umbralAlerta: toInt(inventario.umbralAlerta) ?? 0,
              permitirBackorder: !!inventario.permitirBackorder,
            }
          }));
        }
      } else {
        tx.push(prisma.inventario.deleteMany({ where: { productoId: id } }));
      }
    }

    // Update principal primero
    tx.unshift(prisma.producto.update({ where: { id }, data }));

    const [updated] = await prisma.$transaction(tx, { isolationLevel: 'ReadCommitted' });

    const full = await prisma.producto.findUnique({
      where: { id: updated.id },
      include: productInclude,
    });

    res.json(mapForList(full));
  } catch (e) {
    console.error('[PATCH /productos/:id] ERROR =>', e);
    res.status(500).json({ error: 'No se pudo actualizar', code: e?.code || null, message: e?.message || null, meta: e?.meta || null });
  }
});

/* ========== ELIMINAR (lógico o permanente) ========== */
// DELETE /api/v1/productos/:id
// - Soft delete por defecto (marca ARCHIVED, visible=false, deletedAt=now)
// - Hard delete si viene ?force=1 (borra dependencias y el registro)
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const p = await prisma.producto.findUnique({ where: { id } });
    if (!p) return res.status(404).json({ error: 'No existe' });

    const force = String(req.query.force || '') === '1';
    if (force) {
      // Recolectar variantes
      const vars = await prisma.variante.findMany({ where: { productoId: id }, select: { id: true } });
      const varIds = vars.map(v => v.id);

      await prisma.$transaction([
        // hijos de variantes
        prisma.varianteImagen.deleteMany({ where: { varianteId: { in: varIds } } }),
        prisma.inventario.deleteMany({ where: { varianteId: { in: varIds } } }),
        prisma.variante.deleteMany({ where: { productoId: id } }),
        // hijos del producto
        prisma.productoImagen.deleteMany({ where: { productoId: id } }),
        prisma.productoCategoria.deleteMany({ where: { productoId: id } }),
        prisma.productoAtributo.deleteMany({ where: { productoId: id } }),
        prisma.inventario.deleteMany({ where: { productoId: id } }),
        // por último, el producto
        prisma.producto.delete({ where: { id } }),
      ], { isolationLevel: 'ReadCommitted' });

      return res.json({ ok: true, id, hardDeleted: true });
    }

    // Soft delete
    await prisma.producto.update({
      where: { id },
      data: { deletedAt: new Date(), visible: false, estado: 'ARCHIVED' },
    });
    res.json({ ok: true, id, hardDeleted: false });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo eliminar' });
  }
});

/* ========== VARIANTES ========== */
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
            stock: toInt(inventario.stock) ?? 0,
            umbralAlerta: toInt(inventario.umbralAlerta) ?? 0,
            permitirBackorder: !!inventario.permitirBackorder,
          }
        } : undefined,
        imagenes: (Array.isArray(imagenes) && imagenes.length) ? {
          create: imagenes
            .filter(m => m && m.url)
            .map((m, i) => ({ url: m.url, alt: m.alt || null, orden: Number.isFinite(m.orden) ? m.orden : i }))
        } : undefined,
      },
      include: { inventario: true, imagenes: true }
    });

    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error creando variante', code: e?.code || null, message: e?.message || null, meta: e?.meta || null });
  }
});

// PATCH /api/v1/productos/variantes/:varianteId
router.patch('/variantes/:varianteId', async (req, res) => {
  try {
    const varianteId = Number(req.params.varianteId);
    const { sku, nombre, opciones, precio, precioComparativo, costo, inventario, imagenes } = req.body;

    const tx = [];

    if (Array.isArray(imagenes)) {
      tx.push(prisma.varianteImagen.deleteMany({ where: { varianteId } }));
      if (imagenes.length) {
        tx.push(prisma.varianteImagen.createMany({
          data: imagenes
            .filter(m => m && m.url)
            .map((m, i) => ({ varianteId, url: m.url, alt: m.alt || null, orden: Number.isFinite(m.orden) ? m.orden : i })),
          skipDuplicates: true
        }));
      }
    }

    // Inventario de variante — upsert manual
    if (inventario) {
      const inv = await prisma.inventario.findFirst({ where: { varianteId } });
      if (inv) {
        tx.push(prisma.inventario.update({
          where: { id: inv.id },
          data: {
            stock: toInt(inventario.stock) ?? 0,
            umbralAlerta: toInt(inventario.umbralAlerta) ?? 0,
            permitirBackorder: !!inventario.permitirBackorder,
          }
        }));
      } else {
        tx.push(prisma.inventario.create({
          data: {
            varianteId,
            stock: toInt(inventario.stock) ?? 0,
            umbralAlerta: toInt(inventario.umbralAlerta) ?? 0,
            permitirBackorder: !!inventario.permitirBackorder,
          }
        }));
      }
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
    res.status(500).json({ error: 'Error actualizando variante', code: e?.code || null, message: e?.message || null, meta: e?.meta || null });
  }
});

// DELETE /api/v1/productos/variantes/:varianteId
router.delete('/variantes/:varianteId', async (req, res) => {
  try {
    const varianteId = Number(req.params.varianteId);
    await prisma.variante.delete({ where: { id: varianteId } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error eliminando variante', code: e?.code || null, message: e?.message || null, meta: e?.meta || null });
  }
});

/* ========== DIGITAL rápido ========== */
// POST /api/v1/productos/:id/digital
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
    res.status(500).json({ error: 'No se pudo asignar archivo digital', code: e?.code || null, message: e?.message || null });
  }
});

/* ========== Duplicar / Restaurar / Bulk ========== */
// POST /api/v1/productos/:id/duplicate
router.post('/:id/duplicate', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const src = await prisma.producto.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!src) return res.status(404).json({ error: 'No existe' });

    const slug = await uniqueSlugForProduct(src.tiendaId, `${src.nombre} copia`);
    const data = {
      tiendaId: src.tiendaId,
      slug,
      nombre: `${src.nombre} (copia)`,
      descripcion: src.descripcion,
      tipo: src.tipo,
      estado: 'DRAFT',
      visible: false,
      destacado: false,
      sku: null, gtin: null, marca: src.marca, condicion: src.condicion,
      precio: src.tipo === 'VARIANTE' ? null : src.precio,
      precioComparativo: src.tipo === 'VARIANTE' ? null : src.precioComparativo,
      costo: null,
      descuentoPct: src.descuentoPct,
      pesoGramos: src.pesoGramos, altoCm: src.altoCm, anchoCm: src.anchoCm, largoCm: src.largoCm,
      claseEnvio: src.claseEnvio, diasPreparacion: src.diasPreparacion,
      politicaDevolucion: src.politicaDevolucion,
      digitalUrl: null,
      licenciamiento: src.licenciamiento,
      imagenes: src.imagenes?.length ? {
        create: src.imagenes.map(m => ({
          url: m.url, alt: m.alt, isPrincipal: m.isPrincipal, orden: m.orden
        }))
      } : undefined,
      categorias: src.categorias?.length ? {
        create: src.categorias.map(pc => ({ categoria: { connect: { id: pc.categoriaId } } }))
      } : undefined,
      atributos: src.atributos?.length ? {
        create: src.atributos.map(a => ({ clave: a.clave, valor: a.valor }))
      } : undefined,
      inventario: (src.tipo === 'SIMPLE') ? { create: { stock: 0, umbralAlerta: src.inventario?.umbralAlerta ?? 0, permitirBackorder: src.inventario?.permitirBackorder ?? false } } : undefined,
      variantes: (src.tipo === 'VARIANTE' && src.variantes?.length) ? {
        create: src.variantes.map(v => ({
          sku: null,
          nombre: v.nombre,
          opciones: v.opciones,
          precio: v.precio,
          precioComparativo: v.precioComparativo,
          costo: null,
          inventario: { create: { stock: 0, umbralAlerta: v.inventario?.umbralAlerta ?? 0, permitirBackorder: v.inventario?.permitirBackorder ?? false } },
          imagenes: v.imagenes?.length ? { create: v.imagenes.map(m => ({ url: m.url, alt: m.alt, orden: m.orden })) } : undefined,
        }))
      } : undefined,
    };

    const nuevo = await prisma.producto.create({ data, include: productInclude });
    res.status(201).json(mapForList(nuevo));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo duplicar' });
  }
});

// POST /api/v1/productos/:id/restore
router.post('/:id/restore', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const p = await prisma.producto.update({
      where: { id },
      data: { deletedAt: null, estado: 'DRAFT', visible: false },
      include: productInclude,
    });
    res.json(mapForList(p));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo restaurar' });
  }
});

// POST /api/v1/productos/bulk  { action, ids: [..], value? }
router.post('/bulk', async (req, res) => {
  try {
    const { action, ids = [], value } = req.body || {};
    const idNums = (Array.isArray(ids) ? ids : []).map(Number).filter(Number.isFinite);
    if (!idNums.length) return res.status(400).json({ error: 'ids vacíos' });

    if (action === 'archive') {
      await prisma.producto.updateMany({ where: { id: { in: idNums } }, data: { estado: 'ARCHIVED', visible: false } });
    } else if (action === 'activate') {
      await prisma.producto.updateMany({ where: { id: { in: idNums } }, data: { estado: 'ACTIVE' } });
    } else if (action === 'delete') {
      await prisma.producto.updateMany({ where: { id: { in: idNums } }, data: { deletedAt: new Date(), visible: false, estado: 'ARCHIVED' } });
    } else if (action === 'restore') {
      await prisma.producto.updateMany({ where: { id: { in: idNums } }, data: { deletedAt: null, estado: 'DRAFT', visible: false } });
    } else if (action === 'visible') {
      await prisma.producto.updateMany({ where: { id: { in: idNums } }, data: { visible: !!value } });
    } else if (action === 'destacado') {
      await prisma.producto.updateMany({ where: { id: { in: idNums } }, data: { destacado: !!value } });
    } else {
      return res.status(400).json({ error: 'action inválida' });
    }

    res.json({ ok: true, action, ids: idNums });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Bulk falló' });
  }
});

module.exports = router;

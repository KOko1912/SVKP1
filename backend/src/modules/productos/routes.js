const express = require('express');
const { buildAdvancedPatch } = require('./opcionesavanzadas');
const prisma = require('../../config/db');
const { StorageProvider } = require('@prisma/client');
const mime = require('mime-types');

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

function inferTipo({ variantes, opciones, servicioInfo, bundleIncluye, digitalUrl }) {
  if (Array.isArray(variantes) && variantes.length) return 'VARIANTE';
  if (Array.isArray(opciones) && opciones.length) return 'VARIANTE';
  if (servicioInfo && Object.keys(servicioInfo).length) return 'SERVICIO';
  if (bundleIncluye && isNonEmptyStr(bundleIncluye)) return 'BUNDLE';
  if (digitalUrl && isNonEmptyStr(digitalUrl)) return 'DIGITAL';
  return 'SIMPLE';
}

function genCombos(opciones = []) {
  if (!opciones.length) return [];
  const combos = [];
  const recurse = (current, index) => {
    if (index === opciones.length) {
      combos.push(current);
      return;
    }
    const opc = opciones[index];
    const valores = Array.isArray(opc.valores) ? opc.valores : [];
    if (valores.length === 0) {
      recurse({ ...current, [opc.clave]: '' }, index + 1);
    } else {
      for (const v of valores) recurse({ ...current, [opc.clave]: v }, index + 1);
    }
  };
  recurse({}, 0);
  return combos;
}

// include `media` también en imágenes de variantes
const productInclude = {
  imagenes: { include: { media: true }, orderBy: { orden: 'asc' } },
  inventario: true,
  variantes: {
    include: {
      inventario: true,
      imagenes: { include: { media: true }, orderBy: { orden: 'asc' } }
    }
  },
  categorias: { include: { categoria: true } },
  atributos: true,
  digital: true,
};

/** Normaliza imágenes: si falta m.url, usa m.media?.url */
function normImgs(arr = []) {
  return (arr || []).map(m => ({
    ...m,
    url: m.url || m.media?.url || '',
  }));
}

/** Agrega stockTotal y precioDesde/Hasta y normaliza imágenes */
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

  const variantesNorm = (p.variantes || []).map(v => ({
    ...v,
    imagenes: normImgs(v.imagenes),
  }));

  return {
    ...p,
    imagenes: normImgs(p.imagenes),
    variantes: variantesNorm,
    stockTotal,
    precioDesde,
    precioHasta,
  };
}

// Helpers para crear/reusar Media desde una URL y mapear provider
function guessProviderFromUrl(url = '') {
  if (url.includes('supabase.co')) return StorageProvider.SUPABASE;
  if (url.startsWith('/uploads') || url.startsWith('/TiendaUploads')) return StorageProvider.LOCAL;
  return StorageProvider.SUPABASE; // fallback
}
function keyFromUrl(url = '') {
  const m = url.match(/\/object\/public\/(.+)$/);
  if (m && m[1]) return m[1];
  return url.replace(/^https?:\/\/[^/]+\//, '').replace(/^\//, '');
}

// Asegura un Media (para imágenes)
async function ensureMedia(url) {
  if (!isNonEmptyStr(url)) return null;
  const provider = guessProviderFromUrl(url);
  const key = keyFromUrl(url) || `external://${Date.now()}`;
  const mimeStr = mime.lookup(url) || null;

  const existing = await prisma.media.findFirst({
    where: { OR: [{ url }, { provider, key }] },
    select: { id: true },
  });
  if (existing) return existing.id;

  const media = await prisma.media.create({
    data: { provider, key, url, mime: mimeStr, sizeBytes: null }
  });
  return media.id;
}

// Asegura Media para digital (reusa ensureMedia)
async function ensureDigitalMedia(url) { return ensureMedia(url); }

/* ========== LISTADO (público o protegido) ========== */
// GET /api/v1/productos?tiendaId=123 | ?slug=mi-tienda
router.get('/', async (req, res) => {
  try {
    let tiendaId = toInt(req.query.tiendaId);
    const slug = (req.query.slug || '').toString().trim().toLowerCase();

    if (!tiendaId && slug) {
      const t = await prisma.tienda.findFirst({ where: { slug }, select: { id: true } });
      if (t) tiendaId = t.id;
    }

    // Si no vino tiendaId, usar la del dueño (área protegida)
    const userId = getUserId(req);
    if (!tiendaId && userId) {
      const t = await prisma.tienda.findUnique({ where: { usuarioId: userId }, select: { id: true } });
      if (t) tiendaId = t.id;
    }

    if (!tiendaId) return res.json([]);

    const isPublic = !userId; // si no viene x-user-id, es público
    const { q = '', estado = '', categoria = '' } = req.query;

    const where = { tiendaId, deletedAt: null };

    // En público, mostrar únicamente visibles y activos
    if (isPublic) {
      where.visible = true;
      where.estado = 'ACTIVE';
    } else if (estado) {
      where.estado = String(estado);
      if (estado === 'ARCHIVED') delete where.deletedAt;
    }

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
router.get('/public/uuid/:uuid', async (req, res) => {
  try {
    const p = await prisma.producto.findUnique({
      where: { uuid: String(req.params.uuid) },
      include: productInclude,
    });
    if (!p || p.deletedAt) return res.status(404).json({ error: 'No existe' });
    if (!p.visible || p.estado !== 'ACTIVE') return res.status(404).json({ error: 'No disponible' });

    const pub = mapForList(p);
    const { costo, ...safe } = pub;
    res.json(safe);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al cargar' });
  }
});

/* ========== DETALLE (interno) ========== */
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
      inventario = null,   // SIMPLE
      variantes = [],      // manual
      opciones = [],       // autogeneración
      servicioInfo = null, bundleIncluye = '',
      atributos = [],
    } = req.body;

    if (!isNonEmptyStr(nombre)) return res.status(400).json({ error: 'Nombre requerido' });

    // validar categorías
    const cats = Array.isArray(categoriasIds) ? categoriasIds.map(Number).filter(Number.isFinite) : [];
    if (cats.length) {
      const valid = await prisma.categoria.findMany({ where: { id: { in: cats }, tiendaId } });
      if (valid.length !== cats.length) return res.status(400).json({ error: 'Categorías inválidas' });
    }

    // decidir tipo final
    let finalTipo = (tipo && tipo !== 'AUTO') ? tipo : inferTipo({ variantes, opciones, servicioInfo, bundleIncluye, digitalUrl });

    // generar variantes por opciones si no hay manuales
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

    // imágenes del producto → mediaId
    const inputImgs = Array.isArray(imagenes) ? imagenes.filter(m => m && m.url) : [];
    let imgsCreate = [];
    if (inputImgs.length) {
      const seen = new Set();
      const dedup = inputImgs.filter(m => { if (seen.has(m.url)) return false; seen.add(m.url); return true; });
      imgsCreate = await Promise.all(dedup.map(async (m, i) => {
        const mid = await ensureMedia(m.url);
        return {
          mediaId: mid,
          alt: m.alt || null,
          isPrincipal: !!m.isPrincipal || i === 0,
          orden: Number.isFinite(m.orden) ? m.orden : i
        };
      }));
    }

    // imágenes de variantes → mediaId
    let variantesCreate = [];
    if (isVariante && finalVariantes.length) {
      variantesCreate = await Promise.all(finalVariantes.map(async (v) => {
        const vImgs = Array.isArray(v.imagenes) ? v.imagenes.filter(m => m && m.url) : [];
        const vImgsCreate = await Promise.all(vImgs.map(async (m, i) => {
          const mid = await ensureMedia(m.url);
          return { mediaId: mid, alt: m.alt || null, orden: Number.isFinite(m.orden) ? m.orden : i };
        }));
        return {
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
          imagenes: vImgsCreate.length ? { create: vImgsCreate } : undefined,
        };
      }));
    }

    // data final de creación
    const data = {
      tiendaId, slug, nombre, descripcion, tipo: finalTipo, estado, visible, destacado,
      sku, gtin, marca, condicion,
      precio:            isVariante ? null : toNum(precio),
      precioComparativo: isVariante ? null : toNum(precioComparativo),
      costo:             isVariante ? null : toNum(costo),
      descuentoPct:      isVariante ? null : toInt(descuentoPct),
      pesoGramos, altoCm, anchoCm, largoCm, claseEnvio, diasPreparacion,
      politicaDevolucion,
      licenciamiento,
      imagenes: imgsCreate.length ? { create: imgsCreate } : undefined,
      categorias: cats.length ? {
        create: cats.map(categoriaId => ({ categoria: { connect: { id: categoriaId } } }))
      } : undefined,
      atributos: baseAttr.length ? { create: baseAttr } : undefined,
      ...(isVariante && variantesCreate.length ? { variantes: { create: variantesCreate } } : {}),
    };

    // inventario solo para SIMPLE
    if (!isVariante && inventario && typeof inventario.stock !== 'undefined') {
      data.inventario = {
        create: {
          stock: toInt(inventario.stock) ?? 0,
          umbralAlerta: toInt(inventario.umbralAlerta) ?? 0,
          permitirBackorder: !!inventario.permitirBackorder,
        }
      };
    }

    const creado = await prisma.producto.create({ data, include: productInclude });

    // si viene digitalUrl, vincular a relación digital
    let productoFinal = creado;
    if (isNonEmptyStr(digitalUrl)) {
      try {
        const mid = await ensureDigitalMedia(digitalUrl);
        if (mid) {
          productoFinal = await prisma.producto.update({
            where: { id: creado.id },
            data: { digital: { connect: { id: mid } } },
            include: productInclude,
          });
        }
      } catch (e) {
        console.warn('[crear producto] No se pudo vincular digital:', e?.message || e);
      }
    }

    res.json(mapForList(productoFinal));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo crear el producto', code: e?.code || null, message: e?.message || null, meta: e?.meta || null });
  }
});


/* ========== EDITAR ========== */
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

    const isVariante     = p.tipo === 'VARIANTE';
    const allowInventory = p.tipo === 'SIMPLE';

    // EDITAR: digitalUrl → relación "digital"
    let digitalRelPatch = undefined;
    if (digitalUrl !== undefined) {
      if (isNonEmptyStr(digitalUrl)) {
        try {
          const mid = await ensureDigitalMedia(digitalUrl);
          if (mid) digitalRelPatch = { connect: { id: mid } };
        } catch (e) {
          console.warn('[patch producto] ensureDigitalMedia falló:', e?.message || e);
        }
      } else {
        digitalRelPatch = { disconnect: true }; // limpiar enlace digital
      }
    }

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
      ...(digitalRelPatch ? { digital: digitalRelPatch } : {}),
    };

    // Opciones avanzadas
    Object.assign(data, buildAdvancedPatch(req.body, { producto: p }));

    // Sanitiza posibles claves no pertenecientes al modelo
    delete data.digitalUrl;
    delete data.imagenes;
    delete data.categoriasIds;
    delete data.inventario;
    delete data.atributos;

    if (nombre !== undefined) {
      data.slug = await uniqueSlugForProduct(p.tiendaId, nombre, p.id);
    }

    const tx = [];

    // Imágenes (reemplazo completo si viene el arreglo)
    if (Array.isArray(imagenes)) {
      let imgs = imagenes.filter(m => m && m.url);
      const seen = new Set();
      imgs = imgs.filter(m => { if (seen.has(m.url)) return false; seen.add(m.url); return true; });
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
        const rows = await Promise.all(imgs.map(async (m, i) => {
          const mid = await ensureMedia(m.url);
          return {
            productoId: id,
            mediaId: mid,
            alt: m.alt || null,
            isPrincipal: !!m.isPrincipal,
            orden: Number.isFinite(m.orden) ? m.orden : i
          };
        }));
        tx.push(prisma.productoImagen.createMany({ data: rows, skipDuplicates: true }));
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

    // Atributos
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

/* ================== Imágenes de PRODUCTO (editar rápido) ================== */
// Reemplaza TODAS las imágenes
router.put('/:id/imagenes', async (req, res) => {
  try {
    const productoId = Number(req.params.id);
    const bodyImgs = Array.isArray(req.body?.imagenes) ? req.body.imagenes : [];
    await prisma.productoImagen.deleteMany({ where: { productoId } });

    if (bodyImgs.length) {
      const seen = new Set();
      const imgs = bodyImgs
        .filter(m => m && m.url && !seen.has(m.url) && seen.add(m.url))
        .map((m, i) => ({ ...m, orden: Number.isFinite(m.orden) ? m.orden : i }));

      // Asegurar 1 principal
      let found = false;
      const finalImgs = imgs.map((m, i) => {
        const isP = !found && (m.isPrincipal || i === 0);
        if (isP) found = true;
        return { ...m, isPrincipal: isP };
      });

      const rows = await Promise.all(finalImgs.map(async (m) => {
        const mid = await ensureMedia(m.url);
        return { productoId, mediaId: mid, alt: m.alt || null, isPrincipal: !!m.isPrincipal, orden: m.orden ?? 0 };
      }));
      await prisma.productoImagen.createMany({ data: rows, skipDuplicates: true });
    }

    const full = await prisma.producto.findUnique({ where: { id: productoId }, include: productInclude });
    res.json(mapForList(full));
  } catch (e) {
    console.error('[PUT /productos/:id/imagenes] ERROR =>', e);
    res.status(500).json({ error: 'No se pudieron reemplazar las imágenes' });
  }
});

// Agrega una o varias imágenes (sin borrar las existentes)
router.post('/:id/imagenes', async (req, res) => {
  try {
    const productoId = Number(req.params.id);
    const addImgs = Array.isArray(req.body?.imagenes) ? req.body.imagenes : [];
    if (!addImgs.length) return res.json({ ok: true });

    const last = await prisma.productoImagen.findFirst({ where: { productoId }, orderBy: { orden: 'desc' } });
    let nextOrden = (last?.orden ?? -1) + 1;

    const existingPrincipal = await prisma.productoImagen.findFirst({
      where: { productoId, isPrincipal: true }
    });

    let setPrincipal = !existingPrincipal; // si no hay principal, el primero agregado se marca
    const rows = [];
    for (const m of addImgs) {
      if (!m || !m.url) continue;
      const mid = await ensureMedia(m.url);
      rows.push({
        productoId,
        mediaId: mid,
        alt: m.alt || null,
        isPrincipal: setPrincipal ? true : !!m.isPrincipal,
        orden: Number.isFinite(m.orden) ? m.orden : nextOrden++,
      });
      setPrincipal = false;
    }

    if (rows.length) await prisma.productoImagen.createMany({ data: rows, skipDuplicates: true });

    const full = await prisma.producto.findUnique({ where: { id: productoId }, include: productInclude });
    res.json(mapForList(full));
  } catch (e) {
    console.error('[POST /productos/:id/imagenes] ERROR =>', e);
    res.status(500).json({ error: 'No se pudieron agregar las imágenes' });
  }
});

// Elimina una imagen específica
router.delete('/:id/imagenes/:imagenId', async (req, res) => {
  try {
    const productoId = Number(req.params.id);
    const imagenId = Number(req.params.imagenId);

    const img = await prisma.productoImagen.findUnique({ where: { id: imagenId } });
    if (!img || img.productoId !== productoId) return res.status(404).json({ error: 'Imagen no encontrada' });

    await prisma.productoImagen.delete({ where: { id: imagenId } });

    // Asegurar que quede una principal
    const anyPrincipal = await prisma.productoImagen.findFirst({ where: { productoId, isPrincipal: true } });
    if (!anyPrincipal) {
      const first = await prisma.productoImagen.findFirst({ where: { productoId }, orderBy: { orden: 'asc' } });
      if (first) await prisma.productoImagen.update({ where: { id: first.id }, data: { isPrincipal: true } });
    }

    const full = await prisma.producto.findUnique({ where: { id: productoId }, include: productInclude });
    res.json(mapForList(full));
  } catch (e) {
    console.error('[DELETE /productos/:id/imagenes/:imagenId] ERROR =>', e);
    res.status(500).json({ error: 'No se pudo eliminar la imagen' });
  }
});

/* ========== VARIANTES ========== */
router.post('/:id/variantes', async (req, res) => {
  try {
    const productoId = Number(req.params.id);
    const p = await prisma.producto.findUnique({ where: { id: productoId } });
    if (!p) return res.status(404).json({ error: 'Producto no existe' });
    if (p.tipo !== 'VARIANTE') return res.status(400).json({ error: 'El producto no es de tipo VARIANTE' });

    const { sku, nombre, opciones, precio, precioComparativo, costo, inventario, imagenes = [] } = req.body;

    const vImgsInput = Array.isArray(imagenes) ? imagenes.filter(m => m && m.url) : [];
    const vImgsCreate = await Promise.all(vImgsInput.map(async (m, i) => {
      const mid = await ensureMedia(m.url);
      return { mediaId: mid, alt: m.alt || null, orden: Number.isFinite(m.orden) ? m.orden : i };
    }));

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
        imagenes: vImgsCreate.length ? { create: vImgsCreate } : undefined,
      },
      include: { inventario: true, imagenes: { include: { media: true }, orderBy: { orden: 'asc' } } }
    });

    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error creando variante', code: e?.code || null, message: e?.message || null, meta: e?.meta || null });
  }
});

router.patch('/variantes/:varianteId', async (req, res) => {
  try {
    const varianteId = Number(req.params.varianteId);
    const { sku, nombre, opciones, precio, precioComparativo, costo, inventario, imagenes } = req.body;

    const tx = [];

    if (Array.isArray(imagenes)) {
      tx.push(prisma.varianteImagen.deleteMany({ where: { varianteId } }));
      if (imagenes.length) {
        const rows = await Promise.all(imagenes
          .filter(m => m && m.url)
          .map(async (m, i) => {
            const mid = await ensureMedia(m.url);
            return { varianteId, mediaId: mid, alt: m.alt || null, orden: Number.isFinite(m.orden) ? m.orden : i };
          }));
        tx.push(prisma.varianteImagen.createMany({ data: rows, skipDuplicates: true }));
      }
    }

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
      include: { inventario: true, imagenes: { include: { media: true }, orderBy: { orden: 'asc' } } }
    }));

    const [updated] = await prisma.$transaction(tx, { isolationLevel: 'ReadCommitted' });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error actualizando variante', code: e?.code || null, message: e?.message || null, meta: e?.meta || null });
  }
});

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

/* ===== Imágenes de VARIANTE (editar rápido) ===== */
// Reemplaza todas las imágenes de la variante
router.put('/variantes/:varianteId/imagenes', async (req, res) => {
  try {
    const varianteId = Number(req.params.varianteId);
    const bodyImgs = Array.isArray(req.body?.imagenes) ? req.body.imagenes : [];

    await prisma.varianteImagen.deleteMany({ where: { varianteId } });

    if (bodyImgs.length) {
      const seen = new Set();
      const imgs = bodyImgs
        .filter(m => m && m.url && !seen.has(m.url) && seen.add(m.url))
        .map((m, i) => ({ ...m, orden: Number.isFinite(m.orden) ? m.orden : i }));

      const rows = await Promise.all(imgs.map(async (m) => {
        const mid = await ensureMedia(m.url);
        return { varianteId, mediaId: mid, alt: m.alt || null, orden: m.orden ?? 0 };
      }));
      await prisma.varianteImagen.createMany({ data: rows, skipDuplicates: true });
    }

    const v = await prisma.variante.findUnique({
      where: { id: varianteId },
      include: { inventario: true, imagenes: { include: { media: true }, orderBy: { orden: 'asc' } } }
    });
    res.json(v);
  } catch (e) {
    console.error('[PUT /variantes/:varianteId/imagenes] ERROR =>', e);
    res.status(500).json({ error: 'No se pudieron reemplazar las imágenes de la variante' });
  }
});

// Agrega imágenes a la variante
router.post('/variantes/:varianteId/imagenes', async (req, res) => {
  try {
    const varianteId = Number(req.params.varianteId);
    const addImgs = Array.isArray(req.body?.imagenes) ? req.body.imagenes : [];
    if (!addImgs.length) return res.json({ ok: true });

    const last = await prisma.varianteImagen.findFirst({ where: { varianteId }, orderBy: { orden: 'desc' } });
    let nextOrden = (last?.orden ?? -1) + 1;

    const rows = [];
    for (const m of addImgs) {
      if (!m || !m.url) continue;
      const mid = await ensureMedia(m.url);
      rows.push({
        varianteId,
        mediaId: mid,
        alt: m.alt || null,
        orden: Number.isFinite(m.orden) ? m.orden : nextOrden++,
      });
    }
    if (rows.length) await prisma.varianteImagen.createMany({ data: rows, skipDuplicates: true });

    const v = await prisma.variante.findUnique({
      where: { id: varianteId },
      include: { inventario: true, imagenes: { include: { media: true }, orderBy: { orden: 'asc' } } }
    });
    res.json(v);
  } catch (e) {
    console.error('[POST /variantes/:varianteId/imagenes] ERROR =>', e);
    res.status(500).json({ error: 'No se pudieron agregar las imágenes de la variante' });
  }
});

// Elimina una imagen específica de variante
router.delete('/variantes/imagenes/:imagenId', async (req, res) => {
  try {
    const imagenId = Number(req.params.imagenId);
    const img = await prisma.varianteImagen.findUnique({ where: { id: imagenId } });
    if (!img) return res.status(404).json({ error: 'Imagen no encontrada' });

    const varianteId = img.varianteId;
    await prisma.varianteImagen.delete({ where: { id: imagenId } });

    const v = await prisma.variante.findUnique({
      where: { id: varianteId },
      include: { inventario: true, imagenes: { include: { media: true }, orderBy: { orden: 'asc' } } }
    });
    res.json(v);
  } catch (e) {
    console.error('[DELETE /variantes/imagenes/:imagenId] ERROR =>', e);
    res.status(500).json({ error: 'No se pudo eliminar la imagen de la variante' });
  }
});

/* ========== DIGITAL rápido ========== */
router.post('/:id/digital', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { url, mediaId } = req.body || {};

    let mid = null;
    if (Number.isFinite(Number(mediaId))) {
      const exists = await prisma.media.findUnique({ where: { id: Number(mediaId) }, select: { id: true } });
      if (!exists) return res.status(400).json({ error: 'mediaId no existe' });
      mid = exists.id;
    } else if (isNonEmptyStr(url)) {
      mid = await ensureDigitalMedia(url);
    }

    const p = await prisma.producto.update({
      where: { id },
      data: { digital: mid ? { connect: { id: mid } } : { disconnect: true } },
      include: productInclude,
    });
    res.json(mapForList(p));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo asignar archivo digital', code: e?.code || null, message: e?.message || null });
  }
});

/* ========== Duplicar / Restaurar / Bulk ========== */
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
      digital: { disconnect: true },
      licenciamiento: src.licenciamiento,
      imagenes: src.imagenes?.length ? {
        create: src.imagenes.map(m => ({
          mediaId: m.mediaId ?? m.media?.id,
          alt: m.alt, isPrincipal: m.isPrincipal, orden: m.orden
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
          imagenes: v.imagenes?.length ? { create: v.imagenes.map(m => ({ mediaId: m.mediaId ?? m.media?.id, alt: m.alt, orden: m.orden })) } : undefined,
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

/* ========== ELIMINAR (idempotente) ========== */
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const force = String(req.query.force || '') === '1';

    const exists = await prisma.producto.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      // ya no existe: ok igualmente
      return res.json({ ok: true, id, hardDeleted: true, alreadyGone: true });
    }

    if (force) {
      const varIds = (await prisma.variante.findMany({
        where: { productoId: id },
        select: { id: true }
      })).map(v => v.id);

      await prisma.$transaction([
        prisma.varianteImagen.deleteMany({ where: { varianteId: { in: varIds } } }),
        prisma.inventario.deleteMany({ where: { varianteId: { in: varIds } } }),
        prisma.variante.deleteMany({ where: { productoId: id } }),
        prisma.productoImagen.deleteMany({ where: { productoId: id } }),
        prisma.productoCategoria.deleteMany({ where: { productoId: id } }),
        prisma.productoAtributo.deleteMany({ where: { productoId: id } }),
        prisma.inventario.deleteMany({ where: { productoId: id } }),
        prisma.producto.delete({ where: { id } }),
      ], { isolationLevel: 'ReadCommitted' });

      return res.json({ ok: true, id, hardDeleted: true });
    }

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

module.exports = router;

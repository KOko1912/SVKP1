// backend/src/modules/tienda/routes.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const prisma = require('../../config/db');

const router = express.Router();

/* =========================
   Helpers
   ========================= */
function getUserId(req) {
  const raw = req.headers['x-user-id'] || '';
  if (raw) return Number(raw);
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(\d+)$/i);
  return m ? Number(m[1]) : null;
}

function slugify(str = '') {
  return (
    String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || 'mi-tienda'
  );
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function removeFileIfExists(absPath) {
  try {
    if (absPath && fs.existsSync(absPath)) fs.unlinkSync(absPath);
  } catch (_) {}
}

const tiendaUploadsDir = process.env.TIENDA_UPLOADS_DIR || path.join(process.cwd(), 'TiendaUploads');
const PUBLIC_BASE = '/TiendaUploads';

function brandingDir(tiendaId) {
  return path.join(tiendaUploadsDir, `tienda-${tiendaId}`, 'branding');
}
function publicBrandingUrl(tiendaId, filename) {
  return `${PUBLIC_BASE}/tienda-${tiendaId}/branding/${filename}`.replace(/\\/g, '/');
}

// Normaliza una referencia tipo SKU de tienda: alfanumérico + guiones, mayúsculas, máx 64
function normalizeSkuRef(v) {
  if (!v) return null;
  const s = String(v).toUpperCase().replace(/[^A-Z0-9-]+/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '');
  if (!s) return null;
  return s.slice(0, 64);
}

// Convierte string/array a lista de tokens en minúsculas, deduplicada y con longitud acotada
function normalizeTokenArray(value, { maxItems = 20, maxLen = 40 } = {}) {
  let arr = [];
  if (Array.isArray(value)) arr = value;
  else if (typeof value === 'string') {
    // admite CSV o separado por espacios / comas
    arr = value.split(/[,\s]+/);
  }
  const out = [];
  const seen = new Set();
  for (const raw of arr) {
    const t = String(raw || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
    if (!t) continue;
    const clipped = t.slice(0, maxLen);
    if (!seen.has(clipped)) {
      seen.add(clipped);
      out.push(clipped);
      if (out.length >= maxItems) break;
    }
  }
  return out;
}

function randomId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/* =========================
   Normalización homeLayout
   ========================= */
const LAYOUT_MODES = { TEMPLATE_6x20: 'TEMPLATE_6x20', FREE: 'FREE' };

function clamp(min, max, v) {
  const n = Number.isFinite(+v) ? +v : min;
  return Math.min(max, Math.max(min, n));
}
function normalizeGs(gs, type, cols) {
  const defaults =
    {
      hero: { w: 6, h: 2, minW: 2, minH: 2 },
      featured: { w: 4, h: 2, minW: 2, minH: 2 },
      grid: { w: 6, h: 2, minW: 4, minH: 2 },
      category: { w: 3, h: 2, minW: 2, minH: 2 },
      product: { w: 2, h: 2, minW: 1, minH: 1 },
      banner: { w: 6, h: 2, minW: 3, minH: 1 },
      logo: { w: 3, h: 3, minW: 2, minH: 2 },
    }[type] || { w: 4, h: 2, minW: 1, minH: 1 };

  return {
    x: clamp(0, cols - 1, gs?.x ?? 0),
    y: Math.max(0, gs?.y ?? 0),
    w: clamp(1, cols, gs?.w ?? defaults.w),
    h: Math.max(1, gs?.h ?? defaults.h),
    minW: gs?.minW ?? defaults.minW,
    minH: gs?.minH ?? defaults.minH,
  };
}
function clampByMode(gs, type, mode, cols) {
  const g = { ...(gs || {}) };
  if (mode !== LAYOUT_MODES.TEMPLATE_6x20) return g;
  if (type === 'grid') {
    g.w = cols;
    g.h = Math.max(2, g.h || 2);
    g.x = 0;
  }
  if (type === 'hero') {
    g.w = cols;
    g.h = Math.max(2, g.h || 2);
    g.x = 0;
  }
  if (type === 'featured') {
    g.w = clamp(2, cols, g.w || 4);
    g.h = clamp(1, 3, g.h || 2);
  }
  if (type === 'banner') {
    g.w = clamp(3, cols, g.w || 6);
    g.h = clamp(1, 3, g.h || 2);
  }
  if (type === 'product') {
    g.w = clamp(1, cols, g.w || 2);
    g.h = clamp(1, 3, g.h || 2);
  }
  if (type === 'category') {
    g.w = clamp(2, cols, g.w || 3);
    g.h = clamp(1, 3, g.h || 2);
  }
  if (type === 'logo') {
    g.w = clamp(2, cols, g.w || 3);
    g.h = clamp(2, 4, g.h || 3);
  }
  return g;
}
function normalizeHomeLayout(raw) {
  let meta = { mode: LAYOUT_MODES.FREE };
  let blocks = [];
  if (Array.isArray(raw)) {
    blocks = raw;
  } else if (raw && typeof raw === 'object') {
    meta = { mode: raw?.meta?.mode === LAYOUT_MODES.TEMPLATE_6x20 ? LAYOUT_MODES.TEMPLATE_6x20 : LAYOUT_MODES.FREE };
    blocks = Array.isArray(raw.blocks) ? raw.blocks : [];
  }
  const cols = meta.mode === LAYOUT_MODES.TEMPLATE_6x20 ? 6 : 12;
  const normalized = blocks.map((b, i) => {
    const type = String(b?.type || '').trim() || 'custom';
    const id = String(b?.id || `${type}-${i + 1}`);
    const z = Number.isFinite(+b?.z) ? +b.z : i + 1;
    const gs1 = clampByMode(b?.gs || {}, type, meta.mode, cols);
    const gs = normalizeGs(gs1, type, cols);
    const props = b?.props && typeof b.props === 'object' ? b.props : {};
    return { id, type, z, gs, props };
  });
  return { meta, blocks: normalized };
}

/* =========================
   GET /api/tienda/me
   ========================= */
router.get('/me', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    let tienda = await prisma.tienda.findFirst({ where: { usuarioId: userId } });

    if (!tienda) {
      tienda = await prisma.tienda.create({
        data: {
          usuarioId: userId,
          nombre: 'mi-tienda',
          slug: slugify(`mi-tienda-${userId}`),
          colorPrincipal: 'linear-gradient(135deg, #6d28d9, #c026d3)',
          moneda: 'MXN',
          seoKeywords: [],
          aliases: [],
        },
      });
    }

    res.json(tienda);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo obtener la tienda' });
  }
});

/* =========================
   PUT /api/tienda/me
   - Actualiza datos permitidos
   - Normaliza homeLayout
   - NO cambia slug si ya está publicada
   ========================= */
router.put('/me', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const ALLOWED = new Set([
      'nombre',
      'descripcion',
      'portadaUrl',
      'logoUrl',
      'categoria',
      'subcategorias',
      'telefonoContacto',
      'email',
      'horario',
      'metodosPago',
      'redes',
      'envioCobertura',
      'envioCosto',
      'envioTiempo',
      'devoluciones',
      'colorPrincipal',
      'bannerPromoUrl',
      'seoKeywords',
      'seoDescripcion',
      'homeLayout',
      'moneda',
      'ciudad',
      'pais',
      'whatsapp',
      // NUEVOS
      'skuRef',
      'aliases',
    ]);

    const raw = Object.assign({}, req.body || {});
    const data = {};
    for (const k of Object.keys(raw)) {
      if (ALLOWED.has(k)) data[k] = raw[k];
    }

    // Normalizaciones
    if (data.homeLayout !== undefined) data.homeLayout = normalizeHomeLayout(data.homeLayout);

    if (data.seoKeywords !== undefined)
      data.seoKeywords = normalizeTokenArray(data.seoKeywords, { maxItems: 30, maxLen: 40 });

    if (data.aliases !== undefined)
      data.aliases = normalizeTokenArray(data.aliases, { maxItems: 30, maxLen: 40 });

    if (data.subcategorias !== undefined)
      data.subcategorias = normalizeTokenArray(data.subcategorias, { maxItems: 20, maxLen: 40 });

    if (data.metodosPago !== undefined)
      data.metodosPago = normalizeTokenArray(data.metodosPago, { maxItems: 15, maxLen: 20 });

    if (data.email !== undefined) {
      const e = String(data.email || '').trim();
      data.email = e || null;
    }

    if (data.skuRef !== undefined) data.skuRef = normalizeSkuRef(data.skuRef);

    const current = await prisma.tienda.findFirst({ where: { usuarioId: userId } });

    let updated = await prisma.tienda.upsert({
      where: { usuarioId: userId },
      create: {
        usuarioId: userId,
        nombre: data.nombre || 'mi-tienda',
        slug: slugify(`mi-tienda-${userId}`),
        colorPrincipal: 'linear-gradient(135deg, #6d28d9, #c026d3)',
        moneda: 'MXN',
        seoKeywords: [],
        aliases: [],
        ...data,
      },
      update: data,
    });

    // Si NO está publicada y cambió nombre, intenta generar slug
    if (current && data.nombre && data.nombre !== current.nombre) {
      if (!current.isPublished && (!current.slug || current.slug.trim() === '')) {
        const base = slugify(data.nombre);
        let slug = base,
          i = 1;
        while (
          await prisma.tienda.findFirst({
            where: { slug, NOT: { id: updated.id } },
            select: { id: true },
          })
        ) {
          slug = `${base}-${++i}`;
        }
        updated = await prisma.tienda.update({ where: { id: updated.id }, data: { slug } });
      }
    }

    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo actualizar la tienda' });
  }
});

/* =========================
   GET /api/tienda/public/:slug
   - Solo devuelve si está publicada
   ========================= */
router.get('/public/:slug', async (req, res) => {
  try {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    if (!slug) return res.status(400).json({ error: 'Slug inválido' });

    const tienda = await prisma.tienda.findFirst({
      where: { slug, isPublished: true },
      select: {
        id: true,
        nombre: true,
        slug: true,
        isPublished: true,
        publishedAt: true,
        descripcion: true,
        colorPrincipal: true,
        portadaUrl: true,
        logoUrl: true,
        bannerPromoUrl: true,
        categoria: true,
        subcategorias: true,
        telefonoContacto: true,
        email: true,
        horario: true,
        metodosPago: true,
        redes: true,
        envioCobertura: true,
        envioCosto: true,
        envioTiempo: true,
        devoluciones: true,
        moneda: true,
        ciudad: true,
        pais: true,
        whatsapp: true,
        homeLayout: true,
        seoKeywords: true,
        skuRef: true,
        aliases: true,
        publicUuid: true,
      },
    });
    if (!tienda) return res.status(404).json({ error: 'Tienda no publicada o no existe' });

    res.json(tienda);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo cargar la tienda pública' });
  }
});

/* =========================
   PUT /api/tienda/publicar
   - Publica UNA SOLA VEZ y fija el slug
   ========================= */
router.put('/publicar', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const tienda = await prisma.tienda.findFirst({ where: { usuarioId: userId } });
    if (!tienda) return res.status(404).json({ error: 'No tienes tienda' });

    // Si ya fue publicada y tiene slug, no permitimos cambios
    if (tienda.isPublished && tienda.slug) {
      return res.status(409).json({ error: 'La tienda ya fue publicada y el slug no se puede cambiar.' });
    }

    const publish = Boolean(req.body?.publish);
    if (!publish) return res.status(400).json({ error: 'publish debe ser true' });

    const desired = slugify(req.body?.slug || tienda.slug || tienda.nombre || 'mi-tienda');
    // Garantizar unicidad del slug
    let slug = desired;
    let i = 1;
    while (
      await prisma.tienda.findFirst({
        where: { slug, NOT: { id: tienda.id } },
        select: { id: true },
      })
    ) {
      slug = `${desired}-${++i}`;
    }

    // Asegura publicUuid si no existe
    const publicUuid = tienda.publicUuid || randomId();

    const updated = await prisma.tienda.update({
      where: { id: tienda.id },
      data: { slug, isPublished: true, publishedAt: new Date(), publicUuid },
      select: { id: true, slug: true, isPublished: true, publishedAt: true, publicUuid: true },
    });

    res.json({ ok: true, tienda: updated });
  } catch (e) {
    console.error(e);
    // Prisma unique error (por si tuvieras unique en DB)
    if (e.code === 'P2002') return res.status(409).json({ error: 'Slug ocupado, intenta con otro' });
    res.status(500).json({ error: 'No se pudo publicar la tienda' });
  }
});

/* =========================
   Upload portada | logo | banner
   ========================= */
const storage = multer.diskStorage({
  destination: async (req, _file, cb) => {
    try {
      const userId = getUserId(req);
      if (!userId) return cb(new Error('No autorizado'));
      const tienda = await prisma.tienda.findFirst({ where: { usuarioId: userId }, select: { id: true } });
      if (!tienda) return cb(new Error('Tienda no encontrada'));
      const dir = brandingDir(tienda.id);
      ensureDir(dir);
      req._tiendaId = tienda.id;
      cb(null, dir);
    } catch (e) {
      cb(e);
    }
  },
  filename: (req, file, cb) => {
    const tipo = (req.params.tipo || '').toLowerCase(); // portada | logo | banner
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    cb(null, `${tipo}${ext}`);
  },
});
const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ok = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!ok.includes(file.mimetype)) return cb(new Error('Usa PNG, JPG o WEBP'));
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/upload/:tipo', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    try {
      if (err) return res.status(400).json({ error: err.message || 'Error al subir archivo' });
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'No autorizado' });

      const tipo = (req.params.tipo || '').toLowerCase();
      if (!['portada', 'logo', 'banner'].includes(tipo)) {
        return res.status(400).json({ error: 'Tipo inválido. Usa: portada | logo | banner' });
      }
      if (!req.file || !req._tiendaId) {
        return res.status(400).json({ error: 'Archivo faltante' });
      }

      const dir = brandingDir(req._tiendaId);
      const just = req.file.filename; // p.ej. portada.jpg
      const base = `${tipo}.`;
      // borra versiones anteriores del mismo tipo
      fs.readdirSync(dir).forEach((f) => {
        if (f.startsWith(base) && f !== just) removeFileIfExists(path.join(dir, f));
      });

      const url = publicBrandingUrl(req._tiendaId, just);
      const fieldMap = { portada: 'portadaUrl', logo: 'logoUrl', banner: 'bannerPromoUrl' };
      const field = fieldMap[tipo];

      const tienda = await prisma.tienda.update({
        where: { id: req._tiendaId },
        data: { [field]: url },
      });

      res.json({ ok: true, url, tienda });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error al procesar la subida' });
    }
  });
});

module.exports = router;

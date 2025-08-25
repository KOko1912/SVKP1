// backend/src/modules/tienda/routes.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
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
  return String(str)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || 'mi-tienda';
}

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function removeFileIfExists(absPath) { try { if (absPath && fs.existsSync(absPath)) fs.unlinkSync(absPath); } catch (_) {} }

const tiendaUploadsDir = process.env.TIENDA_UPLOADS_DIR || path.join(process.cwd(), 'TiendaUploads');
// Public base para servir estáticos (app.js ya sirve /TiendaUploads -> tiendaUploadsDir)
const PUBLIC_BASE = '/TiendaUploads';

// Carpeta branding por tienda:  TiendaUploads/tienda-<id>/branding
function brandingDir(tiendaId) {
  return path.join(tiendaUploadsDir, `tienda-${tiendaId}`, 'branding');
}
function publicBrandingUrl(tiendaId, filename) {
  return `${PUBLIC_BASE}/tienda-${tiendaId}/branding/${filename}`.replace(/\\/g, '/');
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
  const defaults = {
    hero:     { w: 6, h: 2, minW: 2, minH: 2 },
    featured: { w: 4, h: 2, minW: 2, minH: 2 },
    grid:     { w: 6, h: 2, minW: 4, minH: 2 },
    category: { w: 3, h: 2, minW: 2, minH: 2 },
    product:  { w: 2, h: 2, minW: 1, minH: 1 },
    banner:   { w: 6, h: 2, minW: 3, minH: 1 },
    logo:     { w: 3, h: 3, minW: 2, minH: 2 },
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
  if (type === 'grid')     { g.w = cols; g.h = Math.max(2, g.h || 2); g.x = 0; }
  if (type === 'hero')     { g.w = cols; g.h = Math.max(2, g.h || 2); g.x = 0; }
  if (type === 'featured') { g.w = clamp(2, cols, g.w || 4); g.h = clamp(1, 3, g.h || 2); }
  if (type === 'banner')   { g.w = clamp(3, cols, g.w || 6); g.h = clamp(1, 3, g.h || 2); }
  if (type === 'product')  { g.w = clamp(1, cols, g.w || 2); g.h = clamp(1, 3, g.h || 2); }
  if (type === 'category') { g.w = clamp(2, cols, g.w || 3); g.h = clamp(1, 3, g.h || 2); }
  if (type === 'logo')     { g.w = clamp(2, cols, g.w || 3); g.h = clamp(2, 4,  g.h || 3); }
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
    const id   = String(b?.id || `${type}-${i+1}`);
    const z    = Number.isFinite(+b?.z) ? +b.z : (i+1);
    const gs1  = clampByMode(b?.gs || {}, type, meta.mode, cols);
    const gs   = normalizeGs(gs1, type, cols);
    const props = b?.props && typeof b.props === 'object' ? b.props : {};
    return { id, type, z, gs, props };
  });
  return { meta, blocks: normalized };
}

/* =========================
   GET /api/tienda/me
   - devuelve o crea la tienda del usuario
   ========================= */
router.get('/me', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    let tienda = await prisma.tienda.findFirst({
      where: { usuarioId: userId },
    });

    if (!tienda) {
      tienda = await prisma.tienda.create({
        data: {
          usuarioId: userId,
          nombre: 'mi-tienda',
          slug: slugify(`mi-tienda-${userId}`),
          colorPrincipal: 'linear-gradient(135deg, #6d28d9, #c026d3)',
          moneda: 'MXN',
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
   - Renombra carpeta si cambia el nombre
   ========================= */
router.put('/me', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const ALLOWED = new Set([
      'nombre','descripcion','portadaUrl','logoUrl','categoria','subcategorias',
      'telefonoContacto','email','horario','metodosPago','redes',
      'envioCobertura','envioCosto','envioTiempo','devoluciones',
      'colorPrincipal','bannerPromoUrl','seoKeywords','seoDescripcion',
      'homeLayout','moneda','ciudad','pais','whatsapp'
    ]);

    const data = {};
    for (const k of Object.keys(req.body || {})) {
      if (ALLOWED.has(k)) data[k] = req.body[k];
    }
    if (data.homeLayout !== undefined) {
      data.homeLayout = normalizeHomeLayout(data.homeLayout);
    }

    const current = await prisma.tienda.findFirst({ where: { usuarioId: userId } });
    // upsert básico
    let updated = await prisma.tienda.upsert({
      where: { usuarioId: userId },
      create: {
        usuarioId: userId,
        nombre: data.nombre || 'mi-tienda',
        slug: slugify(`mi-tienda-${userId}`),
        colorPrincipal: 'linear-gradient(135deg, #6d28d9, #c026d3)',
        moneda: 'MXN',
        ...data
      },
      update: data,
    });

    // Si cambió el nombre ⇒ recalcular slug y renombrar carpeta branding
    if (current && data.nombre && data.nombre !== current.nombre) {
      const newSlug = slugify(data.nombre);
      // slug único
      let slug = newSlug, i = 1;
      while (await prisma.tienda.findFirst({ where: { slug, NOT: { id: updated.id } }, select: { id: true } })) {
        slug = `${newSlug}-${++i}`;
      }

      // Renombrar carpeta branding si existe
      const dirOld = brandingDir(updated.id); // es tienda fija por id (no por nombre), no hace falta renombrar padre
      ensureDir(dirOld); // asegurar que exista al menos

      // El slug sólo se usa para URL pública, no para ruta física (usamos id para rutas)
      updated = await prisma.tienda.update({
        where: { id: updated.id },
        data: { slug },
      });
    }

    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo actualizar la tienda' });
  }
});

/* =========================
   GET /api/tienda/public/:slug
   - Info pública de la tienda
   ========================= */
router.get('/public/:slug', async (req, res) => {
  try {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    if (!slug) return res.status(400).json({ error: 'Slug inválido' });

    const tienda = await prisma.tienda.findFirst({
      where: { slug },
      select: {
        id: true, nombre: true, slug: true, colorPrincipal: true,
        ciudad: true, pais: true, moneda: true, whatsapp: true,
        portadaUrl: true, logoUrl: true, bannerPromoUrl: true,
      },
    });
    if (!tienda) return res.status(404).json({ error: 'No encontrada' });

    res.json(tienda);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo cargar la tienda pública' });
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
      // guardar tiendaId en req para usar en filename/response
      req._tiendaId = tienda.id;
      cb(null, dir);
    } catch (e) { cb(e); }
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

      // Borra otras extensiones del mismo tipo para mantener 1 archivo por tipo
      const dir = brandingDir(req._tiendaId);
      const just = req.file.filename; // p.ej. portada.jpg
      const base = `${tipo}.`;
      fs.readdirSync(dir).forEach(f => {
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

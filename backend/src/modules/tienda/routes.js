// backend/src/modules/tienda/routes.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const prisma = require('../../config/db');

const router = express.Router();

/* ============ HELPERS ============ */

// TEMP mientras uses x-user-id; cuando tengas JWT, cámbialo a req.user.id
function getUserId(req) {
  const raw = req.headers['x-user-id'];
  return raw ? Number(raw) : null;
}

// Carpeta base de subidas (sirviéndose como /uploads/...)
const UPLOADS_BASE = process.env.UPLOADS_DIR || path.join(process.cwd(), 'TiendaUploads');

const slugify = (str) =>
  String(str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'mi-tienda';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function removeFileIfExists(absPath) {
  try {
    if (absPath && fs.existsSync(absPath)) fs.unlinkSync(absPath);
  } catch (_) {}
}

// ⬇️ Carpeta por usuario + slug de la tienda
function shopDirFromName(nombre, usuarioId) {
  return path.join(UPLOADS_BASE, String(usuarioId), slugify(nombre));
}

function relUrlFromAbs(absPath) {
  const rel = absPath.replace(UPLOADS_BASE, '').split(path.sep).join('/');
  return `/uploads${rel}`;
}

function absFromRelUrl(relUrl) {
  if (!relUrl) return null;
  const rel = relUrl.replace(/^\/?uploads\/?/, '');
  return path.join(UPLOADS_BASE, ...rel.split('/'));
}

// Borra cualquier archivo que empiece por <tipo>. (ej. portada.*, logo.*, banner.*)
function deleteOldTypeFiles(dir, tipo, exceptFilename) {
  try {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach((f) => {
      if (f.startsWith(`${tipo}.`) && f !== exceptFilename) {
        removeFileIfExists(path.join(dir, f));
      }
    });
  } catch (_) {}
}

/* ============ Normalización homeLayout ============ */

const LAYOUT_MODES = { TEMPLATE_6x20: 'TEMPLATE_6x20', FREE: 'FREE' };

function clamp(min, max, v) {
  const n = Number.isFinite(+v) ? +v : min;
  return Math.min(max, Math.max(min, n));
}

function normalizeGs(gs, type, cols) {
  // Defaults por tipo (coinciden con el front)
  const defaults = {
    hero:     { w: 6, h: 2, minW: 2, minH: 2 },
    featured: { w: 4, h: 2, minW: 2, minH: 2 },
    grid:     { w: 6, h: 2, minW: 4, minH: 2 },
    category: { w: 3, h: 2, minW: 2, minH: 2 },
    product:  { w: 2, h: 2, minW: 1, minH: 1 },
    banner:   { w: 6, h: 2, minW: 3, minH: 1 },
    logo:     { w: 3, h: 3, minW: 2, minH: 2 },
  }[type] || { w: 4, h: 2, minW: 1, minH: 1 };

  const out = {
    x: clamp(0, cols - 1, gs?.x ?? 0),
    y: Math.max(0, gs?.y ?? 0),
    w: clamp(1, cols, gs?.w ?? defaults.w),
    h: Math.max(1, gs?.h ?? defaults.h),
    minW: gs?.minW ?? defaults.minW,
    minH: gs?.minH ?? defaults.minH,
  };
  return out;
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
  // Acepta array antiguo o {meta, blocks}
  let meta = { mode: LAYOUT_MODES.FREE };
  let blocks = [];
  if (Array.isArray(raw)) {
    blocks = raw;
  } else if (raw && typeof raw === 'object') {
    meta = { mode: raw?.meta?.mode === LAYOUT_MODES.TEMPLATE_6x20 ? LAYOUT_MODES.TEMPLATE_6x20 : LAYOUT_MODES.FREE };
    blocks = Array.isArray(raw.blocks) ? raw.blocks : [];
  }
  const cols = meta.mode === LAYOUT_MODES.TEMPLATE_6x20 ? 6 : 12;

  // Asegurar id, type, z y gs válidos
  const normalized = blocks.map((b, i) => {
    const type = String(b?.type || '').trim() || 'custom';
    const id   = String(b?.id || `${type}-${i+1}`);
    const z    = Number.isFinite(+b?.z) ? +b.z : (i+1); // primero abajo
    const gs1  = clampByMode(b?.gs || {}, type, meta.mode, cols);
    const gs   = normalizeGs(gs1, type, cols);
    const props = b?.props && typeof b.props === 'object' ? b.props : {};
    return { id, type, z, gs, props };
  });

  return { meta, blocks: normalized };
}

/* ============ PREPARACIÓN DE CARPETA (MIDDLEWARE) ============ */
// Prepara req.__uploadDir y crea tienda si no existe.
async function prepareUploadContext(req, res, next) {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ error: 'Falta x-user-id' });

    let shop = await prisma.tienda.findUnique({ where: { usuarioId: uid } });
    if (!shop) {
      shop = await prisma.tienda.create({
        data: { usuarioId: uid, nombre: 'mi-tienda', subcategorias: [], metodosPago: [], seoKeywords: [] },
      });
    }

    const dir = shopDirFromName(shop.nombre, uid);
    ensureDir(dir);

    req.__uploadDir = dir;
    req.__shop = shop;
    next();
  } catch (e) {
    next(e);
  }
}

/* ============ MULTER STORAGE ============ */

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const fallbackDir = shopDirFromName('mi-tienda', getUserId(req) || 'anon');
    const dir = req.__uploadDir || fallbackDir;
    ensureDir(dir);
    cb(null, dir);
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
    const okTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!okTypes.includes(file.mimetype)) {
      const err = new Error('Tipo de archivo no permitido. Usa PNG, JPG o WEBP.');
      return cb(err);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

/* ============ RUTAS ============ */

// GET /api/tienda/me (no crea si no existe; el front ya maneja esto)
router.get('/me', async (req, res, next) => {
  try {
    const usuarioId = getUserId(req);
    if (!usuarioId) return res.status(401).json({ error: 'Falta x-user-id' });
    const tienda = await prisma.tienda.findUnique({ where: { usuarioId } });
    res.json(tienda || null);
  } catch (e) { next(e); }
});

// PUT /api/tienda/me  { campos permitidos, incluido homeLayout }
router.put('/me', async (req, res, next) => {
  try {
    const usuarioId = getUserId(req);
    if (!usuarioId) return res.status(401).json({ error: 'Falta x-user-id' });

    // validación simple de teléfono
    if (req.body?.telefonoContacto && !/^\d{10}$/.test(String(req.body.telefonoContacto))) {
      return res.status(400).json({ error: 'El teléfono debe tener exactamente 10 dígitos.' });
    }

    // Campos permitidos (coinciden con tu Prisma)
    const ALLOWED = new Set([
      'nombre','descripcion','portadaUrl','logoUrl','categoria','subcategorias',
      'telefonoContacto','email','horario','metodosPago','redes',
      'envioCobertura','envioCosto','envioTiempo','devoluciones',
      'colorPrincipal','bannerPromoUrl','seoKeywords','seoDescripcion',
      'homeLayout'
    ]);

    const data = {};
    Object.keys(req.body || {}).forEach(k => {
      if (ALLOWED.has(k)) data[k] = req.body[k];
    });

    // Normaliza homeLayout si viene
    if (data.homeLayout !== undefined) {
      data.homeLayout = normalizeHomeLayout(data.homeLayout);
    }

    const current = await prisma.tienda.findUnique({ where: { usuarioId } });

    // Upsert base
    let updated = await prisma.tienda.upsert({
      where: { usuarioId },
      update: data,
      create: {
        usuarioId,
        nombre: data.nombre || 'mi-tienda',
        subcategorias: [],
        metodosPago: [],
        seoKeywords: [],
        ...data
      },
    });

    // Si cambió el nombre, renombra carpeta y ajusta URLs (portada, logo, banner)
    if (current && data.nombre && data.nombre !== current.nombre) {
      const oldDir = shopDirFromName(current.nombre, usuarioId);
      const newDir = shopDirFromName(data.nombre, usuarioId);

      if (fs.existsSync(oldDir)) {
        ensureDir(path.dirname(newDir));
        try { fs.renameSync(oldDir, newDir); } catch (_) { /* noop */ }
      }

      const oldSlug = slugify(current.nombre);
      const newSlug = slugify(data.nombre);
      const prefixOld = `/uploads/${usuarioId}/${oldSlug}/`;
      const prefixNew = `/uploads/${usuarioId}/${newSlug}/`;
      const rewrite = (url) => (url && url.startsWith(prefixOld) ? url.replace(prefixOld, prefixNew) : url);

      updated = await prisma.tienda.update({
        where: { usuarioId },
        data: {
          portadaUrl: rewrite(updated.portadaUrl),
          logoUrl: rewrite(updated.logoUrl),
          bannerPromoUrl: rewrite(updated.bannerPromoUrl),
          // Tip: si algún día guardas rutas en homeLayout, aquí podrías recorrer bloques y reescribirlas también.
        },
      });
    }

    res.json(updated);
  } catch (e) { next(e); }
});

// POST /api/tienda/upload/:tipo  (portada | logo | banner)
router.post('/upload/:tipo', prepareUploadContext, (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Error al subir archivo' });
    }

    try {
      const usuarioId = getUserId(req);
      if (!usuarioId) return res.status(401).json({ error: 'Falta x-user-id' });

      const tipo = (req.params.tipo || '').toLowerCase();
      if (!['portada', 'logo', 'banner'].includes(tipo)) {
        return res.status(400).json({ error: 'Tipo inválido. Usa: portada | logo | banner' });
      }

      const file = req.file;
      if (!file) return res.status(400).json({ error: 'Falta archivo' });

      const dir = req.__uploadDir;
      const filename = path.basename(file.path);

      // Borra otras variantes del mismo tipo (extensiones distintas)
      deleteOldTypeFiles(dir, tipo, filename);

      // URL pública
      const url = relUrlFromAbs(file.path);

      // Guarda en DB la referencia correcta
      const fieldMap = { portada: 'portadaUrl', logo: 'logoUrl', banner: 'bannerPromoUrl' };
      const field = fieldMap[tipo];

      const tienda = await prisma.tienda.upsert({
        where: { usuarioId },
        update: { [field]: url },
        create: { usuarioId, nombre: 'mi-tienda', [field]: url },
      });

      res.json({ ok: true, url, tienda });
    } catch (e) {
      next(e);
    }
  });
});

module.exports = router;

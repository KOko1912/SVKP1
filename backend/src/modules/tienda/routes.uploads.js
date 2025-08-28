// backend/src/modules/tienda/routes.uploads.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const mime = require('mime-types');
const prisma = require('../../config/db');
const { StorageProvider } = require('@prisma/client');
const { uploadToSupabase } = require('../../lib/uploadSupabase');
const { getSupabase } = require('../../lib/supabase');

const router = express.Router();
const STORAGE_PROVIDER = (process.env.STORAGE_PROVIDER || 'LOCAL').toUpperCase();
const BUCKET = process.env.SUPABASE_BUCKET || 'media';

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

async function loadTienda(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    let tienda = await prisma.tienda.findFirst({
      where: { usuarioId: userId },
      include: { portada: true, logo: true, banner: true },
    });

    if (!tienda) {
      tienda = await prisma.tienda.create({
        data: {
          usuarioId: userId,
          nombre: 'mi-tienda',
          slug: `mi-tienda-${userId}`,
          colorPrincipal: 'linear-gradient(135deg, #6d28d9, #c026d3)',
          moneda: 'MXN',
          seoKeywords: [],
          aliases: [],
        },
        include: { portada: true, logo: true, banner: true },
      });
    }

    req.tienda = tienda;
    next();
  } catch (e) {
    console.error('[upload tienda] loadTienda error', e);
    res.status(500).json({ error: 'Error cargando tienda' });
  }
}

const SLOT_FIELDS = { portada: 'portadaId', logo: 'logoId', banner: 'bannerId' };
function validateSlot(req, res, next) {
  const slot = String(req.params.slot || '').toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(SLOT_FIELDS, slot)) {
    return res.status(400).json({ error: 'slot inválido', allow: Object.keys(SLOT_FIELDS) });
  }
  req.slot = slot;
  next();
}

/* =========================
   Almacenamiento
   ========================= */
const PUBLIC_DIR = path.resolve(process.cwd(), process.env.PUBLIC_DIR || 'public');
function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

const ALLOWED = new Set(['image/png','image/jpeg','image/webp','image/avif','image/svg+xml']);

let storage;
if (STORAGE_PROVIDER === 'SUPABASE') {
  storage = multer.memoryStorage();
} else {
  storage = multer.diskStorage({
    destination(req, _file, cb) {
      try {
        const dir = path.join(
          PUBLIC_DIR,
          'TiendaUploads',
          `tienda-${req.tienda.id}`,
          'branding',
          req.slot
        );
        ensureDir(dir);
        cb(null, dir);
      } catch (e) {
        cb(e);
      }
    },
    filename(_req, file, cb) {
      const ext = mime.extension(file.mimetype) || 'bin';
      const safe = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
      cb(null, safe);
    },
  });
}

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (ALLOWED.has(file.mimetype)) return cb(null, true);
    cb(new Error('Formato de imagen no permitido'));
  }
});

/* =========================
   POST /api/tienda/upload/:slot
   ========================= */
router.post('/upload/:slot', loadTienda, validateSlot, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo ausente (field: file)' });

    // Referencia anterior para limpieza
    const oldMedia = req.tienda[req.slot] || null;

    let media;

    if (STORAGE_PROVIDER === 'SUPABASE') {
      const { key, url } = await uploadToSupabase({
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        folder: `tiendas/${req.tienda.id}/branding/${req.slot}`,
        filename: (req.file.originalname || req.slot).split('.')[0]?.slice(0, 40),
        visibility: 'public',
        upsert: false,
      });

      media = await prisma.media.create({
        data: {
          provider: StorageProvider.SUPABASE,
          key,
          url,
          mime: req.file.mimetype || mime.lookup(req.file.originalname) || null,
          sizeBytes: req.file.size || null,
          width: null,
          height: null,
          checksum: null,
        },
      });
    } else {
      const relKey = path
        .join('TiendaUploads', `tienda-${req.tienda.id}`, 'branding', req.slot, req.file.filename)
        .replace(/\\/g, '/');
      const publicUrl = `/${relKey}`;

      media = await prisma.media.create({
        data: {
          provider: StorageProvider.LOCAL,
          key: relKey,
          url: publicUrl,
          mime: req.file.mimetype || mime.lookup(req.file.originalname) || null,
          sizeBytes: req.file.size || null,
          width: null,
          height: null,
          checksum: null,
        },
      });
    }

    // Actualizar tienda al nuevo media
    const field = SLOT_FIELDS[req.slot];
    await prisma.tienda.update({
      where: { id: req.tienda.id },
      data: { [field]: media.id },
    });

    // Limpieza del anterior (bucket + DB), sin romper si falla
    try {
      if (oldMedia?.id) {
        if (oldMedia.provider === 'SUPABASE' && oldMedia.key) {
          const supabase = await getSupabase();
          const { error } = await supabase.storage.from(BUCKET).remove([oldMedia.key]);
          if (error) console.warn('[cleanup supabase] remove error', error);
        } else if (oldMedia.provider === 'LOCAL' && oldMedia.key) {
          const abs = path.join(PUBLIC_DIR, oldMedia.key);
          if (fs.existsSync(abs)) fs.unlinkSync(abs);
        }
        await prisma.media.delete({ where: { id: oldMedia.id } });
      }
    } catch (cleanupErr) {
      console.warn('[cleanup media] warning:', cleanupErr?.message || cleanupErr);
    }

    res.json({ ok: true, mediaId: media.id, url: media.url, slot: req.slot });
  } catch (e) {
    console.error('[upload tienda] error', e);
    res.status(500).json({ error: 'No se pudo subir la imagen', message: e?.message || null });
  }
});

module.exports = router;

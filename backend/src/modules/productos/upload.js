// backend/src/modules/productos/upload.js
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
function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function genName(original = 'file.bin') {
  const ext = (path.extname(original) || '').toLowerCase();
  const base = String(Date.now()) + '_' + Math.random().toString(36).slice(2, 10);
  return base + (ext || '');
}

/**
 * Resuelve carpeta física y baseUrl pública donde guardar el archivo.
 * - Si el usuario tiene tienda: TiendaUploads/tienda-<id>/<subdir>
 * - Si no: uploads/user-<id>/<subdir>
 */
async function resolveTarget(req, subdir) {
  const tiendaUploadsDir = process.env.TIENDA_UPLOADS_DIR || path.join(process.cwd(), 'TiendaUploads');
  const userUploadsDir   = process.env.USER_UPLOADS_DIR   || path.join(process.cwd(), 'uploads');

  const userId = getUserId(req);
  if (userId) {
    const tienda = await prisma.tienda.findFirst({ where: { usuarioId: userId }, select: { id: true } }).catch(() => null);
    if (tienda?.id) {
      const dir = path.join(tiendaUploadsDir, `tienda-${tienda.id}`, subdir);
      const baseUrl = `/TiendaUploads/tienda-${tienda.id}/${subdir}`;
      ensureDir(dir);
      return { dir, baseUrl };
    }
    const dir = path.join(userUploadsDir, `user-${userId}`, subdir);
    const baseUrl = `/uploads/user-${userId}/${subdir}`;
    ensureDir(dir);
    return { dir, baseUrl };
  }

  // Fallback anónimo
  const dir = path.join(userUploadsDir, 'anon', subdir);
  const baseUrl = `/uploads/anon/${subdir}`;
  ensureDir(dir);
  return { dir, baseUrl };
}

/* =========================
   Multer factories
   ========================= */
const IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const DIGITAL_MIME = new Set([
  'application/pdf', 'application/zip', 'application/x-zip-compressed',
  // Permitimos imágenes como archivo digital (ej. mockups/arte)
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
]);

function makeUploader({ subdir, maxSizeBytes, allowedMime }) {
  const storage = multer.diskStorage({
    destination: async function (req, _file, cb) {
      try {
        if (!req._uploadTarget) req._uploadTarget = await resolveTarget(req, subdir);
        cb(null, req._uploadTarget.dir);
      } catch (e) { cb(e); }
    },
    filename: function (_req, file, cb) {
      cb(null, genName(file.originalname));
    }
  });

  const fileFilter = function (_req, file, cb) {
    if (allowedMime && allowedMime.size && !allowedMime.has(file.mimetype)) {
      return cb(new Error('Tipo de archivo no permitido'), false);
    }
    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: maxSizeBytes }
  }).single('file'); // Frontend envía 'file'
}

/* =========================
   Endpoints
   ========================= */

// === Fallback genérico: POST /api/v1/upload ===
// (Pensado para el Comprobante: imagen, crea Media LOCAL y devuelve mediaId)
const uploadGeneric = makeUploader({
  subdir: 'misc',
  maxSizeBytes: Number(process.env.MAX_IMAGE_SIZE || 8 * 1024 * 1024),
  allowedMime: IMAGE_MIME,
});

router.post('/', (req, res) => {
  uploadGeneric(req, res, async (err) => {
    try {
      if (err) return res.status(400).json({ error: err?.message || 'No se pudo subir el archivo' });
      if (!req.file || !req._uploadTarget) return res.status(400).json({ error: 'Archivo faltante' });

      const url = `${req._uploadTarget.baseUrl}/${req.file.filename}`.replace(/\\/g, '/');
      const key = url.replace(/^\//, ''); // clave relativa para provider LOCAL

      const media = await prisma.media.create({
        data: {
          provider: 'LOCAL',
          key,
          url,
          mime: req.file.mimetype || null,
          sizeBytes: req.file.size || null,
        },
      });

      return res.json({ ok: true, mediaId: media.id, id: media.id, url, media });
    } catch (e) {
      console.error('POST /api/v1/upload error:', e);
      return res.status(500).json({ error: 'Error subiendo archivo' });
    }
  });
});

// Imágenes de producto
const uploadProducto = makeUploader({
  subdir: 'productos',
  maxSizeBytes: Number(process.env.MAX_IMAGE_SIZE || 8 * 1024 * 1024), // 8MB
  allowedMime: IMAGE_MIME,
});

router.post('/producto', (req, res) => {
  uploadProducto(req, res, (err) => {
    if (err) {
      const msg = err?.message || 'No se pudo subir la imagen';
      return res.status(400).json({ error: msg });
    }
    if (!req.file || !req._uploadTarget) {
      return res.status(400).json({ error: 'Archivo faltante' });
    }
    const url = `${req._uploadTarget.baseUrl}/${req.file.filename}`.replace(/\\/g, '/');
    res.json({ ok: true, url, name: req.file.originalname, size: req.file.size });
  });
});

// Archivos digitales (PDF/ZIP/IMG)
const uploadDigital = makeUploader({
  subdir: 'digital',
  maxSizeBytes: Number(process.env.MAX_DIGITAL_SIZE || 100 * 1024 * 1024), // 100MB
  allowedMime: DIGITAL_MIME,
});

router.post('/digital', (req, res) => {
  uploadDigital(req, res, (err) => {
    if (err) {
      const msg = err?.message || 'No se pudo subir el archivo';
      return res.status(400).json({ error: msg });
    }
    if (!req.file || !req._uploadTarget) {
      return res.status(400).json({ error: 'Archivo faltante' });
    }
    const url = `${req._uploadTarget.baseUrl}/${req.file.filename}`.replace(/\\/g, '/');
    res.json({ ok: true, url, name: req.file.originalname, size: req.file.size });
  });
});

module.exports = router;

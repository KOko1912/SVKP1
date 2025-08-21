// backend/src/modules/productos/upload.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const prisma = require('../../config/db'); // o: const { prisma } = require('../../config/db');

const router = express.Router();

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
    .replace(/(^-|-$)+/g, '');
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const userId = getUserId(req);
      const tienda = await prisma.tienda.findUnique({ where: { usuarioId: userId } });
      if (!tienda) return cb(new Error('Tienda no encontrada'));

      const tiendaSlug = slugify(tienda.nombre || String(tienda.id));
      const baseDir = path.join(process.cwd(), 'TiendaUploads', String(tienda.id), tiendaSlug, 'productos');
      ensureDir(baseDir);
      cb(null, baseDir);
    } catch (e) { cb(e); }
  },
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    const base = slugify(path.parse(file.originalname).name) || 'img';
    cb(null, `${base}${ext}`);
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

// POST /api/v1/upload/producto   (FormData: file)
router.post('/producto', upload.single('file'), async (req, res) => {
  try {
    const userId = getUserId(req);
    const tienda = await prisma.tienda.findUnique({ where: { usuarioId: userId } });
    const tiendaSlug = slugify(tienda.nombre || String(tienda.id));
    const url = `/TiendaUploads/${tienda.id}/${tiendaSlug}/productos/${req.file.filename}`.replace(/\\/g,'/');
    res.json({ url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error subiendo archivo' });
  }
});
// POST /api/v1/upload/producto/imagenes (FormData: files[])

// === SUBIDA DE ARCHIVO DIGITAL (PDF/ZIP/etc.) ===
// Guarda en: /TiendaUploads/<tiendaId>/<slug>/digital/<archivo>
const multer2 = require('multer');

const digitalStorage = multer2.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const userId = getUserId(req);
      const tienda = await prisma.tienda.findUnique({ where: { usuarioId: userId } });
      if (!tienda) return cb(new Error('Tienda no encontrada'));
      const tiendaSlug = slugify(tienda.nombre || String(tienda.id));
      const baseDir = path.join(process.cwd(), 'TiendaUploads', String(tienda.id), tiendaSlug, 'digital');
      ensureDir(baseDir);
      cb(null, baseDir);
    } catch (e) { cb(e); }
  },
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    const base = slugify(path.parse(file.originalname).name) || 'archivo';
    cb(null, `${base}${ext || '.bin'}`);
  },
});

const okDigital = new Set([
  'application/pdf', 'application/zip', 'application/x-zip-compressed',
  'application/octet-stream',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'audio/mpeg', 'video/mp4',
  // puedes ampliar esta lista
]);

const uploadDigital = multer2({
  storage: digitalStorage,
  fileFilter: (_req, file, cb) => {
    if (!okDigital.has(file.mimetype)) {
      return cb(new Error('Tipo no permitido para digital. Usa PDF, ZIP u otros formatos habilitados.'));
    }
    cb(null, true);
  },
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// POST /api/v1/upload/digital   (FormData: file)
router.post('/digital', uploadDigital.single('file'), async (req, res) => {
  try {
    const userId = getUserId(req);
    const tienda = await prisma.tienda.findUnique({ where: { usuarioId: userId } });
    const tiendaSlug = slugify(tienda.nombre || String(tienda.id));
    const url = `/TiendaUploads/${tienda.id}/${tiendaSlug}/digital/${req.file.filename}`.replace(/\\/g,'/');
    res.json({ url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error subiendo archivo digital' });
  }
});

module.exports = router;

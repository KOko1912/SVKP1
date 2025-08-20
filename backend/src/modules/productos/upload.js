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

module.exports = router;

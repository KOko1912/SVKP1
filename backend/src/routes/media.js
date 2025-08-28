// backend/src/routes/media.js
const express = require('express');
const multer = require('multer');
const prisma = require('../config/db'); // usa cliente compartido
const { StorageProvider } = require('@prisma/client');
const { uploadToSupabase } = require('../lib/uploadSupabase');

const router = express.Router();

const IMAGE_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/avif',
  'image/svg+xml',
]);

// 5 MB en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// --- Diagnóstico rápido ---
router.get('/ping', (req, res) => {
  const need = ['SUPABASE_URL','SUPABASE_SERVICE_ROLE','SUPABASE_BUCKET','SUPABASE_BUCKET_PUBLIC'];
  const missing = need.filter(k => !process.env[k]);
  if (missing.length) {
    return res.status(500).json({ ok:false, error:`Faltan env: ${missing.join(', ')}` });
  }
  return res.json({
    ok:true,
    bucket: process.env.SUPABASE_BUCKET,
    public: process.env.SUPABASE_BUCKET_PUBLIC
  });
});

/**
 * POST /api/media?folder=usuarios/123
 * Subida genérica → crea Media
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido (name="file")' });

    const folder = (req.query.folder || 'misc').toString();
    const { buffer, mimetype, originalname, size } = req.file;

    if (!IMAGE_MIME.has(mimetype)) return res.status(415).json({ error: 'Tipo de archivo no permitido' });

    const baseName = (originalname || '').split('.')[0]?.slice(0, 40) || 'file';
    const { key, url } = await uploadToSupabase({
      buffer, mimetype, folder, filename: baseName, visibility: 'public',
    });

    const media = await prisma.media.create({
      data: { provider: StorageProvider.SUPABASE, key, url, mime: mimetype, sizeBytes: size },
    });

    res.json({ ok: true, media });
  } catch (e) {
    console.error('POST /api/media error:', e);
    res.status(500).json({ error: 'Upload failed', detail: String(e.message || e) });
  }
});

/**
 * POST /api/media/usuarios/:id/avatar
 * Sube avatar → crea Media → asigna fotoId a Usuario
 */
router.post('/usuarios/:id/avatar', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file requerido' });
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'userId inválido' });

    const { buffer, mimetype, originalname, size } = req.file;
    if (!IMAGE_MIME.has(mimetype)) return res.status(415).json({ error: 'Tipo de archivo no permitido' });

    const { key, url } = await uploadToSupabase({
      buffer, mimetype,
      folder: `usuarios/${userId}`,
      filename: (originalname || '').split('.')[0]?.slice(0, 40),
      visibility: 'public',
    });

    const media = await prisma.media.create({
      data: { provider: StorageProvider.SUPABASE, key, url, mime: mimetype, sizeBytes: size },
    });

    await prisma.usuario.update({ where: { id: userId }, data: { fotoId: media.id } });
    res.json({ ok: true, mediaId: media.id, url: media.url });
  } catch (e) {
    console.error('POST /api/media/usuarios/:id/avatar error:', e);
    res.status(500).json({ error: 'Avatar upload failed', detail: String(e.message || e) });
  }
});

/**
 * POST /api/media/productos/:id/imagenes
 */
router.post('/productos/:id/imagenes', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file requerido' });
    if (!IMAGE_MIME.has(req.file.mimetype)) return res.status(415).json({ error: 'Tipo de archivo no permitido' });

    const productoId = Number(req.params.id);
    if (!Number.isFinite(productoId)) return res.status(400).json({ error: 'productoId inválido' });

    const { buffer, mimetype, originalname, size } = req.file;

    const { key, url } = await uploadToSupabase({
      buffer, mimetype,
      folder: `productos/${productoId}`,
      filename: (originalname || '').split('.')[0]?.slice(0, 40),
      visibility: 'public',
    });

    const media = await prisma.media.create({
      data: { provider: StorageProvider.SUPABASE, key, url, mime: mimetype, sizeBytes: size },
    });

    const existingCount = await prisma.productoImagen.count({ where: { productoId } });
    const isPrincipal = existingCount === 0;
    const orden = existingCount;

    const img = await prisma.productoImagen.create({
      data: { productoId, mediaId: media.id, url: media.url, isPrincipal, orden },
    });

    res.json({ ok: true, mediaId: media.id, url: media.url, productoImagenId: img.id, isPrincipal, orden });
  } catch (e) {
    console.error('POST /api/media/productos/:id/imagenes error:', e);
    res.status(500).json({ error: 'Producto imagen upload failed', detail: String(e.message || e) });
  }
});

/**
 * POST /api/media/variantes/:id/imagenes
 */
router.post('/variantes/:id/imagenes', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file requerido' });
    if (!IMAGE_MIME.has(req.file.mimetype)) return res.status(415).json({ error: 'Tipo de archivo no permitido' });

    const varianteId = Number(req.params.id);
    if (!Number.isFinite(varianteId)) return res.status(400).json({ error: 'varianteId inválido' });

    const variante = await prisma.variante.findUnique({ where: { id: varianteId }, select: { productoId: true } });
    if (!variante) return res.status(404).json({ error: 'Variante no existe' });

    const { buffer, mimetype, originalname, size } = req.file;

    const { key, url } = await uploadToSupabase({
      buffer, mimetype,
      folder: `productos/${variante.productoId}/variantes/${varianteId}`,
      filename: (originalname || '').split('.')[0]?.slice(0, 40),
      visibility: 'public',
    });

    const media = await prisma.media.create({
      data: { provider: StorageProvider.SUPABASE, key, url, mime: mimetype, sizeBytes: size },
    });

    const existingCount = await prisma.varianteImagen.count({ where: { varianteId } });
    const orden = existingCount;

    const vimg = await prisma.varianteImagen.create({
      data: { varianteId, mediaId: media.id, url: media.url, orden },
    });

    res.json({ ok: true, mediaId: media.id, url: media.url, varianteImagenId: vimg.id, orden });
  } catch (e) {
    console.error('POST /api/media/variantes/:id/imagenes error:', e);
    res.status(500).json({ error: 'Variante imagen upload failed', detail: String(e.message || e) });
  }
});

module.exports = router;

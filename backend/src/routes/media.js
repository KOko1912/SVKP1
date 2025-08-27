const express = require('express');
const multer = require('multer');
const { PrismaClient, StorageProvider } = require('@prisma/client');
const { uploadToSupabase } = require('../lib/uploadSupabase');

const prisma = new PrismaClient();
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5*1024*1024 } });

// POST /api/media?folder=usuarios/123
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido (file)' });
    const folder = (req.query.folder || 'misc').toString();
    const { key, url } = await uploadToSupabase({
      buffer: req.file.buffer, mimetype: req.file.mimetype,
      folder, filename: (req.file.originalname||'').split('.')[0]?.slice(0,40)
    });
    const media = await prisma.media.create({
      data: { provider: StorageProvider.SUPABASE, key, url, mime: req.file.mimetype, sizeBytes: req.file.size }
    });
    res.json({ ok: true, media });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Upload failed', detail: String(e.message||e) }); }
});

// POST /api/media/usuarios/:id/avatar
router.post('/usuarios/:id/avatar', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file requerido' });
    const userId = Number(req.params.id);
    const { key, url } = await uploadToSupabase({ buffer: req.file.buffer, mimetype: req.file.mimetype, folder: `usuarios/${userId}` });
    const media = await prisma.media.create({ data: { provider: StorageProvider.SUPABASE, key, url, mime: req.file.mimetype, sizeBytes: req.file.size } });
    await prisma.usuario.update({ where: { id: userId }, data: { fotoId: media.id } });
    res.json({ ok: true, mediaId: media.id, url: media.url });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Avatar upload failed', detail: String(e.message||e) }); }
});

// POST /api/media/productos/:id/imagenes
router.post('/productos/:id/imagenes', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file requerido' });
    const productoId = Number(req.params.id);
    const { key, url } = await uploadToSupabase({ buffer: req.file.buffer, mimetype: req.file.mimetype, folder: `productos/${productoId}` });
    const media = await prisma.media.create({ data: { provider: StorageProvider.SUPABASE, key, url, mime: req.file.mimetype, sizeBytes: req.file.size } });
    const img = await prisma.productoImagen.create({ data: { productoId, mediaId: media.id }});
    res.json({ ok: true, mediaId: media.id, url: media.url, productoImagenId: img.id });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Producto imagen upload failed', detail: String(e.message||e) }); }
});

module.exports = router;

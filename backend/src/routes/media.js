const express = require('express');
const multer = require('multer');
const { PrismaClient, StorageProvider } = require('@prisma/client');
const { uploadToSupabase } = require('../lib/uploadSupabase');

const prisma = new PrismaClient();
const router = express.Router();

// 5 MB, en memoria, ideal para pasar a Supabase
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// (opcional) Lista simple de mimes de imagen permitidos
const IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

/**
 * POST /api/media?folder=usuarios/123
 * Subida genérica a Supabase. Crea registro en tabla Media.
 * Devuelve { ok, media }
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido (file)' });

    const folder = (req.query.folder || 'misc').toString();
    const { buffer, mimetype, originalname, size } = req.file;

    const baseName = (originalname || '').split('.')[0]?.slice(0, 40) || 'file';
    const { key, url } = await uploadToSupabase({
      buffer,
      mimetype,
      folder,
      filename: baseName
    });

    const media = await prisma.media.create({
      data: {
        provider: StorageProvider.SUPABASE,
        key,
        url,
        mime: mimetype,
        sizeBytes: size
      }
    });

    res.json({ ok: true, media });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Upload failed', detail: String(e.message || e) });
  }
});

/**
 * POST /api/media/usuarios/:id/avatar
 * Sube avatar de usuario a Supabase, crea Media y asigna fotoId al usuario.
 * Devuelve { ok, mediaId, url }
 */
router.post('/usuarios/:id/avatar', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file requerido' });

    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'userId inválido' });

    const { buffer, mimetype, originalname, size } = req.file;

    const { key, url } = await uploadToSupabase({
      buffer,
      mimetype,
      folder: `usuarios/${userId}`,
      filename: (originalname || '').split('.')[0]?.slice(0, 40)
    });

    const media = await prisma.media.create({
      data: {
        provider: StorageProvider.SUPABASE,
        key,
        url,
        mime: mimetype,
        sizeBytes: size
      }
    });

    await prisma.usuario.update({
      where: { id: userId },
      data: { fotoId: media.id }
    });

    res.json({ ok: true, mediaId: media.id, url: media.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Avatar upload failed', detail: String(e.message || e) });
  }
});

/**
 * POST /api/media/productos/:id/imagenes
 * Sube imagen de producto a Supabase, crea Media y también ProductoImagen
 * con la URL pública (clave del fix).
 * Devuelve { ok, mediaId, url, productoImagenId, isPrincipal, orden }
 */
router.post('/productos/:id/imagenes', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file requerido' });

    // (opcional) Valida tipo de imagen
    if (!IMAGE_MIME.has(req.file.mimetype)) {
      return res.status(400).json({ error: 'Tipo de archivo no permitido' });
    }

    const productoId = Number(req.params.id);
    if (!Number.isFinite(productoId)) {
      return res.status(400).json({ error: 'productoId inválido' });
    }

    const { buffer, mimetype, originalname, size } = req.file;

    const { key, url } = await uploadToSupabase({
      buffer,
      mimetype,
      folder: `productos/${productoId}`,
      filename: (originalname || '').split('.')[0]?.slice(0, 40)
    });

    const media = await prisma.media.create({
      data: {
        provider: StorageProvider.SUPABASE,
        key,
        url,
        mime: mimetype,
        sizeBytes: size
      }
    });

    // Calcula orden e isPrincipal de forma automática:
    const existingCount = await prisma.productoImagen.count({ where: { productoId } });
    const isPrincipal = existingCount === 0;
    const orden = existingCount; // siguiente posición

    // ⚠️ FIX: Guardar también la URL pública en ProductoImagen
    const img = await prisma.productoImagen.create({
      data: {
        productoId,
        mediaId: media.id,
        url: media.url,
        isPrincipal,
        orden
      }
    });

    res.json({
      ok: true,
      mediaId: media.id,
      url: media.url,
      productoImagenId: img.id,
      isPrincipal,
      orden
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Producto imagen upload failed', detail: String(e.message || e) });
  }
});

module.exports = router;

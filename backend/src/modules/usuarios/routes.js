// backend/src/modules/usuarios/routes.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Busboy = require('busboy');
const prisma = require('../../config/db');

const {
  registrar,
  login,
  getUsuario,
  solicitarReset,
  resetear,
  cambiarContraseña,
    solicitarVendedor, 
} = require('./controller');

const { actualizarFotoUsuario } = require('./service');

const router = express.Router();

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });



// ----------- Solicitar ser vendedor -----------
router.post('/solicitar-vendedor', express.json(), solicitarVendedor);


// ---------- Rutas JSON ----------
router.post('/registro', express.json(), registrar);
router.post('/login', express.json(), login);

// 🔐 Recuperación y cambio de contraseña
router.post('/solicitar-reset', express.json(), solicitarReset);
router.post('/reset', express.json(), resetear);
router.post('/cambiar-contraseña', express.json(), cambiarContraseña);

// GET usuario por id
router.get('/:id', getUsuario);

// ---------- Subida de foto con Busboy ----------
router.post('/:id/foto', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!userId) return res.status(400).json({ error: 'ID inválido' });

    // Traer usuario (nombre para el archivo y fotoUrl anterior para borrar)
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { nombre: true, fotoUrl: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const nombreLimpio = String(user.nombre)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    const ct = (req.headers['content-type'] || '').toLowerCase();
    if (!ct.startsWith('multipart/form-data')) {
      return res.status(400).json({ error: 'Content-Type inválido. Usa multipart/form-data' });
    }

    const bb = Busboy({ headers: req.headers, limits: { files: 1, fileSize: 5 * 1024 * 1024 } });

    let savedFile = null;
    let gotFile = false;
    let parseError = null;
    const writeTasks = [];

    bb.on('file', (_fieldname, file, info) => {
      gotFile = true;
      const { filename, mimeType } = info;
      const isImage = /image\/(png|jpe?g|webp|gif)/i.test(mimeType);
      if (!isImage) {
        parseError = { status: 415, message: 'Tipo de archivo no permitido' };
        file.resume();
        return;
      }

      const ext = (path.extname(filename || '') || '').toLowerCase();
      const name = `${nombreLimpio}_${Date.now()}_${crypto.randomBytes(5).toString('hex')}${ext}`;
      const dest = path.join(UPLOADS_DIR, name);

      const ws = fs.createWriteStream(dest);
      file.pipe(ws);

      const p = new Promise((resolve, reject) => {
        ws.on('finish', () => { savedFile = { filename: name, path: dest, mimeType, originalname: filename }; resolve(); });
        ws.on('error', reject);
      });
      writeTasks.push(p);
    });

    bb.on('close', async () => {
      try { await Promise.all(writeTasks); } catch { return res.status(500).json({ error: 'No se pudo guardar la imagen' }); }

      if (parseError) return res.status(parseError.status).json({ error: parseError.message });
      if (!gotFile || !savedFile) return res.status(400).json({ error: 'No se envió archivo "foto"' });

      // borrar imagen anterior (opcional)
      try {
        if (user.fotoUrl && user.fotoUrl.startsWith('/uploads/')) {
          const prev = path.join(UPLOADS_DIR, path.basename(user.fotoUrl));
          if (fs.existsSync(prev)) fs.unlinkSync(prev);
        }
      } catch {}

      const fotoUrl = `/uploads/${savedFile.filename}`;
      let usuarioActualizado;
      try {
        usuarioActualizado = await actualizarFotoUsuario(userId, fotoUrl);
      } catch {
        return res.status(500).json({ error: 'No se pudo actualizar la foto en la base de datos' });
      }

      return res.json({ ok: true, usuario: usuarioActualizado });
    });

    req.pipe(bb);
  } catch {
    return res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;

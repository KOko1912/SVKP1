// backend/src/modules/admin/routes.js
const express = require('express');
const isAdmin = require('../../middlewares/isAdmin');
const prisma = require('../../config/db');
const crypto = require('crypto');

const router = express.Router();

const constEq = (a = '', b = '') => {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
};

// === NUEVO: /api/admin/login (sin isAdmin) ===
router.post('/login', (req, res) => {
  const pwd = String(req.body?.password || '');
  const adminSecret = process.env.ADMIN_SECRET || '';
  if (!adminSecret) {
    return res.status(500).json({ error: 'ADMIN_SECRET no configurado' });
  }
  // Compara la contraseña enviada con el ADMIN_SECRET
  if (pwd && constEq(pwd, adminSecret)) {
    return res.json({ ok: true, secret: adminSecret });
  }
  return res.status(401).json({ error: 'Credenciales inválidas' });
});

// Ping protegido
router.get('/hello', isAdmin, (_req, res) => {
  res.json({ ok: true, message: 'Hola, Admin 👑' });
});

/** Lista solicitudes pendientes */
router.get('/solicitudes-vendedor', isAdmin, async (_req, res, next) => {
  try {
    const rows = await prisma.usuario.findMany({
      where: { vendedorSolicitado: true, vendedor: false },
      select: {
        id: true,
        nombre: true,
        telefono: true,
        fechaCreacion: true,
        foto: { select: { url: true } },
      },
      orderBy: { id: 'asc' },
    });

    const lista = rows.map(u => ({
      id: u.id,
      nombre: u.nombre,
      telefono: u.telefono,
      fechaCreacion: u.fechaCreacion,
      fotoUrl: u.foto?.url || null,
    }));

    res.json({ ok: true, data: lista });
  } catch (err) {
    next(err);
  }
});

/** Aprobar solicitud */
router.post('/vendedores/:id/aprobar', isAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const u = await prisma.usuario.findUnique({ where: { id } });
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });

    await prisma.usuario.update({
      where: { id },
      data: { vendedor: true, vendedorSolicitado: false },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/** Rechazar solicitud */
router.post('/vendedores/:id/rechazar', isAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const u = await prisma.usuario.findUnique({ where: { id } });
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });

    await prisma.usuario.update({
      where: { id },
      data: { vendedorSolicitado: false },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/** Vendedores activos */
router.get('/vendedores-activos', isAdmin, async (_req, res, next) => {
  try {
    const rows = await prisma.usuario.findMany({
      where: { vendedor: true },
      select: {
        id: true,
        nombre: true,
        telefono: true,
        fechaCreacion: true,
        foto: { select: { url: true } },
      },
      orderBy: { id: 'asc' },
    });

    const lista = rows.map(u => ({
      id: u.id,
      nombre: u.nombre,
      telefono: u.telefono,
      fechaCreacion: u.fechaCreacion,
      fotoUrl: u.foto?.url || null,
    }));

    res.json({ ok: true, data: lista });
  } catch (err) {
    next(err);
  }
});

/** Cancelar modo vendedor */
router.post('/vendedores/:id/cancelar', isAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const u = await prisma.usuario.findUnique({ where: { id } });
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });

    await prisma.usuario.update({
      where: { id },
      data: { vendedor: false, vendedorSolicitado: false },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

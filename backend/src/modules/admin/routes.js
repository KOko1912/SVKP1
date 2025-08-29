// backend/src/modules/admin/routes.js
const express = require('express');
const isAdmin = require('../../middlewares/isAdmin');
const prisma = require('../../config/db');

const router = express.Router();

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
        fechaCreacion: true,      // <-- nombre real en el modelo
        foto: { select: { url: true } }, // relación Media (si existe)
      },
      orderBy: { id: 'asc' },
    });

    // Normalizamos para el frontend
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
        fechaCreacion: true,                 // <-- nombre real
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

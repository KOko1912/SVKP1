// backend/src/modules/usuarios/service.js
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const prisma = require('../../config/db');

// Crear usuario
exports.crearUsuario = async ({ nombre, telefono, contraseña }) => {
  if (!nombre || !telefono || !contraseña) {
    const e = new Error('nombre, telefono y contraseña son obligatorios');
    e.status = 400;
    throw e;
  }

  const yaExiste = await prisma.usuario.findUnique({ where: { telefono } });
  if (yaExiste) {
    const e = new Error('El teléfono ya está registrado');
    e.status = 409;
    throw e;
  }

  const hash = await bcrypt.hash(contraseña, 10);

  const usuario = await prisma.usuario.create({
    data: { nombre, telefono, contraseña: hash, fotoUrl: null, suscripciones: null },
    select: {
      id: true,
      nombre: true,
      telefono: true,
      fotoUrl: true,
      fechaCreacion: true,
      vendedor: true,
      vendedorSolicitado: true,
    },
  });

  return { usuario };
};

// Login
exports.loginUsuario = async ({ telefono, contraseña }) => {
  const usuario = await prisma.usuario.findUnique({ where: { telefono } });
  if (!usuario) {
    const e = new Error('Usuario no encontrado');
    e.status = 404;
    throw e;
  }

  const ok = await bcrypt.compare(contraseña, usuario.contraseña);
  if (!ok) {
    const e = new Error('Contraseña incorrecta');
    e.status = 401;
    throw e;
  }

  return {
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      telefono: usuario.telefono,
      fotoUrl: usuario.fotoUrl || null,
      fechaCreacion: usuario.fechaCreacion,
      vendedor: usuario.vendedor,
      vendedorSolicitado: usuario.vendedorSolicitado,
    },
  };
};

// Actualizar fotoUrl
exports.actualizarFotoUsuario = async (id, fotoUrl) => {
  return prisma.usuario.update({
    where: { id },
    data: { fotoUrl },
    select: {
      id: true,
      nombre: true,
      telefono: true,
      fotoUrl: true,
      fechaCreacion: true,
      vendedor: true,
      vendedorSolicitado: true,
    },
  });
};

// Obtener usuario por id
exports.obtenerUsuarioPorId = async (id) => {
  return prisma.usuario.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      telefono: true,
      fotoUrl: true,
      fechaCreacion: true,
      vendedor: true,
      vendedorSolicitado: true,
    },
  });
};

/* =============================
   🔐 Recuperación de contraseña
   ============================= */

// Crear token de reseteo (válido 15 min)
exports.crearTokenReseteo = async ({ telefono }) => {
  const usuario = await prisma.usuario.findUnique({ where: { telefono } });

  // Seguridad: no reveles si existe o no. Si no existe, devuelve null.
  if (!usuario) return null;

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

  await prisma.passwordResetToken.create({
    data: { token, usuarioId: usuario.id, expiresAt }
  });

  return { token, usuarioId: usuario.id, expiresAt };
};

// Resetear contraseña usando el token
exports.resetearConToken = async ({ token, nueva }) => {
  const prt = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { usuario: true }
  });

  // token inexistente, ya usado o expirado
  if (!prt || prt.used || prt.expiresAt < new Date()) return false;

  const hash = await bcrypt.hash(nueva, 10);

  await prisma.$transaction([
    prisma.usuario.update({
      where: { id: prt.usuarioId },
      data: { contraseña: hash }
    }),
    prisma.passwordResetToken.update({
      where: { token },
      data: { used: true }
    })
  ]);

  return true;
};

// Cambiar contraseña con la contraseña actual
exports.cambiarConActual = async ({ id, actual, nueva }) => {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) return false;

  const ok = await bcrypt.compare(actual, usuario.contraseña);
  if (!ok) return null; // contraseña actual no coincide

  const hash = await bcrypt.hash(nueva, 10);
  await prisma.usuario.update({ where: { id }, data: { contraseña: hash } });
  return true;
};

/* =============================
   🛍️ Vendedores
   ============================= */

// Solicitar ser vendedor (marca la intención)
exports.solicitarVendedor = async ({ id }) => {
  const u = await prisma.usuario.findUnique({ where: { id } });
  if (!u) return { ok: false, code: 'NOT_FOUND' };
  if (u.vendedor) return { ok: false, code: 'ALREADY_VENDOR' };
  if (u.vendedorSolicitado) return { ok: true, already: true };

  await prisma.usuario.update({
    where: { id },
    data: { vendedorSolicitado: true },
  });

  return { ok: true };
};

// backend/src/modules/usuarios/service.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../../config/db');

/* ============ helpers ============ */
// Prioriza el campo moderno:
const PASS_FIELDS = ['passwordHash', 'contrasena', 'contrasenia', 'password', 'contraseña'];

const PASS_SELECT = {
  id: true,
  nombre: true,
  telefono: true,
  fechaCreacion: true,
  updatedAt: true,
  vendedor: true,
  vendedorSolicitado: true,
  fotoId: true, // en el esquema nuevo ya no hay fotoUrl
};

const isHashed = (s) => typeof s === 'string' && /^\$2[aby]\$/.test(s);

async function hashPassword(plain) {
  return bcrypt.hash(String(plain), 10);
}

function getStoredPasswordFromUser(u) {
  if (!u) return null;
  if (typeof u.passwordHash === 'string') return u.passwordHash; // prioridad
  for (const k of PASS_FIELDS) {
    if (u[k] != null) return u[k];
  }
  return null;
}

async function tryCreateWithField(baseData, field, hash) {
  try {
    return await prisma.usuario.create({
      data: { ...baseData, [field]: hash },
      select: PASS_SELECT,
    });
  } catch (_) {
    return null;
  }
}

async function tryUpdatePassword(id, hash) {
  for (const f of PASS_FIELDS) {
    try {
      await prisma.usuario.update({ where: { id }, data: { [f]: hash } });
      return true;
    } catch (_) {}
  }
  return false;
}

/* ============ servicios ============ */

exports.crearUsuario = async (payload = {}) => {
  const { nombre, telefono } = payload;
  const plain =
    payload.password ??
    payload.contrasena ??
    payload['contraseña'] ??
    payload.contrasenia;

  if (!nombre || !telefono || !plain) {
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

  const hash = await hashPassword(plain);

  const baseData = { nombre, telefono, fotoId: null, suscripciones: null };

  let usuario = null;
  let lastErr = null;
  for (const f of PASS_FIELDS) {
    try {
      usuario = await tryCreateWithField(baseData, f, hash);
      if (usuario) break;
    } catch (e) { lastErr = e; }
  }
  if (!usuario) {
    const e = new Error('No se pudo crear el usuario (campo de contraseña no válido)');
    e.status = 500;
    e.cause = lastErr;
    throw e;
  }

  return { usuario };
};

exports.loginUsuario = async (payload = {}) => {
  const { telefono } = payload;
  const plain =
    payload.password ??
    payload.contrasena ??
    payload['contraseña'] ??
    payload.contrasenia;

  const usuario = await prisma.usuario.findUnique({ where: { telefono } });
  if (!usuario) {
    const e = new Error('Usuario no encontrado');
    e.status = 404;
    throw e;
  }

  const stored = getStoredPasswordFromUser(usuario);
  if (!stored) {
    const e = new Error('Contraseña no configurada');
    e.status = 401;
    throw e;
  }

  const ok = isHashed(stored)
    ? await bcrypt.compare(String(plain), String(stored))
    : String(plain) === String(stored ?? '');

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
      fechaCreacion: usuario.fechaCreacion,
      updatedAt: usuario.updatedAt,
      vendedor: usuario.vendedor,
      vendedorSolicitado: usuario.vendedorSolicitado,
      fotoUrl: null, // compat con frontend actual (usa placeholder)
    },
  };
};

// Ahora fotoId (en vez de fotoUrl)
exports.actualizarFotoUsuario = async (id, fotoId) => {
  const data = {};
  if (typeof fotoId === 'number') data.fotoId = fotoId;
  return prisma.usuario.update({
    where: { id },
    data,
    select: PASS_SELECT,
  });
};

exports.obtenerUsuarioPorId = async (id) => {
  const u = await prisma.usuario.findUnique({
    where: { id },
    select: PASS_SELECT,
  });
  if (!u) return null;
  return { ...u, fotoUrl: null };
};

/* ==== Reset de contraseña ==== */

exports.crearTokenReseteo = async ({ telefono }) => {
  const usuario = await prisma.usuario.findUnique({ where: { telefono } });
  if (!usuario) return null;

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { token, usuarioId: usuario.id, expiresAt },
  });

  return { token, usuarioId: usuario.id, expiresAt };
};

exports.resetearConToken = async ({ token, nueva }) => {
  const prt = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { usuario: true },
  });
  if (!prt || prt.used || prt.expiresAt < new Date()) return false;

  const hash = await hashPassword(nueva);
  const ok = await tryUpdatePassword(prt.usuarioId, hash);
  if (!ok) return false;

  await prisma.passwordResetToken.update({
    where: { token },
    data: { used: true },
  });

  return true;
};

exports.cambiarConActual = async ({ id, actual, nueva }) => {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) return false;

  const stored = getStoredPasswordFromUser(usuario);
  const ok = stored && (isHashed(stored)
    ? await bcrypt.compare(String(actual), String(stored))
    : String(actual) === String(stored ?? ''));

  if (!ok) return null;

  const hash = await hashPassword(nueva);
  return tryUpdatePassword(id, hash);
};

/* ==== Vendedor ==== */
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

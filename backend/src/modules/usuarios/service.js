// backend/src/modules/usuarios/service.js
const crypto = require('crypto');
let bcrypt;
try { bcrypt = require('bcryptjs'); } catch { bcrypt = null; }

const prisma = require('../../config/db');

/* ============ helpers ============ */
const PASS_FIELDS = ['contrasena', 'contrasenia', 'password', 'contraseña'];
const PASS_SELECT = {
  id: true,
  nombre: true,
  telefono: true,
  fotoUrl: true,
  fechaCreacion: true,
  vendedor: true,
  vendedorSolicitado: true,
};

const isHashed = (s) => typeof s === 'string' && s.startsWith('$2');
async function hashPassword(plain) {
  if (!bcrypt) throw new Error('bcryptjs no disponible');
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(String(plain), salt);
}
function getStoredPasswordFromUser(u) {
  for (const k of PASS_FIELDS) {
    if (u && u[k] != null) return u[k];
  }
  return null;
}
async function tryCreateWithField(baseData, field, hash) {
  try {
    const usuario = await prisma.usuario.create({
      data: { ...baseData, [field]: hash },
      select: PASS_SELECT,
    });
    return usuario;
  } catch (_) { return null; }
}
async function tryUpdatePassword(id, hash) {
  for (const f of PASS_FIELDS) {
    try {
      await prisma.usuario.update({ where: { id }, data: { [f]: hash } });
      return true;
    } catch (_) { /* probar siguiente */ }
  }
  return false;
}

/* ============ servicios ============ */

// Crear usuario
exports.crearUsuario = async (payload = {}) => {
  const { nombre, telefono } = payload;
  const plain =
    payload.contrasena ??
    payload['contraseña'] ??
    payload.password;

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

  const baseData = { nombre, telefono, fotoUrl: null, suscripciones: null };

  // intentamos con varios nombres de columna para ser compatibles
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

// Login
exports.loginUsuario = async (payload = {}) => {
  const { telefono } = payload;
  const plain =
    payload.contrasena ??
    payload['contraseña'] ??
    payload.password;

  const usuario = await prisma.usuario.findUnique({ where: { telefono } });
  if (!usuario) {
    const e = new Error('Usuario no encontrado');
    e.status = 404;
    throw e;
  }

  const stored = getStoredPasswordFromUser(usuario);
  let ok = false;

  if (stored && isHashed(stored) && bcrypt) {
    ok = await bcrypt.compare(String(plain), String(stored));
  } else {
    ok = String(plain) === String(stored ?? '');
  }

  if (!ok) {
    const e = new Error('Contraseña incorrecta');
    e.status = 401;
    throw e;
  }

  return { usuario: {
    id: usuario.id,
    nombre: usuario.nombre,
    telefono: usuario.telefono,
    fotoUrl: usuario.fotoUrl || null,
    fechaCreacion: usuario.fechaCreacion,
    vendedor: usuario.vendedor,
    vendedorSolicitado: usuario.vendedorSolicitado,
  }}; 
};

// Actualizar fotoUrl
exports.actualizarFotoUsuario = async (id, fotoUrl) => {
  return prisma.usuario.update({
    where: { id },
    data: { fotoUrl },
    select: PASS_SELECT,
  });
};

// Obtener usuario por id
exports.obtenerUsuarioPorId = async (id) => {
  return prisma.usuario.findUnique({
    where: { id },
    select: PASS_SELECT,
  });
};

/* =============================
   🔐 Recuperación de contraseña
   ============================= */

// Crear token de reseteo (válido 15 min)
exports.crearTokenReseteo = async ({ telefono }) => {
  const usuario = await prisma.usuario.findUnique({ where: { telefono } });
  if (!usuario) return null;

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

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
  if (!prt || prt.used || prt.expiresAt < new Date()) return false;

  const hash = await hashPassword(nueva);

  // actualizamos la contraseña probando posibles campos
  const ok = await tryUpdatePassword(prt.usuarioId, hash);
  if (!ok) return false;

  await prisma.passwordResetToken.update({
    where: { token },
    data: { used: true }
  });

  return true;
};

// Cambiar contraseña con la contraseña actual
exports.cambiarConActual = async ({ id, actual, nueva }) => {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) return false;

  const stored = getStoredPasswordFromUser(usuario);
  let ok = false;

  if (stored && isHashed(stored) && bcrypt) {
    ok = await bcrypt.compare(String(actual), String(stored));
  } else {
    ok = String(actual) === String(stored ?? '');
  }
  if (!ok) return null;

  const hash = await hashPassword(nueva);
  return tryUpdatePassword(id, hash);
};

/* =============================
   🛍️ Vendedores
   ============================= */
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

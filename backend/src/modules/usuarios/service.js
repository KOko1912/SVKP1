// backend/src/modules/usuarios/service.js
const crypto = require('crypto');
let bcrypt;
try { bcrypt = require('bcryptjs'); } catch { bcrypt = null; }

const prisma = require('../../config/db');

/* ================= helpers ================= */

const getPlainPassword = (src = {}) =>
  src?.password ?? src?.contrasena ?? src?.contrasenia ?? src?.['contraseña'] ?? null;

async function hashPassword(plain) {
  if (!bcrypt) throw new Error('bcryptjs no disponible');
  return bcrypt.hash(String(plain), 10);
}

async function mediaIdFromUrlMaybe(url) {
  if (!url) return null;
  // ¿Existe ya un Media con esa URL?
  const existing = await prisma.media.findFirst({ where: { url } });
  if (existing) return existing.id;

  // En caso de necesitar crearlo (compatibilidad)
  const provider = /supabase\.co\/storage/i.test(url) ? 'SUPABASE' : 'LOCAL';
  const key = crypto.createHash('md5').update(url).digest('hex');
  const m = await prisma.media.create({
    data: { provider, key, url, createdAt: new Date(), updatedAt: new Date() },
  });
  return m.id;
}

async function attachFotoUrl(user) {
  if (!user?.fotoId) return { ...user, fotoUrl: null };
  const m = await prisma.media.findUnique({ where: { id: user.fotoId }, select: { url: true } });
  return { ...user, fotoUrl: m?.url || null };
}

/* ================= servicios ================= */

// Crear usuario (guarda SIEMPRE en passwordHash)
exports.crearUsuario = async (payload = {}) => {
  const nombre   = String(payload.nombre || '').trim();
  const telefono = String(payload.telefono || '').trim();
  const plain    = getPlainPassword(payload);

  if (!nombre || !telefono || !plain) {
    const e = new Error('nombre, telefono y contraseña son obligatorios');
    e.status = 400;
    throw e;
  }

  const dup = await prisma.usuario.findUnique({ where: { telefono } });
  if (dup) {
    const e = new Error('El teléfono ya está registrado');
    e.status = 409;
    throw e;
  }

  const passwordHash = await hashPassword(plain);

  const usuario = await prisma.usuario.create({
    data: { nombre, telefono, passwordHash },
    select: {
      id: true, nombre: true, telefono: true, fotoId: true,
      vendedor: true, vendedorSolicitado: true,
      fechaCreacion: true, updatedAt: true,
    },
  });

  const withFoto = await attachFotoUrl(usuario);
  return { usuario: withFoto };
};

// Login (compara contra passwordHash)
exports.loginUsuario = async (payload = {}) => {
  const telefono = String(payload.telefono || '').trim();
  const plain    = getPlainPassword(payload) ?? '';

  const user = await prisma.usuario.findUnique({
    where: { telefono },
    select: {
      id: true, nombre: true, telefono: true, fotoId: true,
      vendedor: true, vendedorSolicitado: true,
      fechaCreacion: true, updatedAt: true, passwordHash: true,
    },
  });

  if (!user) {
    const e = new Error('Usuario no encontrado');
    e.status = 404;
    throw e;
  }

  const ok = !!user.passwordHash && bcrypt
    ? await bcrypt.compare(String(plain), String(user.passwordHash))
    : false;

  if (!ok) {
    const e = new Error('Contraseña incorrecta');
    e.status = 401;
    throw e;
  }

  const { passwordHash, ...safe } = user;
  const withFoto = await attachFotoUrl(safe);
  return { usuario: withFoto };
};

// Actualizar foto (acepta mediaId o url)
exports.actualizarFotoUsuario = async (id, foto) => {
  let fotoId = null;
  if (typeof foto === 'number' || /^\d+$/.test(String(foto))) {
    fotoId = Number(foto);
  } else if (typeof foto === 'string') {
    fotoId = await mediaIdFromUrlMaybe(foto);
  }

  const u = await prisma.usuario.update({
    where: { id: Number(id) },
    data: { fotoId, updatedAt: new Date() },
    select: {
      id: true, nombre: true, telefono: true, fotoId: true,
      vendedor: true, vendedorSolicitado: true,
      fechaCreacion: true, updatedAt: true,
    },
  });

  return attachFotoUrl(u);
};

// Obtener usuario por id
exports.obtenerUsuarioPorId = async (id) => {
  const u = await prisma.usuario.findUnique({
    where: { id: Number(id) },
    select: {
      id: true, nombre: true, telefono: true, fotoId: true,
      vendedor: true, vendedorSolicitado: true,
      fechaCreacion: true, updatedAt: true,
    },
  });
  if (!u) return null;
  return attachFotoUrl(u);
};

/* ============ 🔐 Recuperación de contraseña ============ */

// Crear token de reseteo (válido 15m)
exports.crearTokenReseteo = async ({ telefono }) => {
  const usuario = await prisma.usuario.findUnique({ where: { telefono: String(telefono || '').trim() } });
  if (!usuario) return null;

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { token, usuarioId: usuario.id, expiresAt },
  });

  return { token, usuarioId: usuario.id, expiresAt };
};

// Resetear contraseña usando token
exports.resetearConToken = async ({ token, nueva }) => {
  const prt = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { usuario: { select: { id: true } } },
  });
  if (!prt || prt.used || prt.expiresAt < new Date()) return false;

  const hash = await hashPassword(nueva);
  await prisma.usuario.update({
    where: { id: prt.usuario.id },
    data: { passwordHash: hash, updatedAt: new Date() },
  });
  await prisma.passwordResetToken.update({ where: { token }, data: { used: true } });
  return true;
};

// Cambiar contraseña con la actual
exports.cambiarConActual = async ({ id, actual, nueva }) => {
  const u = await prisma.usuario.findUnique({
    where: { id: Number(id) },
    select: { id: true, passwordHash: true },
  });
  if (!u?.passwordHash || !bcrypt) return false;

  const ok = await bcrypt.compare(String(actual), String(u.passwordHash));
  if (!ok) return null;

  const hash = await hashPassword(nueva);
  await prisma.usuario.update({
    where: { id: Number(id) },
    data: { passwordHash: hash, updatedAt: new Date() },
  });
  return true;
};

/* ============ 🛍️ Vendedores ============ */
exports.solicitarVendedor = async ({ id }) => {
  const u = await prisma.usuario.findUnique({ where: { id: Number(id) } });
  if (!u) return { ok: false, code: 'NOT_FOUND' };
  if (u.vendedor) return { ok: false, code: 'ALREADY_VENDOR' };
  if (u.vendedorSolicitado) return { ok: true, already: true };

  await prisma.usuario.update({
    where: { id: Number(id) },
    data: { vendedorSolicitado: true, updatedAt: new Date() },
  });
  return { ok: true };
};

// backend/src/modules/usuarios/service.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../../config/db');

/* ============ helpers ============ */
// Prioriza el campo moderno mapeado a la columna "contraseña"
const PASS_FIELDS = ['passwordHash', 'contrasena', 'contrasenia', 'password', 'contraseña'];

// Siempre seleccionar la relación foto para poder exponer fotoUrl al frontend
const PASS_SELECT = {
  id: true,
  nombre: true,
  telefono: true,
  fechaCreacion: true,
  updatedAt: true,
  vendedor: true,
  vendedorSolicitado: true,
  fotoId: true,
  foto: { select: { id: true, url: true, provider: true, key: true } },
};

// Hash dummy para comparación constante cuando no hay usuario/contraseña
// (hash de la palabra "dummy")
const DUMMY_HASH = '$2a$10$C0nSTAntTimePAdDingE2e1y/5iB8P5y2dS5QzQ8pF9F2F8cs5NHu';

const isHashed = (s) => typeof s === 'string' && /^\$2[aby]\$/.test(s);
async function hashPassword(plain) { return bcrypt.hash(String(plain), 10); }

function getStoredPasswordFromUser(u) {
  if (!u) return null;
  if (typeof u.passwordHash === 'string') return u.passwordHash; // prioridad
  for (const k of PASS_FIELDS) {
    if (u[k] != null) return u[k];
  }
  return null;
}

function mapUsuario(u) {
  if (!u) return null;
  return {
    id: u.id,
    nombre: u.nombre,
    telefono: u.telefono,
    fechaCreacion: u.fechaCreacion,
    updatedAt: u.updatedAt,
    vendedor: u.vendedor,
    vendedorSolicitado: u.vendedorSolicitado,
    // compat con frontend: exponemos fotoUrl derivado de la relación
    fotoUrl: u.foto?.url || null,
  };
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

  return { usuario: mapUsuario(usuario) };
};

exports.loginUsuario = async (payload = {}) => {
  const telRaw = payload.telefono ?? '';
  const telNorm = String(telRaw).replace(/\D/g, ''); // sólo dígitos
  const plain =
    payload.password ??
    payload.contrasena ??
    payload['contraseña'] ??
    payload.contrasenia;

  if (!telNorm && !telRaw) {
    const e = new Error('Teléfono es requerido');
    e.status = 400;
    throw e;
  }
  if (!plain) {
    const e = new Error('Contraseña es requerida');
    e.status = 400;
    throw e;
  }

  // 1) Intentamos encontrar por distintas variantes (con/sin símbolos)
  const usuario = await prisma.usuario.findFirst({
    where: {
      OR: [
        { telefono: telNorm },
        { telefono: String(telRaw) },
      ],
    },
  });

  // 2) Comparación en tiempo constante (aunque no exista usuario)
  const stored = getStoredPasswordFromUser(usuario);
  const toCompare = stored ?? DUMMY_HASH;

  const ok = isHashed(toCompare)
    ? await bcrypt.compare(String(plain), String(toCompare))
    : String(plain) === String(toCompare ?? '');

  if (!usuario || !ok) {
    const e = new Error('Credenciales inválidas');
    e.status = 401;
    throw e;
  }

  // 3) Si la contraseña estaba en texto plano y coincidió, migramos a bcrypt
  if (!isHashed(stored)) {
    try {
      const newHash = await hashPassword(plain);
      await tryUpdatePassword(usuario.id, newHash);
    } catch (_) {}
  }

  // 4) Traemos con SELECT consistente para exponer fotoUrl
  const u = await prisma.usuario.findUnique({ where: { id: usuario.id }, select: PASS_SELECT });
  return { usuario: mapUsuario(u) };
};

// Actualizar foto de perfil (recibe mediaId)
exports.actualizarFotoUsuario = async (id, mediaId) => {
  const data = {};
  if (typeof mediaId === 'number') data.fotoId = mediaId;

  const u = await prisma.usuario.update({
    where: { id },
    data,
    select: PASS_SELECT,
  });
  return mapUsuario(u);
};

exports.obtenerUsuarioPorId = async (id) => {
  const u = await prisma.usuario.findUnique({
    where: { id },
    select: PASS_SELECT,
  });
  return mapUsuario(u);
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

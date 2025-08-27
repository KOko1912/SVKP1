// backend/src/modules/usuarios/controller.js
const jwt = require('jsonwebtoken');
const {
  crearUsuario,
  loginUsuario,
  obtenerUsuarioPorId,
  crearTokenReseteo,
  resetearConToken,
  cambiarConActual,
  solicitarVendedor,
} = require('./service');

const SECRET = process.env.JWT_SECRET || process.env.ADMIN_SECRET || 'dev-secret';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Registro
const registrar = async (req, res, next) => {
  try {
    // compatibilidad: si llega "password", lo mapeamos a "contraseña"
    if (req.body?.password && !req.body?.contraseña) req.body.contraseña = req.body.password;
    const result = await crearUsuario(req.body);
    return res.json(result);
  } catch (err) { return next(err); }
};

// Login (alias /api/usuarios/login)
const login = async (req, res, next) => {
  try {
    const { telefono, contraseña, password } = req.body || {};
    const pass =
      contraseña ||
      password ||
      req.body?.contrasena ||
      req.body?.contrasenia ||
      req.body?.['contraseña'];

    if (!telefono || !pass) {
      return res.status(400).json({ error: 'telefono y contraseña son requeridos' });
    }

    const { usuario } = await loginUsuario({ telefono, contraseña: pass, password: pass });

    const token = jwt.sign(
      { sub: usuario.id, tel: usuario.telefono, v: usuario.vendedor ? 1 : 0 },
      SECRET,
      { expiresIn: EXPIRES_IN }
    );

    return res.json({ usuario, token });
  } catch (err) { return next(err); }
};

// GET /api/usuarios/:id
const getUsuario = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const usuario = await obtenerUsuarioPorId(id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    return res.json({ usuario });
  } catch (err) { return next(err); }
};

/* =============================
   🔐 Recuperación de contraseña
   ============================= */

// POST /api/usuarios/solicitar-reset  { telefono }
const solicitarReset = async (req, res, next) => {
  try {
    const { telefono } = req.body || {};
    if (!telefono) return res.status(400).json({ error: 'telefono es requerido' });

    const data = await crearTokenReseteo({ telefono });

    // Respuesta neutra
    if (!data) return res.json({ ok: true, mensaje: 'Si el usuario existe, se generó un token.' });

    return res.json({ ok: true, ...data });
  } catch (err) { return next(err); }
};

// POST /api/usuarios/reset  { token, nueva }
const resetear = async (req, res, next) => {
  try {
    const { token, nueva } = req.body || {};
    if (!token || !nueva) return res.status(400).json({ error: 'token y nueva son requeridos' });

    const ok = await resetearConToken({ token, nueva });
    if (!ok) return res.status(400).json({ error: 'Token inválido o expirado' });

    return res.json({ ok: true });
  } catch (err) { return next(err); }
};

// POST /api/usuarios/cambiar-contraseña  { id, actual, nueva }
const cambiarContraseña = async (req, res, next) => {
  try {
    const { id, actual, nueva } = req.body || {};
    if (!id || !actual || !nueva) {
      return res.status(400).json({ error: 'id, actual y nueva son requeridos' });
    }

    const result = await cambiarConActual({ id: Number(id), actual, nueva });
    if (result === false) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (result === null)  return res.status(401).json({ error: 'La contraseña actual no coincide' });

    return res.json({ ok: true });
  } catch (err) { return next(err); }
};

/* =============================
   🛍️ Solicitud de vendedor
   ============================= */

// POST /api/usuarios/solicitar-vendedor  { id }
const solicitarVendedorCtrl = async (req, res, next) => {
  try {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id es requerido' });

    const r = await solicitarVendedor({ id: Number(id) });
    if (!r.ok && r.code === 'NOT_FOUND')   return res.status(404).json({ error: 'Usuario no encontrado' });
    if (!r.ok && r.code === 'ALREADY_VENDOR') return res.status(400).json({ error: 'El usuario ya es vendedor' });

    return res.json({ ok: true, already: !!r.already });
  } catch (err) { return next(err); }
};

module.exports = {
  registrar,
  login,
  getUsuario,
  solicitarReset,
  resetear,
  cambiarContraseña,
  solicitarVendedor: solicitarVendedorCtrl,
};

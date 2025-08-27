// backend/src/modules/auth/controller.js
const jwt = require('jsonwebtoken');
const { loginUsuario } = require('../usuarios/service');

const SECRET = process.env.JWT_SECRET || process.env.ADMIN_SECRET || 'dev-secret';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

exports.login = async (req, res, next) => {
  try {
    const { telefono, password, contrasena } = req.body || {};
    const plain =
      password ??
      contrasena ??
      req.body?.['contraseña'] ??
      req.body?.contrasenia;

    if (!telefono || !plain) {
      return res.status(400).json({ error: 'Teléfono y contraseña son requeridos' });
    }

    // loginUsuario te devuelve { usuario }
    const { usuario } = await loginUsuario({ telefono, password: plain, contrasena: plain });

    // Firmamos el token aquí mismo (sin helpers extra)
    const token = jwt.sign(
      { sub: usuario.id, tel: usuario.telefono, v: usuario.vendedor ? 1 : 0 },
      SECRET,
      { expiresIn: EXPIRES_IN }
    );

    return res.json({ usuario, token });
  } catch (err) {
    return next(err);
  }
};

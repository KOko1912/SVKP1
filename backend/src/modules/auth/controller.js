const jwt = require('jsonwebtoken');
const { loginUsuario } = require('../usuarios/service');

const SECRET = process.env.JWT_SECRET || process.env.ADMIN_SECRET || 'dev-secret';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

exports.login = async (req, res, next) => {
  try {
    const { telefono, tel, phone, celular, password, contrasena } = req.body || {};
    const telRaw = telefono ?? tel ?? phone ?? celular ?? '';
    const telNorm = String(telRaw).replace(/\D/g, ''); // ← sólo dígitos

    const plain =
      password ??
      contrasena ??
      req.body?.['contraseña'] ??
      req.body?.contrasenia ??
      '';

    if (!telNorm || !plain) {
      return res.status(400).json({ error: 'Teléfono y contraseña son requeridos' });
    }

    const { usuario } = await loginUsuario({ telefono: telNorm, password: plain });

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

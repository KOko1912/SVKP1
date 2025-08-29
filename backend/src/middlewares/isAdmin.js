// backend/src/middlewares/isAdmin.js
const crypto = require('crypto');

function constEq(a = '', b = '') {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

module.exports = function isAdmin(req, res, next) {
  const got =
    req.headers['x-admin-secret'] ||
    req.headers['X-Admin-Secret'] ||
    req.query.adminSecret ||
    '';

  const expected = process.env.ADMIN_SECRET; // ← SIN fallback

  if (expected && got && constEq(got, expected)) return next();
  return res.status(401).json({ error: 'UNAUTHORIZED: admin requerido' });
};

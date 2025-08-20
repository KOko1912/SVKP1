// backend/src/middleware/isAdmin.js
module.exports = function isAdmin(req, res, next) {
  const header = req.header('x-admin-secret');
  const expected = process.env.ADMIN_SECRET || 'super_admin_123';
  if (header && header === expected) return next();
  return res.status(401).json({ error: 'No autorizado (admin requerido)' });
};

// backend/src/modules/sdkadmin/service.js
const bcrypt = require('bcrypt');
const prisma = require('../../config/db');

const ADMIN_ID = 1;

// Info (no revela hash)
exports.info = async () => {
  const row = await prisma.sDKADMIN.findUnique({ where: { id: ADMIN_ID } }).catch(() => null);
  if (!row) return { exists: false, createdAt: null, updatedAt: null };
  return { exists: true, createdAt: row.createdAt, updatedAt: row.updatedAt };
};

// Verificar contraseña
exports.verify = async ({ password }) => {
  const row = await prisma.sDKADMIN.findUnique({ where: { id: ADMIN_ID } });
  if (!row) return false;
  return bcrypt.compare(password, row.passwordHash);
};

// Cambiar contraseña
exports.change = async ({ current, next }) => {
  const row = await prisma.sDKADMIN.findUnique({ where: { id: ADMIN_ID } });
  if (!row) {
    const e = new Error('SDKADMIN no inicializado en la base de datos');
    e.status = 400;
    throw e;
  }
  const ok = await bcrypt.compare(current, row.passwordHash);
  if (!ok) return null;

  const hash = await bcrypt.hash(next, 10);
  await prisma.sDKADMIN.update({
    where: { id: ADMIN_ID },
    data: { passwordHash: hash },
  });
  return true;
};

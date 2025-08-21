// src/config/db.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error'], // Solo errores
});

module.exports = prisma;
  
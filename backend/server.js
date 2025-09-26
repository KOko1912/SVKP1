// backend/server.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = require('./src/app'); // tu app ya configurada (cors, rutas, etc.)

/* === Rutas base seguras respecto a este archivo === */
const ROOT = path.resolve(__dirname);
const PUBLIC_DIR = path.resolve(
  ROOT,
  process.env.PUBLIC_DIR || 'public'
);

const DIR_TIENDA = path.isAbsolute(process.env.TIENDA_UPLOADS_DIR || '')
  ? process.env.TIENDA_UPLOADS_DIR
  : path.join(ROOT, process.env.TIENDA_UPLOADS_DIR || path.join('public', 'TiendaUploads'));

const DIR_USER = path.isAbsolute(process.env.USER_UPLOADS_DIR || '')
  ? process.env.USER_UPLOADS_DIR
  : path.join(ROOT, process.env.USER_UPLOADS_DIR || path.join('public', 'UserUploads'));

/* === Crea carpetas requeridas (Render permite escritura en runtime) === */
[PUBLIC_DIR, DIR_TIENDA, DIR_USER].forEach((d) => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
    console.log(`📂 Created directory: ${d}`);
  }
});

/* === Estáticos === */
app.use(express.static(PUBLIC_DIR));

/* === Rutas de uploads de tienda === */
const tiendaUploadsRoutes = require('./src/modules/tienda/routes.uploads');
app.use('/api/tienda', tiendaUploadsRoutes);

/* === Healthcheck (para Render) === */
app.get('/health', (_req, res) => res.json({ ok: true }));

/* === Arranque === */
const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0'; // importante en Render

app.listen(PORT, HOST, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📦 PUBLIC_DIR: ${PUBLIC_DIR}`);
  console.log(`🗂  TIENDA_UPLOADS_DIR: ${DIR_TIENDA}`);
  console.log(`🗂  USER_UPLOADS_DIR:   ${DIR_USER}`);
  console.log(`🔐 ADMIN_SECRET: ${process.env.ADMIN_SECRET ? '[set]' : '[missing]'}`);
  console.log(`🌐 FRONTEND_URL(S): ${process.env.FRONTEND_URL || process.env.FRONTEND_URLS || '(not set)'}`);
});

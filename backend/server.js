// backend/server.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const app = require('./src/app');

// === Paths / carpetas ===============================
const PUBLIC_DIR = path.resolve(process.cwd(), process.env.PUBLIC_DIR || 'public');

// Por compatibilidad, si no defines env, guardamos en public/TiendaUploads y public/UserUploads
const DIR_TIENDA = path.isAbsolute(process.env.TIENDA_UPLOADS_DIR || '')
  ? process.env.TIENDA_UPLOADS_DIR
  : path.join(process.cwd(), process.env.TIENDA_UPLOADS_DIR || path.join('public', 'TiendaUploads'));

const DIR_USER = path.isAbsolute(process.env.USER_UPLOADS_DIR || '')
  ? process.env.USER_UPLOADS_DIR
  : path.join(process.cwd(), process.env.USER_UPLOADS_DIR || path.join('public', 'UserUploads'));

// Crea carpetas requeridas
[PUBLIC_DIR, DIR_TIENDA, DIR_USER].forEach((d) => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
    console.log(`📂 Created directory: ${d}`);
  }
});

// === Servir estáticos desde /public =================
app.use(require('express').static(PUBLIC_DIR));

// === Rutas de subida de branding de tienda =========
const tiendaUploadsRoutes = require('./src/modules/tienda/routes.uploads');
app.use('/api/tienda', tiendaUploadsRoutes);

// === Arranque ======================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📦 PUBLIC_DIR: ${PUBLIC_DIR}`);
  console.log(`🗂  TIENDA_UPLOADS_DIR: ${DIR_TIENDA}`);
  console.log(`🗂  USER_UPLOADS_DIR:   ${DIR_USER}`);
  console.log(`🔐 ADMIN_SECRET: ${process.env.ADMIN_SECRET ? '[set]' : '[missing]'}`);
  console.log(`🌐 FRONTEND_URL(S): ${process.env.FRONTEND_URL || process.env.FRONTEND_URLS || 'http://localhost:5173'}`);
});

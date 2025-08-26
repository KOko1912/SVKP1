// backend/server.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

// Crear carpetas de subidas si no existen
const dirUser   = process.env.USER_UPLOADS_DIR   || path.join(process.cwd(), 'uploads');
const dirTienda = process.env.TIENDA_UPLOADS_DIR || path.join(process.cwd(), 'TiendaUploads');

[dirUser, dirTienda].forEach((d) => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
    console.log(`📂 Created directory: ${d}`);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`🔐 ADMIN_SECRET: ${process.env.ADMIN_SECRET ? '[set]' : '[missing]'}`);
  console.log(`🌐 FRONTEND_URL(S): ${process.env.FRONTEND_URL || process.env.FRONTEND_URLS || 'http://localhost:5173'}`);
});

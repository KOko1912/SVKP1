// backend/src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

/* =========================
   Configuración base
   ========================= */
const FRONTEND_URLS = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Opciones CORS (incluye preflight completo)
const corsOptions = {
  origin: (origin, cb) => {
    // Permite sin Origin (health checks, curl) y los orígenes declarados
    if (!origin || FRONTEND_URLS.includes(origin)) return cb(null, true);
    return cb(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS','HEAD'],
  allowedHeaders: [
    'Content-Type','Authorization','X-Requested-With','Accept','Origin','x-user-id',
  ],
  exposedHeaders: ['Content-Disposition'],
  optionsSuccessStatus: 204,
};

// CORS SIEMPRE antes de las rutas:
app.use(cors(corsOptions));
// Preflight para todo
app.options(/.*/, cors(corsOptions));

if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

/* =========================
   Archivos estáticos
   ========================= */
const tiendaUploadsDir = process.env.TIENDA_UPLOADS_DIR || path.join(process.cwd(), 'TiendaUploads');
const userUploadsDir   = process.env.USER_UPLOADS_DIR   || path.join(process.cwd(), 'uploads');

for (const d of [tiendaUploadsDir, userUploadsDir]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

// Nota: el CORS global ya está montado arriba; no hace falta setHeaders aquí.
app.use('/TiendaUploads', express.static(tiendaUploadsDir, { maxAge: '7d', index: false }));
app.use('/uploads',       express.static(userUploadsDir,   { maxAge: '7d', index: false }));

/* =========================
   Rutas (Routers)
   ========================= */
const authRoutes           = require('./modules/auth/routes');
const usuariosRoutes       = require('./modules/usuarios/routes');
const adminRoutes          = require('./modules/admin/routes');
const sdkadminRoutes       = require('./modules/sdkadmin/routes');
const tiendaRoutes         = require('./modules/tienda/routes');
const productosRoutes      = require('./modules/productos/routes');
const categoriasRoutes     = require('./modules/categorias/routes');
const uploadProductoRoutes = require('./modules/productos/upload');

// Auth en múltiples prefijos para compat con el front
app.use('/api/auth',    authRoutes);
app.use('/auth',        authRoutes);
app.use('/api/v1/auth', authRoutes);

// Resto de módulos
app.use('/api/usuarios',      usuariosRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/sdkadmin',      sdkadminRoutes);
app.use('/api/tienda',        tiendaRoutes);
app.use('/api/v1/productos',  productosRoutes);
app.use('/api/v1/categorias', categoriasRoutes);
app.use('/api/v1/upload',     uploadProductoRoutes);

/* =========================
   Utilidades
   ========================= */
app.get('/health', (_req, res) => res.json({
  ok: true,
  tiendaUploadsDir,
  userUploadsDir,
  origins: FRONTEND_URLS,
}));

/* =========================
   404 y manejo de errores
   ========================= */
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const isDev = process.env.NODE_ENV !== 'production';
  console.error('❌ Error:', err);
  res.status(status).json({
    error: err.message || 'Error interno',
    ...(isDev ? { stack: err.stack } : {}),
  });
});

module.exports = app;

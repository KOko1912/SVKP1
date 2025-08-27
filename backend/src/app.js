// backend/src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

/* =========================
   Configuración base
   ========================= */
const FRONTEND_URLS = (
  process.env.FRONTEND_URLS ||
  process.env.FRONTEND_URL ||
  'http://localhost:5173'
)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const allowOrigin = (origin) =>
  !origin || FRONTEND_URLS.includes(origin);

/* =========================
   CORS
   ========================= */
const corsOptions = {
  origin(origin, cb) {
    if (allowOrigin(origin)) return cb(null, true);
    return cb(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-User-Id',
    'x-user-id',
    'X-Admin-Secret',
    'x-admin-secret',
  ],
  exposedHeaders: ['Content-Disposition'],
  optionsSuccessStatus: 204,
};

// CORS SIEMPRE antes de rutas
app.use(cors(corsOptions));
// Preflight para todo
app.options(/.*/, cors(corsOptions));

// Vary para caches intermedios y early return OPTIONS
app.use((req, res, next) => {
  res.header('Vary', 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

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

// Nota: express.static no tiene acceso a req en setHeaders.
// Para evitar problemas de carga de imágenes desde distintos orígenes
// habilitamos origen * y políticas cross-origin seguras.
const setStaticHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Secret, x-admin-secret');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable'); // ~7d
};

app.use('/TiendaUploads', express.static(tiendaUploadsDir, { maxAge: '7d', setHeaders: setStaticHeaders }));
app.use('/uploads',       express.static(userUploadsDir,   { maxAge: '7d', setHeaders: setStaticHeaders }));

/* =========================
   Media (Supabase/otros)
   ========================= */
const mediaRouter = require('./routes/media');
app.use('/api/media', mediaRouter);

/* =========================
   Rutas (Routers)
   ========================= */
const authRoutes           = require('./modules/auth/routes');
const usuariosRoutes       = require('./modules/usuarios/routes');
const adminRoutes          = require('./modules/admin/routes');
const sdkadminRoutes       = require('./modules/sdkadmin/routes');
const tiendaRoutes         = require('./modules/tienda/routes');   // singular
const tiendasRoutes        = require('./modules/tiendas/routes');  // plural (búsqueda pública)
const productosRoutes      = require('./modules/productos/routes');
const categoriasRoutes     = require('./modules/categorias/routes');
const uploadProductoRoutes = require('./modules/productos/upload');

// 🔐 Alias directo para asegurar que /api/auth/login use el controller correcto
// (lo definimos ANTES de montar el router genérico de /api/auth)
const authCtrl = require('./modules/auth/controller');
app.post('/api/auth/login', authCtrl.login);

// Resto de routers
app.use('/api/auth',          authRoutes);       // otras rutas de auth (si existen)
app.use('/api/usuarios',      usuariosRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/sdkadmin',      sdkadminRoutes);
app.use('/api/tienda',        tiendaRoutes);
app.use('/api/tiendas',       tiendasRoutes);    // 🔎 /api/tiendas/search
app.use('/api/v1/productos',  productosRoutes);
app.use('/api/v1/categorias', categoriasRoutes);
app.use('/api/v1/upload',     uploadProductoRoutes);

/* =========================
   Utilidades
   ========================= */
app.get('/health', (_req, res) => res.json({
  ok: true,
  origins: FRONTEND_URLS,
  tiendaUploadsDir,
  userUploadsDir,
}));

/* =========================
   404
   ========================= */
app.use((req, res, next) => {
  if (req.method === 'GET') return res.status(404).json({ error: 'Not Found' });
  next();
});

/* =========================
   Manejo de errores
   ========================= */
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

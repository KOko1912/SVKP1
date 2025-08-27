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
  process.env.FRONTEND_URL  ||
  'http://localhost:5173'
)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// CORS – incluye el header del admin y preflight global
const corsOptions = {
  origin(origin, cb) {
    // Permite llamadas desde tu dev server y requests sin origin (curl/postman)
    if (!origin || FRONTEND_URLS.includes(origin)) return cb(null, true);
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
    'X-Admin-Secret',  // ← necesario para /api/admin/*
    'x-admin-secret',  // por si el navegador normaliza distinto
  ],
  exposedHeaders: ['Content-Disposition'],
  optionsSuccessStatus: 204,
};

// CORS SIEMPRE antes de rutas
app.use(cors(corsOptions));
// Preflight para todo
app.options(/.*/, cors(corsOptions));

// Vary para caches intermedios y early return OPTIONS (seguro)
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

// Nota: express.static no recibe req en setHeaders, así que fijamos al primer origin
const STATIC_ALLOW_ORIGIN = FRONTEND_URLS[0] || '*';
const setStaticHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', STATIC_ALLOW_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Secret, x-admin-secret');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
};

app.use('/TiendaUploads', express.static(tiendaUploadsDir, { maxAge: '7d', setHeaders: setStaticHeaders }));
app.use('/uploads',       express.static(userUploadsDir,   { maxAge: '7d', setHeaders: setStaticHeaders }));



/*imagenes superbase*/
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

app.use('/api/auth',          authRoutes);       // login
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
  staticAllowOrigin: STATIC_ALLOW_ORIGIN,
  tiendaUploadsDir,
  userUploadsDir,
}));


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

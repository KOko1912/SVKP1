// backend/src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

/* =========================
   Configuración base
   ========================= */
function normalizeOrigin(u = '') {
  try {
    const url = new URL(u);
    // normaliza quitando slash final
    return `${url.origin}`;
  } catch {
    return String(u || '').replace(/\/+$/, '');
  }
}

const FRONTEND_URLS = (
  process.env.FRONTEND_URLS ||
  process.env.FRONTEND_URL ||
  'http://localhost:5173'
)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .map(normalizeOrigin);

// Permite patrones con * (ej. https://*.onrender.com)
function originMatches(origin) {
  if (!origin) return true; // Postman / SSR
  const o = normalizeOrigin(origin);

  return FRONTEND_URLS.some(entry => {
    const e = String(entry);
    if (e === '*') return true;
    if (!e.includes('*')) return e === o;
    // wildcard simple: https://*.dominio.com
    const esc = e.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace('\\*', '.*');
    const re = new RegExp(`^${esc}$`, 'i');
    return re.test(o);
  });
}

const allowOrigin = (origin) => originMatches(origin);

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

// Proxy (Render) configurable
const TRUST_PROXY = Number(process.env.TRUST_PROXY || 0);
if (TRUST_PROXY) app.set('trust proxy', TRUST_PROXY);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

/* =========================
   Archivos estáticos locales (solo lectura)
   ========================= */
const tiendaUploadsDir = process.env.TIENDA_UPLOADS_DIR || path.join(process.cwd(), 'TiendaUploads');
const userUploadsDir   = process.env.USER_UPLOADS_DIR   || path.join(process.cwd(), 'uploads');

for (const d of [tiendaUploadsDir, userUploadsDir]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

// Cabeceras para servir imágenes de forma segura desde cualquier origen
const setStaticHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // público (solo GET)
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Secret, x-admin-secret');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // permitir <img> desde otros origins
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
const tiendaRoutes         = require('./modules/tienda/routes');        // tienda (general)
const tiendasRoutes        = require('./modules/tiendas/routes');       // plural (búsqueda pública)
const productosRoutes      = require('./modules/productos/routes');
const categoriasRoutes     = require('./modules/categorias/routes');
const uploadProductoRoutes = require('./modules/productos/upload');
const tiendaUploadsRoutes  = require('./modules/tienda/routes.uploads'); // subidas de tienda

// 🔐 Alias directo para asegurar que /api/auth/login use el controller correcto
// (lo definimos ANTES de montar el router genérico de /api/auth)
const authCtrl = require('./modules/auth/controller');
app.post('/api/auth/login', authCtrl.login);

// Routers principales
app.use('/api/auth',          authRoutes);
app.use('/api/usuarios',      usuariosRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/sdkadmin',      sdkadminRoutes);
app.use('/api/tienda',        tiendaRoutes);              // ← solo el router general
app.use('/api/tiendas',       tiendasRoutes);             // 🔎 /api/tiendas/search
app.use('/api/v1/productos',  productosRoutes);
app.use('/api/v1/categorias', categoriasRoutes);

// Subidas específicas de TIENDA en un subprefijo dedicado (evita doble mount)
// Asegúrate de que dentro de routes.uploads uses rutas relativas: '/', '/banner', etc.
app.use('/api/tienda/uploads', tiendaUploadsRoutes);

// Fallback de SUBIDA LOCAL (disco):
// - En producción queda DESACTIVADO por defecto para no usar el disco efímero de Render.
// - Actívalo explícitamente con ENABLE_LOCAL_UPLOADS=1 si lo necesitas.
const enableLocalUploads = process.env.ENABLE_LOCAL_UPLOADS === '1' || process.env.NODE_ENV !== 'production';
if (enableLocalUploads) {
  app.use('/api/v1/upload', uploadProductoRoutes);
} else {
  // en prod sin fallback: evitar que front use este endpoint por accidente
  app.use('/api/v1/upload', (_req, res) => {
    res.status(410).json({ error: 'Local uploads deshabilitado en producción. Usa /api/media (Supabase).' });
  });
}

/* Pedidos (WhatsApp checkout) */
const ordersRoutes = require('./modules/pedidos/routes');
app.use('/api/orders', ordersRoutes);

/* =========================
   Utilidades
   ========================= */
app.get('/health', (_req, res) => res.json({
  ok: true,
  origins: FRONTEND_URLS,
  tiendaUploadsDir,
  userUploadsDir,
  nodeEnv: process.env.NODE_ENV || 'development',
  trustProxy: TRUST_PROXY,
  localUploadsEnabled: enableLocalUploads,
  version: process.env.APP_VERSION || null,
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
  const isProd = process.env.NODE_ENV === 'production';
  console.error('❌ Error:', err);
  res.status(status).json({
    error: err.message || 'Error interno',
    ...(isProd ? {} : { stack: err.stack }),
  });
});

module.exports = app;

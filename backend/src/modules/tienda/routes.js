// backend/src/modules/tienda/routes.js
const express = require('express');
const crypto = require('crypto');
const prisma = require('../../config/db');

const router = express.Router();

/* =========================
   Helpers
   ========================= */
function getUserId(req) {
  const raw = req.headers['x-user-id'] || req.headers['X-User-Id'] || '';
  if (raw) return Number(raw);
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(\d+)$/i);
  return m ? Number(m[1]) : null;
}

function slugify(str = '') {
  return (
    String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || 'mi-tienda'
  );
}

// Normaliza una referencia tipo SKU de tienda
function normalizeSkuRef(v) {
  if (!v) return null;
  const s = String(v).toUpperCase().replace(/[^A-Z0-9-]+/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '');
  if (!s) return null;
  return s.slice(0, 64);
}

// Convierte string/array a lista de tokens en minúsculas, deduplicada y con longitud acotada
function normalizeTokenArray(value, { maxItems = 20, maxLen = 40 } = {}) {
  let arr = [];
  if (Array.isArray(value)) arr = value;
  else if (typeof value === 'string') arr = value.split(/[,\s]+/);

  const out = [];
  const seen = new Set();
  for (const raw of arr) {
    const t = String(raw || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
    if (!t) continue;
    const clipped = t.slice(0, maxLen);
    if (!seen.has(clipped)) {
      seen.add(clipped);
      out.push(clipped);
      if (out.length >= maxItems) break;
    }
  }
  return out;
}

function randomId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/* =========================
   Normalización homeLayout
   ========================= */
const LAYOUT_MODES = { TEMPLATE_6x20: 'TEMPLATE_6x20', FREE: 'FREE' };

// templates que el backend acepta
const ALLOWED_TEMPLATES = new Set([
  'classic', 'cyberpunk', 'brujil', 'auto', 'fastfood', 'japanese', 'fashion', 'vintage'
]);

function clamp(min, max, v) {
  const n = Number.isFinite(+v) ? +v : min;
  return Math.min(max, Math.max(min, n));
}
function normalizeGs(gs, type, cols) {
  const defaults =
    {
      hero: { w: 6, h: 2, minW: 2, minH: 2 },
      featured: { w: 4, h: 2, minW: 2, minH: 2 },
      grid: { w: 6, h: 2, minW: 4, minH: 2 },
      category: { w: 3, h: 2, minW: 2, minH: 2 },
      product: { w: 2, h: 2, minW: 1, minH: 1 },
      banner: { w: 6, h: 2, minW: 3, minH: 1 },
      logo: { w: 3, h: 3, minW: 2, minH: 2 },
    }[type] || { w: 4, h: 2, minW: 1, minH: 1 };

  return {
    x: clamp(0, cols - 1, gs?.x ?? 0),
    y: Math.max(0, gs?.y ?? 0),
    w: clamp(1, cols, gs?.w ?? defaults.w),
    h: Math.max(1, gs?.h ?? defaults.h),
    minW: gs?.minW ?? defaults.minW,
    minH: gs?.minH ?? defaults.minH,
  };
}
function clampByMode(gs, type, mode, cols) {
  const g = { ...(gs || {}) };
  if (mode !== LAYOUT_MODES.Template_6x20 && mode !== LAYOUT_MODES.TEMPLATE_6x20) return g;
  if (type === 'grid' || type === 'hero') {
    g.w = cols; g.h = Math.max(2, g.h || 2); g.x = 0;
  }
  if (type === 'featured') {
    g.w = clamp(2, cols, g.w || 4);
    g.h = clamp(1, 3, g.h || 2);
  }
  if (type === 'banner') {
    g.w = clamp(3, cols, g.w || 6);
    g.h = clamp(1, 3, g.h || 2);
  }
  if (type === 'product') {
    g.w = clamp(1, cols, g.w || 2);
    g.h = clamp(1, 3, g.h || 2);
  }
  if (type === 'category') {
    g.w = clamp(2, cols, g.w || 3);
    g.h = clamp(1, 3, g.h || 2);
  }
  if (type === 'logo') {
    g.w = clamp(2, cols, g.w || 3);
    g.h = clamp(2, 4, g.h || 3);
  }
  return g;
}

/**
 * ¡Ahora preserva meta.templateId!
 */
function normalizeHomeLayout(raw) {
  let meta = { mode: LAYOUT_MODES.FREE, templateId: undefined };
  let blocks = [];

  if (Array.isArray(raw)) {
    blocks = raw;
  } else if (raw && typeof raw === 'object') {
    const modeRaw = raw?.meta?.mode;
    const tplRaw  = raw?.meta?.templateId;
    meta = {
      mode: modeRaw === LAYOUT_MODES.TEMPLATE_6x20 ? LAYOUT_MODES.TEMPLATE_6x20 : LAYOUT_MODES.FREE,
      templateId: typeof tplRaw === 'string' ? tplRaw.toLowerCase().trim() : undefined,
    };
    blocks = Array.isArray(raw.blocks) ? raw.blocks : [];
  }

  const cols = meta.mode === LAYOUT_MODES.TEMPLATE_6x20 ? 6 : 12;
  const normalized = blocks.map((b, i) => {
    const type = String(b?.type || '').trim() || 'custom';
    const id = String(b?.id || `${type}-${i + 1}`);
    const z = Number.isFinite(+b?.z) ? +b.z : i + 1;
    const gs1 = clampByMode(b?.gs || {}, type, meta.mode, cols);
    const gs = normalizeGs(gs1, type, cols);
    const props = b?.props && typeof b.props === 'object' ? b.props : {};
    return { id, type, z, gs, props };
  });
  return { meta, blocks: normalized };
}

/* =========================
   Presenter
   ========================= */
function presentTienda(tienda) {
  return {
    ...tienda,
    portadaUrl: tienda.portada?.url || null,
    logoUrl: tienda.logo?.url || null,
    bannerPromoUrl: tienda.banner?.url || null,
  };
}

/* =========================
   GET /api/tienda/me
   ========================= */
router.get('/me', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    let tienda = await prisma.tienda.findFirst({
      where: { usuarioId: userId },
      include: { portada: true, logo: true, banner: true },
    });

    if (!tienda) {
      tienda = await prisma.tienda.create({
        data: {
          usuarioId: userId,
          nombre: 'mi-tienda',
          slug: slugify(`mi-tienda-${userId}`),
          colorPrincipal: 'linear-gradient(135deg, #6d28d9, #c026d3)',
          moneda: 'MXN',
          seoKeywords: [],
          aliases: [],
          homeTemplate: 'classic',
        },
        include: { portada: true, logo: true, banner: true },
      });
    }

    res.json(presentTienda(tienda));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo obtener la tienda' });
  }
});

/* =========================
   PUT/PATCH /api/tienda/me
   ========================= */
router.put('/me', updateMe);
router.patch('/me', updateMe);

async function updateMe(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const ALLOWED = new Set([
      'nombre','descripcion','categoria','subcategorias','telefonoContacto','email','horario',
      'metodosPago','redes','envioCobertura','envioCosto','envioTiempo','devoluciones',
      'colorPrincipal','seoKeywords','seoDescripcion','homeLayout','homeTemplate','moneda',
      'ciudad','pais','whatsapp','skuRef','aliases','ubicacionUrl'
    ]);

    const raw = Object.assign({}, req.body || {});
    const data = {};
    for (const k of Object.keys(raw)) if (ALLOWED.has(k)) data[k] = raw[k];

    // Carga la tienda actual (para fallback de template)
    const current = await prisma.tienda.findFirst({ where: { usuarioId: userId } });

    // Normaliza/parsea layout y conserva templateId
    let layoutObj;
    if (data.homeLayout !== undefined) {
      layoutObj = normalizeHomeLayout(data.homeLayout);
      data.homeLayout = layoutObj;
    }

    if (data.seoKeywords !== undefined) data.seoKeywords = normalizeTokenArray(data.seoKeywords, { maxItems: 30, maxLen: 40 });
    if (data.aliases !== undefined) data.aliases = normalizeTokenArray(data.aliases, { maxItems: 30, maxLen: 40 });
    if (data.subcategorias !== undefined) data.subcategorias = normalizeTokenArray(data.subcategorias, { maxItems: 20, maxLen: 40 });
    if (data.metodosPago !== undefined) data.metodosPago = normalizeTokenArray(data.metodosPago, { maxItems: 15, maxLen: 20 });
    if (data.email !== undefined) data.email = String(data.email || '').trim() || null;
    if (data.skuRef !== undefined) data.skuRef = normalizeSkuRef(data.skuRef);
    if (data.ubicacionUrl !== undefined) data.ubicacionUrl = String(data.ubicacionUrl || '').trim() || null;

    // === Nuevo: resolver homeTemplate ===
    const tplFromBody = typeof raw.homeTemplate === 'string' ? raw.homeTemplate.toLowerCase().trim() : '';
    const tplFromMeta = layoutObj?.meta?.templateId ? String(layoutObj.meta.templateId).toLowerCase().trim() : '';
    const currentTpl  = current?.homeTemplate ? String(current.homeTemplate).toLowerCase() : 'classic';

    let finalTemplate = currentTpl;
    if (ALLOWED_TEMPLATES.has(tplFromBody))      finalTemplate = tplFromBody;
    else if (ALLOWED_TEMPLATES.has(tplFromMeta)) finalTemplate = tplFromMeta;

    data.homeTemplate = finalTemplate;

    // UPSERT
    let updated = await prisma.tienda.upsert({
      where: { usuarioId: userId },
      create: {
        usuarioId: userId,
        nombre: data.nombre || 'mi-tienda',
        slug: slugify(`mi-tienda-${userId}`),
        colorPrincipal: 'linear-gradient(135deg, #6d28d9, #c026d3)',
        moneda: 'MXN',
        seoKeywords: [],
        aliases: [],
        homeTemplate: finalTemplate,
        ...data,
      },
      update: data,
      include: { portada: true, logo: true, banner: true },
    });

    // si cambió el nombre y aún no está publicada ni con slug manual, ajusta slug
    if (current && data.nombre && data.nombre !== current.nombre) {
      if (!current.isPublished && (!current.slug || current.slug.trim() === '')) {
        const base = slugify(data.nombre);
        let slug = base, i = 1;
        while (await prisma.tienda.findFirst({ where: { slug, NOT: { id: updated.id } }, select: { id: true } })) {
          slug = `${base}-${++i}`;
        }
        updated = await prisma.tienda.update({
          where: { id: updated.id },
          data: { slug },
          include: { portada: true, logo: true, banner: true },
        });
      }
    }

    res.json(presentTienda(updated));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo actualizar la tienda' });
  }
}

/* =========================
   GET /api/tienda/public/:slug
   ========================= */
router.get('/public/:slug', async (req, res) => {
  try {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    if (!slug) return res.status(400).json({ error: 'Slug inválido' });

    const tienda = await prisma.tienda.findFirst({
      where: { slug, isPublished: true },
      include: { portada: true, logo: true, banner: true },
    });
    if (!tienda) return res.status(404).json({ error: 'Tienda no publicada o no existe' });

    res.json(presentTienda(tienda));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo cargar la tienda pública' });
  }
});

/* =========================
   NUEVOS ENDPOINTS PÚBLICOS
   ========================= */
async function findPublicTienda(where) {
  return prisma.tienda.findFirst({
    where: { isPublished: true, ...where },
    include: { portada: true, logo: true, banner: true },
  });
}

router.get('/public/by-id/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id inválido' });

    const tienda = await findPublicTienda({ id });
    if (!tienda) return res.status(404).json({ error: 'Tienda no publicada o no existe' });

    res.json(presentTienda(tienda));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo cargar la tienda pública (id)' });
  }
});

router.get('/public/uuid/:uuid', async (req, res) => {
  try {
    const uuid = String(req.params.uuid || '').trim();
    if (!uuid) return res.status(400).json({ error: 'UUID inválido' });

    const tienda = await findPublicTienda({ publicUuid: uuid });
    if (!tienda) return res.status(404).json({ error: 'Tienda no publicada o no existe' });

    res.json(presentTienda(tienda));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo cargar la tienda pública (uuid)' });
  }
});

/* =========================
   PUT /api/tienda/publicar
   ========================= */
router.put('/publicar', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const tienda = await prisma.tienda.findFirst({ where: { usuarioId: userId } });
    if (!tienda) return res.status(404).json({ error: 'No tienes tienda' });

    if (tienda.isPublished && tienda.slug) {
      return res.status(409).json({ error: 'La tienda ya fue publicada y el slug no se puede cambiar.' });
    }

    const publish = Boolean(req.body?.publish);
    if (!publish) return res.status(400).json({ error: 'publish debe ser true' });

    const desired = slugify(req.body?.slug || tienda.slug || tienda.nombre || 'mi-tienda');
    let slug = desired, i = 1;
    while (await prisma.tienda.findFirst({ where: { slug, NOT: { id: tienda.id } }, select: { id: true } })) {
      slug = `${desired}-${++i}`;
    }

    const publicUuid = tienda.publicUuid || randomId();

    const updated = await prisma.tienda.update({
      where: { id: tienda.id },
      data: { slug, isPublished: true, publishedAt: new Date(), publicUuid },
      select: { id: true, slug: true, isPublished: true, publishedAt: true, publicUuid: true },
    });

    res.json({ ok: true, tienda: updated });
  } catch (e) {
    console.error(e);
    if (e.code === 'P2002') return res.status(409).json({ error: 'Slug ocupado, intenta con otro' });
    res.status(500).json({ error: 'No se pudo publicar la tienda' });
  }
});

module.exports = router;

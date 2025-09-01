// backend/src/modules/pedidos/routes.js
const express = require('express');
const { randomUUID } = require('crypto');
const prisma = require('../../config/db');
const router = express.Router();

/* ========================== Helpers ========================== */
const num = (n, d = 0) => {
  const x = Number(n);
  return Number.isFinite(x) ? x : d;
};
const toTitle = (s) => (s || '').toString().trim();
const safePhone = (s) => (s || '').toString().replace(/\D/g, '').slice(0, 20) || null;

async function buildBuyerFromUser(userId) {
  if (!userId) return {};
  const u = await prisma.usuario.findUnique({
    where: { id: Number(userId) },
    select: { id: true, nombre: true, telefono: true },
  });
  if (!u) return {};
  return {
    buyerUserId: u.id,
    buyerName: u.nombre || '',
    buyerPhone: u.telefono || '',
    buyerEmail: null,
  };
}

function normalizeOrderForVendor(p) {
  const items = (p.items || []).map((it) => ({
    id: it.id,
    productoId: it.productoId,
    varianteId: it.varianteId,
    nombre: it.nombre,
    cantidad: it.cantidad,
    total: it.total ?? 0,
    opciones: it.opciones,
  }));

  const totals = {
    subTotal: p.subTotal ?? 0,
    shippingCost: p.shippingCost ?? 0,
    total: p.total ?? 0,
    currency: p.currency || 'MXN',
  };

  return {
    id: p.id,
    token: p.publicToken,
    tiendaId: p.tiendaId,
    status: p.status,
    paymentStatus: p.paymentStatus,
    paymentMethod: p.paymentMethod,
    createdAt: p.createdAt,
    requestedAt: p.requestedAt,
    requested: p.requested || false,
    decidedAt: p.decidedAt || null,

    buyerUserId: p.buyerUserId ?? null,
    buyerName: p.buyerName || '',
    buyerPhone: p.buyerPhone || '',
    buyerEmail: p.buyerEmail || null,

    proofMediaId: p.proofMediaId ?? null,

    items,
    totals,

    tienda: p.tienda
      ? {
          id: p.tienda.id,
          nombre: p.tienda.nombre,
          telefonoContacto: p.tienda.telefonoContacto || null,
          logo: p.tienda.logo ? { url: p.tienda.logo.url || null } : null,
        }
      : null,
  };
}

/* ================== 1) Intento de pedido ================== */
router.post('/intent', async (req, res) => {
  try {
    const tiendaId   = num(req.body?.tiendaId);
    const productoId = num(req.body?.productoId);
    const varianteId = req.body?.varianteId != null ? num(req.body?.varianteId) : null;
    const cantidad   = Math.max(1, num(req.body?.cantidad, 1));
    const channelRaw = String(req.body?.channel || 'WHATSAPP').toUpperCase();

    if (!tiendaId || !productoId) {
      return res.status(400).json({ error: 'tiendaId y productoId son requeridos' });
    }

    // Precio (centavos)
    let precioCents = 0;
    let nombreItem = `Producto ${productoId}`;
    let opciones = null;

    const producto = await prisma.producto.findUnique({
      where: { id: productoId },
      select: { nombre: true, precio: true },
    });
    if (producto) {
      nombreItem = producto.nombre || nombreItem;
      const mayor = Number(producto.precio ?? 0);
      precioCents = Math.round(mayor * 100);
    }

    if (varianteId) {
      const v = await prisma.variante.findUnique({
        where: { id: varianteId },
        select: { nombre: true, precio: true, opciones: true },
      });
      if (v) {
        nombreItem = v.nombre || nombreItem;
        opciones   = v.opciones || null;
        const mayor = Number(v.precio ?? 0);
        precioCents = Math.round(mayor * 100);
      }
    }

    const totalLinea = Math.max(0, precioCents) * cantidad;
    const subTotal   = totalLinea;
    const shipping   = 0;
    const total      = subTotal + shipping;

    const publicToken = randomUUID();

    const pedido = await prisma.pedido.create({
      data: {
        publicToken,
        tiendaId,
        status:        'PENDIENTE',
        paymentStatus: 'VERIFICANDO',
        paymentMethod: 'TRANSFERENCIA',
        channel:       channelRaw,

        subTotal,
        shippingCost: shipping,
        total,
        currency: 'MXN',

        buyerName:  'Cliente',
        buyerPhone: '',
        buyerEmail: null,

        items: {
          create: [{
            productoId,
            varianteId,
            nombre: nombreItem,
            opciones,
            precioUnitario: Math.max(0, precioCents),
            cantidad,
            total: totalLinea,
          }],
        },
      },
      include: { items: true },
    });

    return res.json({ ok: true, id: pedido.id, token: pedido.publicToken });
  } catch (e) {
    console.error('POST /orders/intent error:', e);
    return res.status(500).json({ error: 'No se pudo crear el intento' });
  }
});

/* ================== 2) Vista pública por token ================== */
router.get('/public/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '');
    const p = await prisma.pedido.findFirst({
      where: { publicToken: token },
      include: {
        items: true,
        tienda: {
          select: {
            id: true,
            nombre: true,
            telefonoContacto: true,
            logo: { select: { url: true } },
          },
        },
      },
    });
    if (!p) return res.status(404).json({ error: 'Pedido no encontrado' });
    return res.json(normalizeOrderForVendor(p));
  } catch (e) {
    console.error('GET /public/:token error:', e);
    return res.status(500).json({ error: 'Error al cargar el pedido' });
  }
});

/* Registrar comprobante */
router.post('/public/:token/proof', async (req, res) => {
  try {
    const token = String(req.params.token || '');
    const mediaId = num(req.body?.mediaId);
    if (!mediaId) return res.status(400).json({ error: 'mediaId requerido' });

    const p = await prisma.pedido.findFirst({ where: { publicToken: token } });
    if (!p) return res.status(404).json({ error: 'Pedido no encontrado' });

    await prisma.pedido.update({
      where: { id: p.id },
      data: { proofMediaId: mediaId },
    });
    return res.json({ ok: true });
  } catch (e) {
    console.error('POST /public/:token/proof error:', e);
    return res.status(500).json({ error: 'No se pudo registrar comprobante' });
  }
});

/* Solicitar revisión */
router.post('/public/:token/request', async (req, res) => {
  try {
    const token = String(req.params.token || '');
    const p = await prisma.pedido.findFirst({ where: { publicToken: token } });
    if (!p) return res.status(404).json({ error: 'Pedido no encontrado' });

    await prisma.pedido.update({
      where: { id: p.id },
      data: { requested: true, requestedAt: new Date() },
    });

    return res.json({ ok: true, position: null, positionMessage: 'Pronto serás atendido' });
  } catch (e) {
    console.error('POST /public/:token/request error:', e);
    return res.status(500).json({ error: 'No se pudo solicitar revisión' });
  }
});

/* ================== 3) Adjuntar usuario / actualizar comprador ================== */
router.post('/public/:token/attach-user', async (req, res) => {
  try {
    const token  = String(req.params.token || '');
    const userId = Number(req.headers['x-user-id'] || req.body?.userId || 0) || null;
    const phone  = safePhone(req.body?.phone);

    const p = await prisma.pedido.findFirst({ where: { publicToken: token } });
    if (!p) return res.status(404).json({ error: 'Pedido no encontrado' });

    const patch = {};
    if (userId) Object.assign(patch, await buildBuyerFromUser(userId));
    if (phone && !patch.buyerPhone) patch.buyerPhone = phone;

    if (!Object.keys(patch).length) return res.json({ ok: true, unchanged: true, orderId: p.id });

    const upd = await prisma.pedido.update({
      where: { id: p.id },
      data: patch,
      select: { id: true, buyerUserId: true, buyerName: true, buyerEmail: true, buyerPhone: true },
    });

    return res.json({ ok: true, orderId: upd.id, buyer: upd });
  } catch (e) {
    console.error('POST /public/:token/attach-user error:', e);
    return res.status(500).json({ error: 'Failed to attach user' });
  }
});

router.post('/:id/attach-user', async (req, res) => {
  try {
    const id     = num(req.params.id);
    const userId = Number(req.headers['x-user-id'] || req.body?.userId || 0) || null;
    const phone  = safePhone(req.body?.phone);

    const p = await prisma.pedido.findUnique({ where: { id } });
    if (!p) return res.status(404).json({ error: 'Pedido no encontrado' });

    const patch = {};
    if (userId) Object.assign(patch, await buildBuyerFromUser(userId));
    if (phone && !patch.buyerPhone) patch.buyerPhone = phone;

    if (!Object.keys(patch).length) return res.json({ ok: true, unchanged: true, orderId: p.id });

    const upd = await prisma.pedido.update({
      where: { id },
      data: patch,
      select: { id: true, buyerUserId: true, buyerName: true, buyerEmail: true, buyerPhone: true },
    });

    return res.json({ ok: true, orderId: upd.id, buyer: upd });
  } catch (e) {
    console.error('POST /:id/attach-user error:', e);
    return res.status(500).json({ error: 'Failed to attach user' });
  }
});

router.patch('/:id/buyer', async (req, res) => {
  try {
    const id = num(req.params.id);
    const { name, email, phone } = req.body || {};

    const data = {};
    if (name  != null) data.buyerName  = toTitle(name);
    if (email != null) data.buyerEmail = String(email || '').trim() || null;
    if (phone != null) data.buyerPhone = safePhone(phone);

    if (!Object.keys(data).length) return res.json({ ok: true, unchanged: true });

    const upd = await prisma.pedido.update({
      where: { id },
      data,
      select: { id: true, buyerName: true, buyerEmail: true, buyerPhone: true },
    });

    return res.json({ ok: true, orderId: upd.id, buyer: upd });
  } catch (e) {
    console.error('PATCH /orders/:id/buyer error:', e);
    return res.status(500).json({ error: 'Failed to update buyer' });
  }
});

/* ================== 4) GET por id ================== */
router.get('/:id', async (req, res) => {
  try {
    const id = num(req.params.id);
    const p = await prisma.pedido.findUnique({
      where: { id },
      include: {
        items: true,
        tienda: { select: { id: true, nombre: true, telefonoContacto: true, logo: { select: { url: true } } } },
      },
    });
    if (!p) return res.status(404).json({ error: 'Pedido no encontrado' });
    return res.json(normalizeOrderForVendor(p));
  } catch (e) {
    console.error('GET /orders/:id error:', e);
    return res.status(500).json({ error: 'Error al cargar el pedido' });
  }
});

/* ================== 5) Bandeja del vendedor ================== */
router.get('/vendor/requests', async (req, res) => {
  try {
    const tiendaId = num(req.query.tiendaId);
    if (!tiendaId) return res.status(400).json({ error: 'tiendaId requerido' });

    const statusList = String(req.query.status || 'PENDIENTE,EN_PROCESO')
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const ALLOWED = new Set(['PENDIENTE', 'EN_PROCESO', 'CONFIRMADA', 'ENVIADA', 'ENTREGADA', 'CANCELADA']);
    const wanted  = statusList.filter(s => ALLOWED.has(s));
    const whereStatus = wanted.length ? { in: wanted } : undefined;

    const pedidos = await prisma.pedido.findMany({
      where: { tiendaId, ...(whereStatus ? { status: whereStatus } : {}) },
      orderBy: [{ requestedAt: 'asc' }, { createdAt: 'asc' }],
      include: {
        items: true,
        tienda: { select: { id: true, nombre: true, telefonoContacto: true, logo: { select: { url: true } } } },
      },
    });

    return res.json(pedidos.map(normalizeOrderForVendor));
  } catch (e) {
    console.error('GET /vendor/requests error:', e);
    return res.status(500).json({ error: 'No se pudo cargar' });
  }
});

/* ================== 6) Ingresos del vendedor ================== */
/**
 * GET /api/orders/vendor/income?tiendaId=1&from=iso&to=iso&paymentStatus=PAGADA&status=EN_PROCESO,CONFIRMADA,ENVIADA,ENTREGADA
 * - Filtra por createdAt (rango opcional)
 * - Filtra por paymentStatus (default: PAGADA)
 * - Filtra por status (lista permitida)
 */
router.get('/vendor/income', async (req, res) => {
  try {
    const tiendaId = num(req.query.tiendaId);
    if (!tiendaId) return res.status(400).json({ error: 'tiendaId requerido' });

    const from = req.query.from ? new Date(req.query.from) : null;
    const to   = req.query.to   ? new Date(req.query.to)   : null;

    const statusList = String(req.query.status || 'EN_PROCESO,CONFIRMADA,ENVIADA,ENTREGADA')
      .split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    const ALLOWED = new Set(['PENDIENTE','CONFIRMADA','EN_PROCESO','ENVIADA','ENTREGADA','CANCELADA']);
    const wanted  = statusList.filter(s => ALLOWED.has(s));
    const whereStatus = wanted.length ? { in: wanted } : undefined;

    const paymentStatus = String(req.query.paymentStatus || 'PAGADA').toUpperCase();
    const VALID_PAY = new Set(['PAGADA','PENDIENTE','VERIFICANDO','RECHAZADA','REEMBOLSADA']);
    const wherePayment = VALID_PAY.has(paymentStatus) ? paymentStatus : 'PAGADA';

    const where = {
      tiendaId,
      paymentStatus: wherePayment,
      ...(whereStatus ? { status: whereStatus } : {}),
      ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
    };

    const pedidos = await prisma.pedido.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        items: true,
        tienda: { select: { id: true, nombre: true, telefonoContacto: true, logo: { select: { url: true } } } },
      },
    });

    return res.json(pedidos.map(normalizeOrderForVendor));
  } catch (e) {
    console.error('GET /vendor/income error:', e);
    return res.status(500).json({ error: 'No se pudo cargar ingresos' });
  }
});

/* ================== 7) Decisión del vendedor ================== */
router.patch('/:id/decision', async (req, res) => {
  try {
    const id = num(req.params.id);
    const decision = String(req.body?.decision || '').toUpperCase();

    if (!['ACCEPT', 'ACCEPT_CASH', 'REJECT'].includes(decision)) {
      return res.status(400).json({ error: 'decision inválida' });
    }

    let data = {};
    if (decision === 'REJECT') {
      data = { status: 'CANCELADA', paymentStatus: 'RECHAZADA', decidedAt: new Date() };
    } else if (decision === 'ACCEPT_CASH') {
      data = { status: 'EN_PROCESO', paymentStatus: 'PAGADA', paymentMethod: 'CONTRA_ENTREGA', decidedAt: new Date() };
    } else {
      data = { status: 'EN_PROCESO', paymentStatus: 'PAGADA', decidedAt: new Date() };
    }

    const upd = await prisma.pedido.update({
      where: { id },
      data,
      select: { id: true, status: true, paymentStatus: true },
    });

    return res.json({ ok: true, id: upd.id, status: upd.status, paymentStatus: upd.paymentStatus });
  } catch (e) {
    console.error('PATCH /:id/decision error:', e);
    return res.status(500).json({ error: 'No se pudo actualizar el pedido' });
  }
});

/* ================== 8) Marcar ENTREGADA ================== */
router.patch('/:id/delivered', async (req, res) => {
  try {
    const id = num(req.params.id);
    // ⚠️ Tu esquema no tiene deliveredAt. Solo cambia el status.
    const upd = await prisma.pedido.update({
      where: { id },
      data: { status: 'ENTREGADA' },
      select: { id: true, status: true, paymentStatus: true },
    });
    return res.json({ ok: true, id: upd.id, status: upd.status, paymentStatus: upd.paymentStatus });
  } catch (e) {
    console.error('PATCH /orders/:id/delivered error:', e);
    return res.status(500).json({ error: 'No se pudo marcar como entregada' });
  }
});
/* ===========================================================
   5.1) Compras del usuario (mis pedidos)
   GET /api/orders/mine
   GET /api/orders/by-user?userId=123
   GET /api/orders/search?buyerUserId=123
   GET /api/orders?buyerUserId=123
   Query opcionales:
     - status=EN_PROCESO,ENTREGADA,...
     - paymentStatus=PAGADA|PENDIENTE|VERIFICANDO|RECHAZADA|REEMBOLSADA
   =========================================================== */

// Helper para parsear filtros comunes
function parseStatusFilters(req) {
  const ALLOWED = new Set(['PENDIENTE','EN_PROCESO','CONFIRMADA','ENVIADA','ENTREGADA','CANCELADA']);
  const statusList = String(req.query.status || '')
    .split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  const wanted = statusList.filter(s => ALLOWED.has(s));
  const whereStatus = wanted.length ? { in: wanted } : undefined;

  const psRaw = String(req.query.paymentStatus || '').toUpperCase();
  const PS_ALLOWED = new Set(['PAGADA','PENDIENTE','VERIFICANDO','RECHAZADA','REEMBOLSADA']);
  const wherePayment = PS_ALLOWED.has(psRaw) ? psRaw : undefined;

  return { whereStatus, wherePayment };
}

// GET /api/orders/by-user?userId=123
router.get('/by-user', async (req, res) => {
  try {
    const userId = Number(req.query.userId || req.headers['x-user-id'] || 0);
    if (!userId) return res.status(400).json({ error: 'userId requerido' });

    const { whereStatus, wherePayment } = parseStatusFilters(req);

    const where = {
      buyerUserId: userId,
      ...(whereStatus ? { status: whereStatus } : {}),
      ...(wherePayment ? { paymentStatus: wherePayment } : {}),
    };

    const pedidos = await prisma.pedido.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        items: true,
        tienda: { select: { id: true, nombre: true, telefonoContacto: true, logo: { select: { url: true } } } },
      },
    });

    return res.json(pedidos.map(normalizeOrderForVendor));
  } catch (e) {
    console.error('GET /orders/by-user error:', e);
    return res.status(500).json({ error: 'No se pudieron cargar compras' });
  }
});

// Alias: GET /api/orders/mine  (toma x-user-id)
router.get('/mine', async (req, res) => {
  try {
    const userId = Number(req.headers['x-user-id'] || 0);
    if (!userId) return res.status(401).json({ error: 'No autorizado' });
    // Reusar lógica de /by-user
    req.query.userId = String(userId);
    return router.handle({ ...req, url: '/by-user', method: 'GET' }, res);
  } catch (e) {
    console.error('GET /orders/mine error:', e);
    return res.status(500).json({ error: 'No se pudieron cargar compras' });
  }
});

// Alias: GET /api/orders/search?buyerUserId=123
router.get('/search', async (req, res) => {
  try {
    const userId = Number(req.query.buyerUserId || req.headers['x-user-id'] || 0);
    if (!userId) return res.status(400).json({ error: 'buyerUserId requerido' });

    const { whereStatus, wherePayment } = parseStatusFilters(req);
    const where = {
      buyerUserId: userId,
      ...(whereStatus ? { status: whereStatus } : {}),
      ...(wherePayment ? { paymentStatus: wherePayment } : {}),
    };

    const pedidos = await prisma.pedido.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        items: true,
        tienda: { select: { id: true, nombre: true, telefonoContacto: true, logo: { select: { url: true } } } },
      },
    });

    return res.json(pedidos.map(normalizeOrderForVendor));
  } catch (e) {
    console.error('GET /orders/search error:', e);
    return res.status(500).json({ error: 'No se pudieron cargar compras' });
  }
});

// Alias súper flexible: GET /api/orders?buyerUserId=123
router.get('/', async (req, res) => {
  try {
    const buyerUserId = Number(req.query.buyerUserId || 0);
    if (!buyerUserId) return res.status(400).json({ error: 'buyerUserId requerido' });

    const { whereStatus, wherePayment } = parseStatusFilters(req);
    const where = {
      buyerUserId,
      ...(whereStatus ? { status: whereStatus } : {}),
      ...(wherePayment ? { paymentStatus: wherePayment } : {}),
    };

    const pedidos = await prisma.pedido.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        items: true,
        tienda: { select: { id: true, nombre: true, telefonoContacto: true, logo: { select: { url: true } } } },
      },
    });

    return res.json(pedidos.map(normalizeOrderForVendor));
  } catch (e) {
    console.error('GET /orders error:', e);
    return res.status(500).json({ error: 'No se pudieron cargar compras' });
  }
});

module.exports = router;

// backend/src/modules/pedidos/routes.js
const express = require('express');
let prisma;
try {
  prisma = require('../../config/db'); // usa tu singleton si existe
} catch {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();         // fallback
}

const router = express.Router();

const toCents = (n) => Math.round(Number(n || 0) * 100);
const validQueueStatuses = ['PENDIENTE', 'EN_PROCESO'];
const queueMessage = (pos) => {
  if (pos == null) return null;
  if (pos === 1) return 'Pronto serás atendido';
  if (pos === 2) return 'Eres el segundo en la fila, ¡ya casi!';
  if (pos === 3) return 'Tercer turno, en breve te toca';
  return `Tu número en la fila: ${pos}`;
};

// 1) INTENTO: se crea el pedido con token antes de abrir WhatsApp
router.post('/intent', async (req, res) => {
  try {
    const {
      tiendaId,
      productoId,
      varianteId = null,
      cantidad = 1,
      buyer = null, // { name, phone, email } (opcional en intento)
      channel = 'WEB',
    } = req.body || {};

    if (!tiendaId || !productoId) {
      return res.status(400).json({ error: 'tiendaId y productoId requeridos' });
    }

    const tienda = await prisma.tienda.findUnique({
      where: { id: Number(tiendaId) },
      select: { id: true },
    });
    if (!tienda) return res.status(404).json({ error: 'Tienda no encontrada' });

    const prod = await prisma.producto.findUnique({
      where: { id: Number(productoId) },
      include: { variantes: true },
    });
    if (!prod || prod.tiendaId !== Number(tiendaId)) {
      return res.status(400).json({ error: 'Producto inválido para esta tienda' });
    }

    const qty = Math.max(1, Number(cantidad || 1));

    let price = null;
    let varObj = null;
    if (varianteId) {
      varObj = (prod.variantes || []).find(v => v.id === Number(varianteId));
      if (!varObj) return res.status(400).json({ error: 'Variante inválida' });
      price = varObj.precio != null ? Number(varObj.precio) : null;
    } else {
      price = prod.precio != null ? Number(prod.precio) : null;
    }
    if (price == null) return res.status(400).json({ error: 'Producto sin precio' });

    const precioUnitario = toCents(price);
    const lineTotal = precioUnitario * qty;

    const created = await prisma.pedido.create({
      data: {
        tiendaId: Number(tiendaId),

        // Buyer (opcional en intento)
        buyerName: buyer?.name ? String(buyer.name) : '',
        buyerPhone: buyer?.phone ? String(buyer.phone) : '',
        buyerEmail: buyer?.email ? String(buyer.email) : null,

        channel,
        status: 'PENDIENTE',
        paymentStatus: 'PENDIENTE',
        paymentMethod: 'TRANSFERENCIA',

        subTotal: lineTotal,
        shippingCost: 0,
        total: lineTotal,
        currency: 'MXN',

        items: {
          create: [{
            productoId: prod.id,
            varianteId: varObj ? varObj.id : null,
            nombre: varObj?.nombre || prod.nombre,
            opciones: varObj?.opciones || null,
            precioUnitario,
            cantidad: qty,
            total: lineTotal,
          }]
        }
      },
      select: { id: true, publicToken: true }
    });

    res.status(201).json({ ok: true, pedidoId: created.id, token: created.publicToken });
  } catch (e) {
    console.error('[orders:intent]', e);
    res.status(500).json({ error: 'Error creando intento de pedido' });
  }
});

// 2) Consultar pedido público (con posición en fila si ya solicitó)
router.get('/public/:token', async (req, res) => {
  try {
    const token = String(req.params.token);

    const pedido = await prisma.pedido.findFirst({
      where: { publicToken: token },
      include: {
        tienda: { select: { id: true, nombre: true, slug: true, telefonoContacto: true } },
        items: {
          include: {
            producto: { select: { id: true, nombre: true } },
            variante: { select: { id: true, nombre: true, opciones: true } }
          }
        }
      }
    });
    if (!pedido) return res.status(404).json({ error: 'No encontrado' });

    let position = null;
    if (pedido.requested && pedido.requestedAt) {
      const ahead = await prisma.pedido.count({
        where: {
          tiendaId: pedido.tiendaId,
          requested: true,
          requestedAt: { lt: pedido.requestedAt },
          status: { in: validQueueStatuses },
        }
      });
      position = ahead + 1;
    }

    res.json({
      id: pedido.id,
      token: pedido.publicToken,
      tienda: {
        id: pedido.tienda.id,
        nombre: pedido.tienda.nombre,
        slug: pedido.tienda.slug,
        telefonoContacto: pedido.tienda.telefonoContacto || null,
      },
      status: pedido.status,
      paymentStatus: pedido.paymentStatus,
      requested: pedido.requested,
      requestedAt: pedido.requestedAt,
      decidedAt: pedido.decidedAt,
      position,
      positionMessage: queueMessage(position),
      totals: {
        subTotal: pedido.subTotal,
        shippingCost: pedido.shippingCost,
        total: pedido.total,
        currency: pedido.currency,
      },
      items: pedido.items.map(it => ({
        id: it.id,
        productoId: it.productoId,
        varianteId: it.varianteId,
        nombre: it.nombre,
        opciones: it.opciones,
        cantidad: it.cantidad,
        precioUnitario: it.precioUnitario,
        total: it.total,
      })),
      createdAt: pedido.createdAt,
      proofMediaId: pedido.proofMediaId || null,
    });
  } catch (e) {
    console.error('[orders:public:get]', e);
    res.status(500).json({ error: 'Error cargando pedido' });
  }
});

// 3) Registrar comprobante (recibe mediaId de tu /api/media/upload)
router.post('/public/:token/proof', async (req, res) => {
  try {
    const token = String(req.params.token);
    const { mediaId } = req.body || {};
    if (!mediaId) return res.status(400).json({ error: 'mediaId requerido' });

    const updated = await prisma.pedido.update({
      where: { publicToken: token },
      data: {
        proofMediaId: Number(mediaId),
        paymentStatus: 'VERIFICANDO',
      },
      select: { id: true, paymentStatus: true, proofMediaId: true }
    });

    res.json({ ok: true, pedidoId: updated.id, paymentStatus: updated.paymentStatus });
  } catch (e) {
    console.error('[orders:public:proof]', e);
    res.status(500).json({ error: 'Error subiendo comprobante' });
  }
});

// 4) Solicitar revisión (entra a la fila por tienda)
router.post('/public/:token/request', async (req, res) => {
  try {
    const token = String(req.params.token);

    const pedido = await prisma.pedido.update({
      where: { publicToken: token },
      data: {
        requested: true,
        requestedAt: new Date(),
        paymentStatus: 'VERIFICANDO',
      },
      select: { id: true, tiendaId: true, requestedAt: true, status: true }
    });

    const ahead = await prisma.pedido.count({
      where: {
        tiendaId: pedido.tiendaId,
        requested: true,
        requestedAt: { lt: pedido.requestedAt },
        status: { in: validQueueStatuses },
      }
    });
    const position = ahead + 1;

    res.json({ ok: true, pedidoId: pedido.id, position, positionMessage: queueMessage(position) });
  } catch (e) {
    console.error('[orders:public:request]', e);
    res.status(500).json({ error: 'Error al solicitar revisión' });
  }
});

// 5) Lista de solicitudes para el vendedor (con posición)
router.get('/vendor/requests', async (req, res) => {
  try {
    const tiendaId = Number(req.query.tiendaId || 0);
    if (!tiendaId) return res.status(400).json({ error: 'tiendaId requerido' });

    const statuses = String(req.query.status || 'PENDIENTE,EN_PROCESO')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const pedidos = await prisma.pedido.findMany({
      where: {
        tiendaId,
        requested: true,
        status: { in: statuses },
      },
      orderBy: { requestedAt: 'asc' },
      include: { items: true }
    });

    const withPos = await Promise.all(pedidos.map(async p => {
      let position = null;
      if (p.requested && p.requestedAt) {
        const ahead = await prisma.pedido.count({
          where: {
            tiendaId,
            requested: true,
            requestedAt: { lt: p.requestedAt },
            status: { in: validQueueStatuses },
          }
        });
        position = ahead + 1;
      }
      return { ...p, position, positionMessage: queueMessage(position) };
    }));

    res.json({ items: withPos });
  } catch (e) {
    console.error('[orders:vendor:requests]', e);
    res.status(500).json({ error: 'Error listando solicitudes' });
  }
});

// 6) Decisión del vendedor (Aceptar / Rechazar / En espera / Aceptar sin foto)
router.patch('/:id/decision', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { decision } = req.body || {}; // 'ACCEPT' | 'REJECT' | 'PENDING' | 'ACCEPT_CASH'
    if (!id || !decision) return res.status(400).json({ error: 'id y decision requeridos' });

    const data = { decidedAt: new Date() };
    switch (decision) {
      case 'ACCEPT':
      case 'ACCEPT_CASH':
        data.status = 'CONFIRMADA';
        data.paymentStatus = 'PAGADA';
        break;
      case 'REJECT':
        data.status = 'CANCELADA';
        data.paymentStatus = 'RECHAZADA';
        break;
      case 'PENDING':
      default:
        data.status = 'PENDIENTE';
        data.paymentStatus = 'VERIFICANDO';
        break;
    }

    const updated = await prisma.pedido.update({
      where: { id },
      data,
      select: { id: true, status: true, paymentStatus: true }
    });

    res.json({ ok: true, pedido: updated });
  } catch (e) {
    console.error('[orders:decision]', e);
    res.status(500).json({ error: 'Error aplicando decisión' });
  }
});

// 7) Métricas básicas del panel
router.get('/vendor/metrics', async (req, res) => {
  try {
    const tiendaId = Number(req.query.tiendaId || 0);
    const range = String(req.query.range || 'month'); // day|week|month|year
    if (!tiendaId) return res.status(400).json({ error: 'tiendaId requerido' });

    const now = new Date();
    const since = new Date(now);
    if (range === 'day') since.setDate(now.getDate() - 1);
    else if (range === 'week') since.setDate(now.getDate() - 7);
    else if (range === 'month') since.setMonth(now.getMonth() - 1);
    else if (range === 'year') since.setFullYear(now.getFullYear() - 1);

    const pedidos = await prisma.pedido.findMany({
      where: {
        tiendaId,
        status: { in: ['CONFIRMADA', 'ENVIADA', 'ENTREGADA'] },
        createdAt: { gte: since }
      },
      include: { items: true }
    });

    const ingreso = pedidos.reduce((acc, p) => acc + p.total, 0);
    const contador = pedidos.length;

    const map = new Map();
    for (const p of pedidos) {
      for (const it of p.items) {
        const k = `${it.productoId}`;
        map.set(k, (map.get(k) || 0) + it.total);
      }
    }
    let top = null;
    for (const [k, v] of map.entries()) {
      if (!top || v > top.total) top = { productoId: Number(k), total: v };
    }

    res.json({ ingreso, pedidos: contador, topProducto: top });
  } catch (e) {
    console.error('[orders:metrics]', e);
    res.status(500).json({ error: 'Error obteniendo métricas' });
  }
});

module.exports = router;

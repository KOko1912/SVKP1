-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'EN_PROCESO', 'ENVIADA', 'ENTREGADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDIENTE', 'VERIFICANDO', 'PAGADA', 'RECHAZADA', 'REEMBOLSADA');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('TRANSFERENCIA', 'OXXO', 'TARJETA', 'CONTRA_ENTREGA');

-- CreateEnum
CREATE TYPE "public"."CheckoutChannel" AS ENUM ('WEB', 'WHATSAPP', 'POS', 'API');

-- CreateTable
CREATE TABLE "public"."Pedido" (
    "id" SERIAL NOT NULL,
    "publicToken" TEXT NOT NULL,
    "tiendaId" INTEGER NOT NULL,
    "buyerUserId" INTEGER,
    "buyerName" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL,
    "buyerEmail" TEXT,
    "shippingAddress" JSONB,
    "channel" "public"."CheckoutChannel" NOT NULL DEFAULT 'WEB',
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'PENDIENTE',
    "paymentStatus" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDIENTE',
    "paymentMethod" "public"."PaymentMethod" NOT NULL DEFAULT 'TRANSFERENCIA',
    "subTotal" INTEGER NOT NULL,
    "shippingCost" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "proofMediaId" INTEGER,
    "requested" BOOLEAN NOT NULL DEFAULT false,
    "requestedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LineaPedido" (
    "id" SERIAL NOT NULL,
    "pedidoId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "varianteId" INTEGER,
    "nombre" TEXT NOT NULL,
    "opciones" JSONB,
    "precioUnitario" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineaPedido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_publicToken_key" ON "public"."Pedido"("publicToken");

-- CreateIndex
CREATE INDEX "Pedido_tiendaId_createdAt_idx" ON "public"."Pedido"("tiendaId", "createdAt");

-- CreateIndex
CREATE INDEX "Pedido_requested_requestedAt_idx" ON "public"."Pedido"("requested", "requestedAt");

-- CreateIndex
CREATE INDEX "Pedido_status_paymentStatus_idx" ON "public"."Pedido"("status", "paymentStatus");

-- CreateIndex
CREATE INDEX "LineaPedido_pedidoId_idx" ON "public"."LineaPedido"("pedidoId");

-- CreateIndex
CREATE INDEX "LineaPedido_productoId_idx" ON "public"."LineaPedido"("productoId");

-- CreateIndex
CREATE INDEX "LineaPedido_varianteId_idx" ON "public"."LineaPedido"("varianteId");

-- AddForeignKey
ALTER TABLE "public"."Pedido" ADD CONSTRAINT "Pedido_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "public"."Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pedido" ADD CONSTRAINT "Pedido_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pedido" ADD CONSTRAINT "Pedido_proofMediaId_fkey" FOREIGN KEY ("proofMediaId") REFERENCES "public"."Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LineaPedido" ADD CONSTRAINT "LineaPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "public"."Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LineaPedido" ADD CONSTRAINT "LineaPedido_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LineaPedido" ADD CONSTRAINT "LineaPedido_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "public"."Variante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

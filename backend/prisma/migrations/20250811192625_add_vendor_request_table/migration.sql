-- CreateEnum
CREATE TYPE "public"."EstadoSolicitud" AS ENUM ('PENDIENTE', 'PAGADO', 'APROBADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "public"."SolicitudVendedor" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "estado" "public"."EstadoSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "soporteNumero" TEXT NOT NULL DEFAULT '528441786280',
    "pagoSlug" TEXT NOT NULL,
    "comprobanteUrl" TEXT,
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "aprobadoAt" TIMESTAMP(3),
    "rechazadoAt" TIMESTAMP(3),

    CONSTRAINT "SolicitudVendedor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SolicitudVendedor_uuid_key" ON "public"."SolicitudVendedor"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitudVendedor_pagoSlug_key" ON "public"."SolicitudVendedor"("pagoSlug");

-- CreateIndex
CREATE INDEX "SolicitudVendedor_usuarioId_idx" ON "public"."SolicitudVendedor"("usuarioId");

-- AddForeignKey
ALTER TABLE "public"."SolicitudVendedor" ADD CONSTRAINT "SolicitudVendedor_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

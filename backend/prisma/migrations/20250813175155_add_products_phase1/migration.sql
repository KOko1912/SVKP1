-- CreateEnum
CREATE TYPE "public"."EstadoProducto" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."TipoProducto" AS ENUM ('SIMPLE', 'VARIANTE', 'DIGITAL', 'SERVICIO', 'BUNDLE');

-- CreateEnum
CREATE TYPE "public"."EstadoResena" AS ENUM ('PENDIENTE', 'PUBLICADA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "public"."Producto" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "tiendaId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "public"."TipoProducto" NOT NULL DEFAULT 'SIMPLE',
    "estado" "public"."EstadoProducto" NOT NULL DEFAULT 'DRAFT',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "sku" TEXT,
    "gtin" TEXT,
    "marca" TEXT,
    "condicion" TEXT,
    "precio" DECIMAL(10,2),
    "precioComparativo" DECIMAL(10,2),
    "costo" DECIMAL(10,2),
    "descuentoPct" INTEGER,
    "vistas" INTEGER NOT NULL DEFAULT 0,
    "ventas" INTEGER NOT NULL DEFAULT 0,
    "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "pesoGramos" INTEGER,
    "altoCm" DECIMAL(10,2),
    "anchoCm" DECIMAL(10,2),
    "largoCm" DECIMAL(10,2),
    "claseEnvio" TEXT,
    "diasPreparacion" INTEGER,
    "politicaDevolucion" TEXT,
    "digitalUrl" TEXT,
    "licenciamiento" JSONB,
    "publishedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductoImagen" (
    "id" SERIAL NOT NULL,
    "productoId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "isPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductoImagen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Variante" (
    "id" SERIAL NOT NULL,
    "productoId" INTEGER NOT NULL,
    "nombre" TEXT,
    "sku" TEXT,
    "gtin" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "precio" DECIMAL(10,2),
    "precioComparativo" DECIMAL(10,2),
    "costo" DECIMAL(10,2),
    "opciones" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Variante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VarianteImagen" (
    "id" SERIAL NOT NULL,
    "varianteId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VarianteImagen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Inventario" (
    "id" SERIAL NOT NULL,
    "productoId" INTEGER,
    "varianteId" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "reservado" INTEGER NOT NULL DEFAULT 0,
    "umbralAlerta" INTEGER NOT NULL DEFAULT 0,
    "permitirBackorder" BOOLEAN NOT NULL DEFAULT false,
    "gestionado" BOOLEAN NOT NULL DEFAULT true,
    "ubicacion" TEXT,
    "lote" TEXT,
    "caducidad" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductoAtributo" (
    "id" SERIAL NOT NULL,
    "productoId" INTEGER NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "ProductoAtributo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Resena" (
    "id" SERIAL NOT NULL,
    "productoId" INTEGER NOT NULL,
    "usuarioId" INTEGER,
    "nombrePublico" TEXT,
    "rating" INTEGER NOT NULL,
    "comentario" TEXT,
    "estado" "public"."EstadoResena" NOT NULL DEFAULT 'PENDIENTE',
    "respuesta" TEXT,
    "respondidoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resena_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Producto_uuid_key" ON "public"."Producto"("uuid");

-- CreateIndex
CREATE INDEX "idx_producto_listado" ON "public"."Producto"("tiendaId", "estado", "visible", "destacado", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_tiendaId_slug_key" ON "public"."Producto"("tiendaId", "slug");

-- CreateIndex
CREATE INDEX "ProductoImagen_productoId_idx" ON "public"."ProductoImagen"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "Variante_sku_key" ON "public"."Variante"("sku");

-- CreateIndex
CREATE INDEX "Variante_productoId_idx" ON "public"."Variante"("productoId");

-- CreateIndex
CREATE INDEX "VarianteImagen_varianteId_idx" ON "public"."VarianteImagen"("varianteId");

-- CreateIndex
CREATE INDEX "Inventario_productoId_idx" ON "public"."Inventario"("productoId");

-- CreateIndex
CREATE INDEX "Inventario_varianteId_idx" ON "public"."Inventario"("varianteId");

-- CreateIndex
CREATE UNIQUE INDEX "Inventario_productoId_key" ON "public"."Inventario"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "Inventario_varianteId_key" ON "public"."Inventario"("varianteId");

-- CreateIndex
CREATE INDEX "ProductoAtributo_productoId_idx" ON "public"."ProductoAtributo"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoAtributo_productoId_clave_key" ON "public"."ProductoAtributo"("productoId", "clave");

-- CreateIndex
CREATE INDEX "Resena_productoId_idx" ON "public"."Resena"("productoId");

-- CreateIndex
CREATE INDEX "Resena_usuarioId_idx" ON "public"."Resena"("usuarioId");

-- AddForeignKey
ALTER TABLE "public"."Producto" ADD CONSTRAINT "Producto_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "public"."Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductoImagen" ADD CONSTRAINT "ProductoImagen_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Variante" ADD CONSTRAINT "Variante_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VarianteImagen" ADD CONSTRAINT "VarianteImagen_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "public"."Variante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Inventario" ADD CONSTRAINT "Inventario_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Inventario" ADD CONSTRAINT "Inventario_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "public"."Variante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductoAtributo" ADD CONSTRAINT "ProductoAtributo_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Resena" ADD CONSTRAINT "Resena_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Resena" ADD CONSTRAINT "Resena_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

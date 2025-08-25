/*
  Warnings:

  - A unique constraint covering the columns `[productoId,url]` on the table `ProductoImagen` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Tienda" ADD COLUMN     "ciudad" TEXT,
ADD COLUMN     "moneda" TEXT DEFAULT 'MXN',
ADD COLUMN     "pais" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- CreateIndex
CREATE INDEX "Categoria_tiendaId_nombre_idx" ON "public"."Categoria"("tiendaId", "nombre");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "public"."PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "Producto_tiendaId_nombre_idx" ON "public"."Producto"("tiendaId", "nombre");

-- CreateIndex
CREATE INDEX "Producto_estado_visible_idx" ON "public"."Producto"("estado", "visible");

-- CreateIndex
CREATE INDEX "ProductoAtributo_clave_idx" ON "public"."ProductoAtributo"("clave");

-- CreateIndex
CREATE INDEX "ProductoImagen_productoId_isPrincipal_idx" ON "public"."ProductoImagen"("productoId", "isPrincipal");

-- CreateIndex
CREATE INDEX "ProductoImagen_productoId_orden_idx" ON "public"."ProductoImagen"("productoId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoImagen_productoId_url_key" ON "public"."ProductoImagen"("productoId", "url");

-- CreateIndex
CREATE INDEX "Resena_estado_idx" ON "public"."Resena"("estado");

-- CreateIndex
CREATE INDEX "SolicitudVendedor_estado_idx" ON "public"."SolicitudVendedor"("estado");

-- CreateIndex
CREATE INDEX "Tienda_isPublished_idx" ON "public"."Tienda"("isPublished");

-- CreateIndex
CREATE INDEX "Usuario_telefono_idx" ON "public"."Usuario"("telefono");

-- CreateIndex
CREATE INDEX "Variante_sku_idx" ON "public"."Variante"("sku");

-- CreateIndex
CREATE INDEX "VarianteImagen_varianteId_orden_idx" ON "public"."VarianteImagen"("varianteId", "orden");

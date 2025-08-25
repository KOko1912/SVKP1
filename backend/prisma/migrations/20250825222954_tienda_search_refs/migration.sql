-- AlterTable
ALTER TABLE "public"."Tienda" ADD COLUMN     "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "skuRef" VARCHAR(64);

-- CreateIndex
CREATE INDEX "Tienda_nombre_idx" ON "public"."Tienda"("nombre");

-- CreateIndex
CREATE INDEX "Tienda_skuRef_idx" ON "public"."Tienda"("skuRef");

/* ==== MEDIA + BACKFILL (orden correcto) ==== */

/* 1) Enum para provider */
CREATE TYPE "public"."StorageProvider" AS ENUM ('LOCAL', 'S3', 'SUPABASE', 'CLOUDINARY');

/* 2) Tabla Media */
CREATE TABLE "public"."Media" (
    "id" SERIAL NOT NULL,
    "provider" "public"."StorageProvider" NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mime" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Media_url_idx" ON "public"."Media"("url");
CREATE UNIQUE INDEX "Media_provider_key_key" ON "public"."Media"("provider", "key");

/* 3) Limpieza de índices antiguos (opcionales) */
DROP INDEX IF EXISTS "public"."ProductoImagen_productoId_url_key";
DROP INDEX IF EXISTS "public"."Tienda_slug_idx";
DROP INDEX IF EXISTS "public"."Usuario_telefono_idx";
DROP INDEX IF EXISTS "public"."Variante_sku_key";

/* 4) Categoria.orden → default + backfill + NOT NULL */
ALTER TABLE "public"."Categoria" ALTER COLUMN "orden" SET DEFAULT 0;
UPDATE "public"."Categoria" SET "orden" = 0 WHERE "orden" IS NULL;
ALTER TABLE "public"."Categoria" ALTER COLUMN "orden" SET NOT NULL;

/* 5) Agregar columnas nuevas (sin borrar aún las *Url y sin NOT NULL en mediaId) */
ALTER TABLE "public"."Producto"          ADD COLUMN "digitalId" INTEGER;

ALTER TABLE "public"."ProductoImagen"    ADD COLUMN "mediaId"   INTEGER;  -- nullable para backfill
ALTER TABLE "public"."VarianteImagen"    ADD COLUMN "mediaId"   INTEGER;  -- nullable para backfill

ALTER TABLE "public"."SolicitudVendedor" ADD COLUMN "comprobanteId" INTEGER;

ALTER TABLE "public"."Tienda"
  ADD COLUMN "bannerId"  INTEGER,
  ADD COLUMN "logoId"    INTEGER,
  ADD COLUMN "portadaId" INTEGER,
  ALTER COLUMN "subcategorias" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "metodosPago"   SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "seoKeywords"   SET DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "public"."Usuario"
  ADD COLUMN "fotoId"    INTEGER,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

/* 6) BACKFILL desde columnas antiguas (url / *Url) hacia Media + IDs */

/* ProductoImagen.url -> mediaId */
INSERT INTO "public"."Media" ("provider","key","url","createdAt","updatedAt")
SELECT 'LOCAL', md5(COALESCE(pi."url", '')), pi."url", NOW(), NOW()
FROM "public"."ProductoImagen" pi
WHERE pi."url" IS NOT NULL
ON CONFLICT ("provider","key") DO NOTHING;

UPDATE "public"."ProductoImagen" pi
SET "mediaId" = m."id"
FROM "public"."Media" m
WHERE m."url" = pi."url";

/* VarianteImagen.url -> mediaId */
INSERT INTO "public"."Media" ("provider","key","url","createdAt","updatedAt")
SELECT 'LOCAL', md5(COALESCE(vi."url", '')), vi."url", NOW(), NOW()
FROM "public"."VarianteImagen" vi
WHERE vi."url" IS NOT NULL
ON CONFLICT ("provider","key") DO NOTHING;

UPDATE "public"."VarianteImagen" vi
SET "mediaId" = m."id"
FROM "public"."Media" m
WHERE m."url" = vi."url";

/* Usuario.fotoUrl -> fotoId */
INSERT INTO "public"."Media" ("provider","key","url","createdAt","updatedAt")
SELECT 'LOCAL', md5(COALESCE(u."fotoUrl", '')), u."fotoUrl", NOW(), NOW()
FROM "public"."Usuario" u
WHERE u."fotoUrl" IS NOT NULL
ON CONFLICT ("provider","key") DO NOTHING;

UPDATE "public"."Usuario" u
SET "fotoId" = m."id"
FROM "public"."Media" m
WHERE m."url" = u."fotoUrl";

/* SolicitudVendedor.comprobanteUrl -> comprobanteId */
INSERT INTO "public"."Media" ("provider","key","url","createdAt","updatedAt")
SELECT 'LOCAL', md5(COALESCE(s."comprobanteUrl", '')), s."comprobanteUrl", NOW(), NOW()
FROM "public"."SolicitudVendedor" s
WHERE s."comprobanteUrl" IS NOT NULL
ON CONFLICT ("provider","key") DO NOTHING;

UPDATE "public"."SolicitudVendedor" s
SET "comprobanteId" = m."id"
FROM "public"."Media" m
WHERE m."url" = s."comprobanteUrl";

/* Tienda.portadaUrl -> portadaId */
INSERT INTO "public"."Media" ("provider","key","url","createdAt","updatedAt")
SELECT 'LOCAL', md5(COALESCE(t."portadaUrl", '')), t."portadaUrl", NOW(), NOW()
FROM "public"."Tienda" t
WHERE t."portadaUrl" IS NOT NULL
ON CONFLICT ("provider","key") DO NOTHING;

UPDATE "public"."Tienda" t
SET "portadaId" = m."id"
FROM "public"."Media" m
WHERE m."url" = t."portadaUrl";

/* Tienda.logoUrl -> logoId */
INSERT INTO "public"."Media" ("provider","key","url","createdAt","updatedAt")
SELECT 'LOCAL', md5(COALESCE(t."logoUrl", '')), t."logoUrl", NOW(), NOW()
FROM "public"."Tienda" t
WHERE t."logoUrl" IS NOT NULL
ON CONFLICT ("provider","key") DO NOTHING;

UPDATE "public"."Tienda" t
SET "logoId" = m."id"
FROM "public"."Media" m
WHERE m."url" = t."logoUrl";

/* Tienda.bannerPromoUrl -> bannerId */
INSERT INTO "public"."Media" ("provider","key","url","createdAt","updatedAt")
SELECT 'LOCAL', md5(COALESCE(t."bannerPromoUrl", '')), t."bannerPromoUrl", NOW(), NOW()
FROM "public"."Tienda" t
WHERE t."bannerPromoUrl" IS NOT NULL
ON CONFLICT ("provider","key") DO NOTHING;

UPDATE "public"."Tienda" t
SET "bannerId" = m."id"
FROM "public"."Media" m
WHERE m."url" = t."bannerPromoUrl";

/* Producto.digitalUrl -> digitalId */
INSERT INTO "public"."Media" ("provider","key","url","createdAt","updatedAt")
SELECT 'LOCAL', md5(COALESCE(p."digitalUrl", '')), p."digitalUrl", NOW(), NOW()
FROM "public"."Producto" p
WHERE p."digitalUrl" IS NOT NULL
ON CONFLICT ("provider","key") DO NOTHING;

UPDATE "public"."Producto" p
SET "digitalId" = m."id"
FROM "public"."Media" m
WHERE m."url" = p."digitalUrl";

/* 7) Endurecer columnas después del backfill */
ALTER TABLE "public"."ProductoImagen" ALTER COLUMN "mediaId" SET NOT NULL;
ALTER TABLE "public"."VarianteImagen" ALTER COLUMN "mediaId" SET NOT NULL;

/* 8) Foreign Keys */
ALTER TABLE "public"."Usuario"
  ADD CONSTRAINT "Usuario_fotoId_fkey"
  FOREIGN KEY ("fotoId") REFERENCES "public"."Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."SolicitudVendedor"
  ADD CONSTRAINT "SolicitudVendedor_comprobanteId_fkey"
  FOREIGN KEY ("comprobanteId") REFERENCES "public"."Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."Tienda"
  ADD CONSTRAINT "Tienda_portadaId_fkey" FOREIGN KEY ("portadaId") REFERENCES "public"."Media"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Tienda_logoId_fkey"    FOREIGN KEY ("logoId")    REFERENCES "public"."Media"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Tienda_bannerId_fkey"  FOREIGN KEY ("bannerId")  REFERENCES "public"."Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."Producto"
  ADD CONSTRAINT "Producto_digitalId_fkey"
  FOREIGN KEY ("digitalId") REFERENCES "public"."Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."ProductoImagen"
  ADD CONSTRAINT "ProductoImagen_mediaId_fkey"
  FOREIGN KEY ("mediaId") REFERENCES "public"."Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."VarianteImagen"
  ADD CONSTRAINT "VarianteImagen_mediaId_fkey"
  FOREIGN KEY ("mediaId") REFERENCES "public"."Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/* 9) Índices/uniques nuevos */
CREATE UNIQUE INDEX "ProductoImagen_productoId_mediaId_key" ON "public"."ProductoImagen"("productoId", "mediaId");
CREATE UNIQUE INDEX "Tienda_slug_key"                        ON "public"."Tienda"("slug");
CREATE UNIQUE INDEX "Variante_productoId_sku_key"            ON "public"."Variante"("productoId", "sku");
CREATE UNIQUE INDEX "VarianteImagen_varianteId_mediaId_key"  ON "public"."VarianteImagen"("varianteId", "mediaId");

/* 10) Por último, eliminar las columnas antiguas *Url */
ALTER TABLE "public"."Producto"          DROP COLUMN IF EXISTS "digitalUrl";
ALTER TABLE "public"."ProductoImagen"    DROP COLUMN IF EXISTS "url";
ALTER TABLE "public"."SolicitudVendedor" DROP COLUMN IF EXISTS "comprobanteUrl";
ALTER TABLE "public"."Tienda"
  DROP COLUMN IF EXISTS "bannerPromoUrl",
  DROP COLUMN IF EXISTS "logoUrl",
  DROP COLUMN IF EXISTS "portadaUrl";
ALTER TABLE "public"."Usuario"           DROP COLUMN IF EXISTS "fotoUrl";
ALTER TABLE "public"."VarianteImagen"    DROP COLUMN IF EXISTS "url";

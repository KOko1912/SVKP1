/*
  Warnings:

  - A unique constraint covering the columns `[publicUuid]` on the table `Tienda` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Tienda" ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publicUuid" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Tienda_publicUuid_key" ON "public"."Tienda"("publicUuid");

-- CreateIndex
CREATE INDEX "Tienda_slug_idx" ON "public"."Tienda"("slug");

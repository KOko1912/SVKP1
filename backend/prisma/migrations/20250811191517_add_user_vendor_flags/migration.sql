-- AlterTable
ALTER TABLE "public"."Usuario" ADD COLUMN     "vendedor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vendedorSolicitado" BOOLEAN NOT NULL DEFAULT false;

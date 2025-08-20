/*
  Warnings:

  - You are about to drop the column `nombreUsuario` on the `Usuario` table. All the data in the column will be lost.
  - You are about to drop the column `rol` on the `Usuario` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[telefono]` on the table `Usuario` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `nombre` to the `Usuario` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Usuario_nombreUsuario_key";

-- AlterTable
ALTER TABLE "public"."Usuario" DROP COLUMN "nombreUsuario",
DROP COLUMN "rol",
ADD COLUMN     "fotoUrl" TEXT,
ADD COLUMN     "nombre" TEXT NOT NULL,
ADD COLUMN     "suscripciones" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_telefono_key" ON "public"."Usuario"("telefono");

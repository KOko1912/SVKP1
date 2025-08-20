-- CreateTable
CREATE TABLE "public"."Tienda" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "portadaUrl" TEXT,
    "logoUrl" TEXT,
    "categoria" TEXT,
    "subcategorias" TEXT[],
    "telefonoContacto" TEXT,
    "email" TEXT,
    "horario" JSONB,
    "metodosPago" TEXT[],
    "redes" JSONB,
    "envioCobertura" TEXT,
    "envioCosto" TEXT,
    "envioTiempo" TEXT,
    "devoluciones" TEXT,
    "colorPrincipal" TEXT,
    "bannerPromoUrl" TEXT,
    "seoKeywords" TEXT[],
    "seoDescripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tienda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tienda_usuarioId_key" ON "public"."Tienda"("usuarioId");

-- CreateIndex
CREATE INDEX "Tienda_usuarioId_idx" ON "public"."Tienda"("usuarioId");

-- AddForeignKey
ALTER TABLE "public"."Tienda" ADD CONSTRAINT "Tienda_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

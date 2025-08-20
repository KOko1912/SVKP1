-- CreateTable
CREATE TABLE "public"."Categoria" (
    "id" SERIAL NOT NULL,
    "tiendaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "parentId" INTEGER,
    "orden" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductoCategoria" (
    "productoId" INTEGER NOT NULL,
    "categoriaId" INTEGER NOT NULL,

    CONSTRAINT "ProductoCategoria_pkey" PRIMARY KEY ("productoId","categoriaId")
);

-- CreateIndex
CREATE INDEX "Categoria_tiendaId_parentId_idx" ON "public"."Categoria"("tiendaId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_tiendaId_slug_key" ON "public"."Categoria"("tiendaId", "slug");

-- CreateIndex
CREATE INDEX "ProductoCategoria_categoriaId_idx" ON "public"."ProductoCategoria"("categoriaId");

-- AddForeignKey
ALTER TABLE "public"."Categoria" ADD CONSTRAINT "Categoria_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "public"."Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Categoria" ADD CONSTRAINT "Categoria_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductoCategoria" ADD CONSTRAINT "ProductoCategoria_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductoCategoria" ADD CONSTRAINT "ProductoCategoria_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "public"."Categoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

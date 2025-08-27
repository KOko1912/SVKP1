ALTER TABLE "Categoria" ALTER COLUMN "orden" SET DEFAULT 0;
UPDATE "Categoria" SET "orden" = 0 WHERE "orden" IS NULL;
ALTER TABLE "Categoria" ALTER COLUMN "orden" SET NOT NULL;

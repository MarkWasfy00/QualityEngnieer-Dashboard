-- AlterTable
ALTER TABLE "ReceivableImport" ADD COLUMN "columns" TEXT;

-- CreateTable
CREATE TABLE "DataRow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "format" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "date" DATETIME,
    "sheet" TEXT,
    "importId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DataRow_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ReceivableImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DataRow_format_key_key" ON "DataRow"("format", "key");

-- CreateIndex
CREATE INDEX "DataRow_format_date_idx" ON "DataRow"("format", "date");

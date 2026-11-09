-- CreateTable
CREATE TABLE "SalesLine" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "kind" TEXT NOT NULL,
    "category" TEXT,
    "paymentType" TEXT NOT NULL DEFAULT 'CashBank',
    "account" TEXT,
    "customer" TEXT,
    "product" TEXT,
    "brand" TEXT,
    "invoiceNo" TEXT,
    "matchingNo" TEXT,
    "chassis" TEXT,
    "chassisCost" REAL,
    "color" TEXT,
    "modelYear" TEXT,
    "unitPrice" REAL,
    "branch" TEXT,
    "credit" REAL NOT NULL DEFAULT 0,
    "debit" REAL NOT NULL DEFAULT 0,
    "amount" REAL NOT NULL DEFAULT 0,
    "importId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalesLine_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ReceivableImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReceivableImport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fileName" TEXT NOT NULL,
    "storedPath" TEXT,
    "sheets" TEXT NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "kind" TEXT NOT NULL DEFAULT 'receivables',
    "replaced" BOOLEAN NOT NULL DEFAULT false,
    "warnings" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ReceivableImport" ("created", "createdAt", "fileName", "id", "replaced", "sheets", "skipped", "storedPath", "total", "updated", "warnings") SELECT "created", "createdAt", "fileName", "id", "replaced", "sheets", "skipped", "storedPath", "total", "updated", "warnings" FROM "ReceivableImport";
DROP TABLE "ReceivableImport";
ALTER TABLE "new_ReceivableImport" RENAME TO "ReceivableImport";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "SalesLine_key_key" ON "SalesLine"("key");

-- CreateIndex
CREATE INDEX "SalesLine_date_idx" ON "SalesLine"("date");

-- CreateIndex
CREATE INDEX "SalesLine_kind_idx" ON "SalesLine"("kind");


-- CreateTable
CREATE TABLE "Receivable" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "status" TEXT,
    "state" TEXT NOT NULL DEFAULT 'Open',
    "collectedAt" DATETIME,
    "car" TEXT,
    "chassis" TEXT,
    "debit" REAL,
    "salePrice" REAL,
    "financeAmount" REAL,
    "downPaymentRemaining" REAL,
    "amountDue" REAL NOT NULL DEFAULT 0,
    "saleDate" DATETIME,
    "closingOfficer" TEXT,
    "branch" TEXT,
    "bank" TEXT,
    "paymentType" TEXT NOT NULL DEFAULT 'Bank',
    "salesman" TEXT,
    "remarks" TEXT,
    "sourceSheet" TEXT,
    "importId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Receivable_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ReceivableImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReceivableImport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fileName" TEXT NOT NULL,
    "storedPath" TEXT,
    "sheets" TEXT NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "replaced" BOOLEAN NOT NULL DEFAULT false,
    "warnings" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Receivable_key_key" ON "Receivable"("key");

-- CreateIndex
CREATE INDEX "Receivable_saleDate_idx" ON "Receivable"("saleDate");

-- CreateIndex
CREATE INDEX "Receivable_state_idx" ON "Receivable"("state");

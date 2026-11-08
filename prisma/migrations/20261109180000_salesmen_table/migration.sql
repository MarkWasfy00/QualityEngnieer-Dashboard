-- Salesmen master table; Sale/Visit now reference it by id.
CREATE TABLE "Salesman" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "hiredAt" DATETIME,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Salesman_name_key" ON "Salesman"("name");

-- Carry over any salesman names already typed in sales/visits
INSERT INTO "Salesman" ("name")
SELECT DISTINCT TRIM("salesman") FROM (SELECT "salesman" FROM "Sale" UNION SELECT "salesman" FROM "Visit")
WHERE TRIM("salesman") <> '';

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Sale" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vehicleId" INTEGER NOT NULL,
    "salesmanId" INTEGER NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "saleDate" DATETIME NOT NULL,
    "price" REAL NOT NULL DEFAULT 0,
    "paymentType" TEXT NOT NULL DEFAULT 'Cash',
    "deliveredAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sale_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Sale_salesmanId_fkey" FOREIGN KEY ("salesmanId") REFERENCES "Salesman" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Sale" ("id","vehicleId","salesmanId","customerName","customerPhone","saleDate","price","paymentType","deliveredAt","notes","createdAt")
SELECT s."id", s."vehicleId", m."id", s."customerName", s."customerPhone", s."saleDate", s."price", s."paymentType", s."deliveredAt", s."notes", s."createdAt"
FROM "Sale" s JOIN "Salesman" m ON m."name" = TRIM(s."salesman");
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";

CREATE TABLE "new_Visit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "salesmanId" INTEGER NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "visitDate" DATETIME NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'زيارة للمعرض',
    "interestedIn" TEXT,
    "outcome" TEXT NOT NULL DEFAULT 'FollowUp',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Visit_salesmanId_fkey" FOREIGN KEY ("salesmanId") REFERENCES "Salesman" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Visit" ("id","salesmanId","customerName","customerPhone","visitDate","source","interestedIn","outcome","notes","createdAt")
SELECT v."id", m."id", v."customerName", v."customerPhone", v."visitDate", v."source", v."interestedIn", v."outcome", v."notes", v."createdAt"
FROM "Visit" v JOIN "Salesman" m ON m."name" = TRIM(v."salesman");
DROP TABLE "Visit";
ALTER TABLE "new_Visit" RENAME TO "Visit";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Visit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "salesmanId" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "visitDate" DATETIME NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'زيارة للمعرض',
    "interestedIn" TEXT,
    "outcome" TEXT NOT NULL DEFAULT 'FollowUp',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Visit_salesmanId_fkey" FOREIGN KEY ("salesmanId") REFERENCES "Salesman" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Visit" ("createdAt", "customerName", "customerPhone", "id", "interestedIn", "notes", "outcome", "salesmanId", "source", "visitDate") SELECT "createdAt", "customerName", "customerPhone", "id", "interestedIn", "notes", "outcome", "salesmanId", "source", "visitDate" FROM "Visit";
DROP TABLE "Visit";
ALTER TABLE "new_Visit" RENAME TO "Visit";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;


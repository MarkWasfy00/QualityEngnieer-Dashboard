-- CreateTable
CREATE TABLE "Visit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "salesman" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "visitDate" DATETIME NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'زيارة للمعرض',
    "interestedIn" TEXT,
    "outcome" TEXT NOT NULL DEFAULT 'FollowUp',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

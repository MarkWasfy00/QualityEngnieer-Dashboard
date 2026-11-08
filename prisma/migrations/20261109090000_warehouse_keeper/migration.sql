-- Replace stock number with the warehouse keeper's name (keeps all vehicles).
ALTER TABLE "Vehicle" RENAME COLUMN "stockNumber" TO "warehouseKeeper";
-- Old stock codes are not names, so clear them.
UPDATE "Vehicle" SET "warehouseKeeper" = NULL;

/*
  Warnings:

  - Made the column `bill_type` on table `Receipt` required. This step will fail if there are existing NULL values in that column.
  - Made the column `issue_date` on table `Receipt` required. This step will fail if there are existing NULL values in that column.
  - Made the column `patient_name` on table `Receipt` required. This step will fail if there are existing NULL values in that column.
  - Made the column `storage_url` on table `Receipt` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_amount` on table `Receipt` required. This step will fail if there are existing NULL values in that column.
  - Made the column `vendor_name` on table `Receipt` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Receipt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "storage_url" TEXT NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "patient_name" TEXT NOT NULL,
    "vendor_name" TEXT NOT NULL,
    "bill_type" TEXT NOT NULL,
    "issue_date" DATETIME NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Receipt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Receipt" ("bill_type", "created_at", "id", "issue_date", "patient_name", "processed", "storage_url", "total_amount", "user_id", "vendor_name") SELECT "bill_type", "created_at", "id", "issue_date", "patient_name", "processed", "storage_url", "total_amount", "user_id", "vendor_name" FROM "Receipt";
DROP TABLE "Receipt";
ALTER TABLE "new_Receipt" RENAME TO "Receipt";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

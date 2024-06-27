/*
  Warnings:

  - You are about to alter the column `telegram_id` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "telegram_id" BIGINT NOT NULL,
    "username" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("created_at", "id", "telegram_id", "username") SELECT "created_at", "id", "telegram_id", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_telegram_id_key" ON "User"("telegram_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

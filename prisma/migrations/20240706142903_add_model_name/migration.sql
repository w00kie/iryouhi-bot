-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GenAITokenUsage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "request_type" TEXT NOT NULL,
    "model_name" TEXT NOT NULL DEFAULT 'gpt-4o',
    "prompt_tokens" INTEGER NOT NULL,
    "completion_tokens" INTEGER NOT NULL,
    "total_tokens" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GenAITokenUsage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GenAITokenUsage" ("completion_tokens", "created_at", "id", "prompt_tokens", "request_type", "total_tokens", "user_id") SELECT "completion_tokens", "created_at", "id", "prompt_tokens", "request_type", "total_tokens", "user_id" FROM "GenAITokenUsage";
DROP TABLE "GenAITokenUsage";
ALTER TABLE "new_GenAITokenUsage" RENAME TO "GenAITokenUsage";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

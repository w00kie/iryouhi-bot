-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "telegram_id" BIGINT NOT NULL,
    "username" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "storage_url" TEXT NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "patient_name" TEXT NOT NULL,
    "vendor_name" TEXT NOT NULL,
    "bill_type" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenAITokenUsage" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "request_type" TEXT NOT NULL,
    "model_name" TEXT NOT NULL DEFAULT 'gpt-4o',
    "prompt_tokens" INTEGER NOT NULL,
    "completion_tokens" INTEGER NOT NULL,
    "total_tokens" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenAITokenUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegram_id_key" ON "User"("telegram_id");

-- CreateIndex
CREATE INDEX "Receipt_user_id_processed_issue_date_idx" ON "Receipt"("user_id", "processed", "issue_date");

-- CreateIndex
CREATE INDEX "Receipt_user_id_processed_patient_name_idx" ON "Receipt"("user_id", "processed", "patient_name");

-- CreateIndex
CREATE INDEX "Receipt_user_id_processed_vendor_name_idx" ON "Receipt"("user_id", "processed", "vendor_name");

-- CreateIndex
CREATE UNIQUE INDEX "Session_key_key" ON "Session"("key");

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenAITokenUsage" ADD CONSTRAINT "GenAITokenUsage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

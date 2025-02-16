-- CreateIndex
CREATE INDEX "Receipt_user_id_processed_issue_date_idx" ON "Receipt"("user_id", "processed", "issue_date");

-- CreateIndex
CREATE INDEX "Receipt_user_id_processed_patient_name_idx" ON "Receipt"("user_id", "processed", "patient_name");

-- CreateIndex
CREATE INDEX "Receipt_user_id_processed_vendor_name_idx" ON "Receipt"("user_id", "processed", "vendor_name");

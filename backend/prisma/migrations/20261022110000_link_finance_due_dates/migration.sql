ALTER TABLE "FinanceBill" ADD COLUMN "sourceEntryId" INTEGER;
CREATE UNIQUE INDEX "FinanceBill_sourceEntryId_key" ON "FinanceBill"("sourceEntryId");
ALTER TABLE "FinanceBill" ADD CONSTRAINT "FinanceBill_sourceEntryId_fkey" FOREIGN KEY ("sourceEntryId") REFERENCES "FinanceEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

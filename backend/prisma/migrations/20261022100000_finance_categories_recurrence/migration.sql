ALTER TABLE "FinanceEntry" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'Outros';
ALTER TABLE "FinanceBill" ADD COLUMN "recurrence" TEXT NOT NULL DEFAULT 'ONCE';
UPDATE "FinanceBill" SET "recurrence" = 'MONTHLY' WHERE "monthly" = true;

CREATE TABLE "FinanceBill" (
 "id" SERIAL PRIMARY KEY, "userId" INTEGER NOT NULL, "title" TEXT NOT NULL,
 "kind" TEXT NOT NULL DEFAULT 'EXPENSE', "category" TEXT NOT NULL DEFAULT 'Outros', "description" TEXT,
 "amountCents" INTEGER NOT NULL, "firstDueDate" DATE NOT NULL, "monthly" BOOLEAN NOT NULL DEFAULT false,
 "endDate" DATE, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "FinanceBill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "FinanceBill_userId_idx" ON "FinanceBill"("userId");
CREATE TABLE "FinanceBillOccurrence" (
 "id" SERIAL PRIMARY KEY, "billId" INTEGER NOT NULL, "referenceDate" DATE NOT NULL, "dueDate" DATE NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING', "amountCents" INTEGER NOT NULL, "paidAt" DATE, "reason" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "FinanceBillOccurrence_billId_fkey" FOREIGN KEY ("billId") REFERENCES "FinanceBill"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FinanceBillOccurrence_billId_referenceDate_key" ON "FinanceBillOccurrence"("billId", "referenceDate");
CREATE INDEX "FinanceBillOccurrence_dueDate_idx" ON "FinanceBillOccurrence"("dueDate");
CREATE TABLE "FinanceBillEvent" (
 "id" SERIAL PRIMARY KEY, "occurrenceId" INTEGER NOT NULL, "status" TEXT NOT NULL,
 "dueDate" DATE NOT NULL, "paidAt" DATE, "reason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "FinanceBillEvent_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "FinanceBillOccurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "FinanceBillEvent_occurrenceId_idx" ON "FinanceBillEvent"("occurrenceId");

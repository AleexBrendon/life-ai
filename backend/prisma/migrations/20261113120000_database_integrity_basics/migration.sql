-- Atomic migration: invalid legacy rows abort the entire change without modifying data.
-- CHECK constraints are maintained in SQL because Prisma cannot express them.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- PostgreSQL does not automatically index the referencing side of foreign keys.
CREATE INDEX "Job_userId_idx" ON "Job"("userId");
CREATE INDEX "JobTaskEvent_userId_idx" ON "JobTaskEvent"("userId");
CREATE INDEX "WorkSchedule_jobId_idx" ON "WorkSchedule"("jobId");
CREATE INDEX "RoutineItem_userId_idx" ON "RoutineItem"("userId");
CREATE INDEX "RoutineSchedule_routineItemId_idx" ON "RoutineSchedule"("routineItemId");
CREATE INDEX "RoutineExecution_routineItemId_idx" ON "RoutineExecution"("routineItemId");
CREATE INDEX "RoutineExecution_routineScheduleId_idx" ON "RoutineExecution"("routineScheduleId");
CREATE INDEX "ReminderExecution_reminderId_idx" ON "ReminderExecution"("reminderId");

ALTER TABLE "WorkSchedule" ADD CONSTRAINT "WorkSchedule_dayOfWeek_check"
  CHECK ("dayOfWeek" BETWEEN 0 AND 6);
ALTER TABLE "RoutineSchedule" ADD CONSTRAINT "RoutineSchedule_dayOfWeek_check"
  CHECK ("dayOfWeek" BETWEEN 0 AND 6);
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_dayOfWeek_check"
  CHECK ("dayOfWeek" IS NULL OR "dayOfWeek" BETWEEN 0 AND 6);
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_weekStartsOn_check"
  CHECK ("weekStartsOn" IN (0, 1));
ALTER TABLE "WaterIntake" ADD CONSTRAINT "WaterIntake_amountMl_check"
  CHECK ("amountMl" > 0);
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_amounts_check"
  CHECK ("amountCents" > 0 AND "savedCents" >= 0 AND "monthlyCents" >= 0
    AND "savedCents" <= "amountCents" AND "installments" BETWEEN 1 AND 360);
ALTER TABLE "FinanceBill" ADD CONSTRAINT "FinanceBill_amountCents_check"
  CHECK ("amountCents" > 0);
ALTER TABLE "FinanceBillOccurrence" ADD CONSTRAINT "FinanceBillOccurrence_amountCents_check"
  CHECK ("amountCents" > 0);
ALTER TABLE "FinanceBill" ADD CONSTRAINT "FinanceBill_dateRange_check"
  CHECK ("endDate" IS NULL OR "endDate" >= "firstDueDate");
ALTER TABLE "JobTaskTimeLog" ADD CONSTRAINT "JobTaskTimeLog_interval_check"
  CHECK ("endedAt" IS NULL OR "endedAt" >= "startedAt");

COMMIT;

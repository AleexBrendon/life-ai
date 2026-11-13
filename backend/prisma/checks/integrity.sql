-- Read-only preflight for 20261113120000_database_integrity_basics.
-- Report counts only: do not expose names, emails or financial values.
SELECT 'WorkSchedule_dayOfWeek_check' AS constraint_name, count(*)::integer AS invalid_rows
FROM "WorkSchedule" WHERE NOT ("dayOfWeek" BETWEEN 0 AND 6)
UNION ALL SELECT 'RoutineSchedule_dayOfWeek_check', count(*)::integer
FROM "RoutineSchedule" WHERE NOT ("dayOfWeek" BETWEEN 0 AND 6)
UNION ALL SELECT 'Reminder_dayOfWeek_check', count(*)::integer
FROM "Reminder" WHERE NOT ("dayOfWeek" IS NULL OR "dayOfWeek" BETWEEN 0 AND 6)
UNION ALL SELECT 'Profile_weekStartsOn_check', count(*)::integer
FROM "Profile" WHERE "weekStartsOn" NOT IN (0, 1)
UNION ALL SELECT 'WaterIntake_amountMl_check', count(*)::integer
FROM "WaterIntake" WHERE "amountMl" <= 0
UNION ALL SELECT 'FinanceEntry_amounts_check', count(*)::integer
FROM "FinanceEntry" WHERE NOT ("amountCents" > 0 AND "savedCents" >= 0 AND "monthlyCents" >= 0
  AND "savedCents" <= "amountCents" AND "installments" BETWEEN 1 AND 360)
UNION ALL SELECT 'FinanceBill_amountCents_check', count(*)::integer
FROM "FinanceBill" WHERE "amountCents" <= 0
UNION ALL SELECT 'FinanceBillOccurrence_amountCents_check', count(*)::integer
FROM "FinanceBillOccurrence" WHERE "amountCents" <= 0
UNION ALL SELECT 'FinanceBill_dateRange_check', count(*)::integer
FROM "FinanceBill" WHERE "endDate" < "firstDueDate"
UNION ALL SELECT 'JobTaskTimeLog_interval_check', count(*)::integer
FROM "JobTaskTimeLog" WHERE "endedAt" < "startedAt"
ORDER BY constraint_name;

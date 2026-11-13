const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

const migrationRoot = path.resolve(__dirname, '../../prisma/migrations');
const migrationName = '20261113120000_database_integrity_basics';
const migration = readFileSync(path.join(migrationRoot, migrationName, 'migration.sql'), 'utf8');
const preflight = readFileSync(path.resolve(__dirname, '../../prisma/checks/integrity.sql'), 'utf8');

async function previousDatabase() {
  const db = new PGlite(); // In-memory PostgreSQL: no .env, network or application data.
  try {
    for (const name of readdirSync(migrationRoot).sort()) {
      if (name >= migrationName) continue;
      if (!/^\d/.test(name)) continue;
      await db.exec(readFileSync(path.join(migrationRoot, name, 'migration.sql'), 'utf8'));
    }
    await db.exec(`
      INSERT INTO "User" (id, name, email, "passwordHash", "updatedAt") VALUES (1, 'Test', 'db@example.invalid', 'test', now());
      INSERT INTO "Profile" (id, "userId", "updatedAt") VALUES (1, 1, now());
      INSERT INTO "Job" (id, "userId", name, "updatedAt") VALUES (1, 1, 'Test', now());
      INSERT INTO "WorkSchedule" (id, "jobId", "dayOfWeek", "startTime", "endTime", "updatedAt") VALUES (1, 1, 0, '08:00', '17:00', now());
      INSERT INTO "RoutineItem" (id, "userId", name, type, "updatedAt") VALUES (1, 1, 'Test', 'Test', now());
      INSERT INTO "RoutineSchedule" (id, "routineItemId", "dayOfWeek", "startTime", "endTime", "updatedAt") VALUES (1, 1, 6, '08:00', '09:00', now());
      INSERT INTO "Reminder" (id, "userId", title, "reminderTime", "updatedAt") VALUES (1, 1, 'Test', '08:00', now());
      INSERT INTO "WaterIntake" (id, "userId", "amountMl", date) VALUES (1, 1, 250, '2026-11-13');
      INSERT INTO "FinanceEntry" (id, "userId", kind, title, "amountCents") VALUES (1, 1, 'EXPENSE', 'Test', 100);
      INSERT INTO "FinanceBill" (id, "userId", title, "amountCents", "firstDueDate", "updatedAt") VALUES (1, 1, 'Test', 100, '2026-11-13', now());
      INSERT INTO "FinanceBillOccurrence" (id, "billId", "referenceDate", "dueDate", "amountCents", "updatedAt") VALUES (1, 1, '2026-11-13', '2026-11-13', 100, now());
      INSERT INTO "JobTask" (id, "jobId", title, "updatedAt") VALUES (1, 1, 'Test', now());
      INSERT INTO "JobTaskTimeLog" (id, "userId", "taskId", "startedAt") VALUES (1, 1, 1, '2026-11-13 08:00');
    `);
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}

const invalidChanges = [
  ['WorkSchedule_dayOfWeek_check', 'UPDATE "WorkSchedule" SET "dayOfWeek" = 7 WHERE id = 1'],
  ['RoutineSchedule_dayOfWeek_check', 'UPDATE "RoutineSchedule" SET "dayOfWeek" = -1 WHERE id = 1'],
  ['Reminder_dayOfWeek_check', 'UPDATE "Reminder" SET "dayOfWeek" = 7 WHERE id = 1'],
  ['Profile_weekStartsOn_check', 'UPDATE "Profile" SET "weekStartsOn" = 2 WHERE id = 1'],
  ['WaterIntake_amountMl_check', 'UPDATE "WaterIntake" SET "amountMl" = 0 WHERE id = 1'],
  ['FinanceEntry_amounts_check', 'UPDATE "FinanceEntry" SET "amountCents" = 0 WHERE id = 1'],
  ['FinanceEntry_amounts_check', 'UPDATE "FinanceEntry" SET "savedCents" = 101 WHERE id = 1'],
  ['FinanceEntry_amounts_check', 'UPDATE "FinanceEntry" SET "monthlyCents" = -1 WHERE id = 1'],
  ['FinanceEntry_amounts_check', 'UPDATE "FinanceEntry" SET installments = 0 WHERE id = 1'],
  ['FinanceEntry_amounts_check', 'UPDATE "FinanceEntry" SET installments = 361 WHERE id = 1'],
  ['FinanceBill_amountCents_check', 'UPDATE "FinanceBill" SET "amountCents" = -1 WHERE id = 1'],
  ['FinanceBillOccurrence_amountCents_check', 'UPDATE "FinanceBillOccurrence" SET "amountCents" = 0 WHERE id = 1'],
  ['FinanceBill_dateRange_check', `UPDATE "FinanceBill" SET "endDate" = '2026-11-12' WHERE id = 1`],
  ['JobTaskTimeLog_interval_check', `UPDATE "JobTaskTimeLog" SET "endedAt" = '2026-11-13 07:59' WHERE id = 1`],
];

test('migration preserves valid data, adds FK indexes and rejects invalid writes', async t => {
  const db = await previousDatabase();
  t.after(() => db.close());
  const before = await db.query('SELECT * FROM "FinanceBill"');
  await db.exec(migration);
  assert.deepEqual((await db.query('SELECT * FROM "FinanceBill"')).rows, before.rows);
  const checks = (await db.query(preflight)).rows;
  assert.equal(checks.length, 10);
  assert.ok(checks.every(row => row.invalid_rows === 0));
  const indexes = (await db.query(`SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`)).rows.map(row => row.indexname);
  for (const name of ['Job_userId_idx', 'JobTaskEvent_userId_idx', 'WorkSchedule_jobId_idx', 'RoutineItem_userId_idx', 'RoutineSchedule_routineItemId_idx', 'RoutineExecution_routineItemId_idx', 'RoutineExecution_routineScheduleId_idx', 'ReminderExecution_reminderId_idx']) {
    assert.ok(indexes.includes(name), name);
  }
  for (const [constraint, sql] of invalidChanges) {
    await t.test(sql, async () => {
      await assert.rejects(db.exec(sql), error => error.code === '23514' && error.constraint === constraint);
    });
  }
  await t.test('accepts boundaries and optional fields', async () => {
    await db.exec(`
      UPDATE "WorkSchedule" SET "dayOfWeek" = 6;
      UPDATE "RoutineSchedule" SET "dayOfWeek" = 0;
      UPDATE "Reminder" SET "dayOfWeek" = NULL;
      UPDATE "Profile" SET "weekStartsOn" = 0;
      UPDATE "FinanceEntry" SET "savedCents" = "amountCents", installments = 360;
      UPDATE "FinanceBill" SET "endDate" = "firstDueDate";
      UPDATE "JobTaskTimeLog" SET "endedAt" = "startedAt";
      UPDATE "JobTaskTimeLog" SET "endedAt" = NULL;
    `);
  });
});

test('preflight detects legacy violations and failed migration rolls back all DDL', async t => {
  const db = await previousDatabase();
  t.after(() => db.close());
  for (const [constraint, sql] of invalidChanges) {
    await db.exec('BEGIN');
    try {
      await db.exec(sql);
      assert.deepEqual((await db.query(preflight)).rows.filter(row => row.invalid_rows > 0), [
        { constraint_name: constraint, invalid_rows: 1 },
      ], sql);
    } finally {
      await db.exec('ROLLBACK');
    }
  }
  await db.exec('UPDATE "WorkSchedule" SET "dayOfWeek" = 9');
  const violations = (await db.query(preflight)).rows.filter(row => row.invalid_rows > 0);
  assert.deepEqual(violations, [{ constraint_name: 'WorkSchedule_dayOfWeek_check', invalid_rows: 1 }]);
  await assert.rejects(db.exec(migration), error => error.code === '23514');
  await db.exec('ROLLBACK');
  assert.equal((await db.query('SELECT "dayOfWeek" FROM "WorkSchedule"')).rows[0].dayOfWeek, 9);
  assert.equal((await db.query(`SELECT 1 FROM pg_indexes WHERE indexname = 'Job_userId_idx'`)).rows.length, 0);
  assert.equal((await db.query(`SELECT 1 FROM pg_constraint WHERE conname = 'WorkSchedule_dayOfWeek_check'`)).rows.length, 0);
});

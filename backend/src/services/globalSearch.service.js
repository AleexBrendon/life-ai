const { Prisma } = require('@prisma/client');
const { z } = require('zod');
const querySchema = z.object({
  q: z.string().trim().min(2).max(100),
  kind: z.enum(['rotinas','metas','trabalho','tarefas','lembretes','imprevistos','financas']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(5000).default(0),
}).strict();
const literal = value => value.replace(/[\\%_]/g, character => '\\' + character);

async function globalSearch(db, userId, query) {
  const { q, kind, limit, offset } = querySchema.parse(query);
  const pattern = '%' + literal(q) + '%', prefix = literal(q) + '%';
  // One parameterized statement: ownership is enforced in every branch before search.
  const rows = await db.$queryRaw(Prisma.sql`
    WITH records AS (
      SELECT 'rotinas' AS kind, 'routineItem' AS type, "id", "name" AS title, "type" AS description FROM "RoutineItem" WHERE "userId"=${userId}
      UNION ALL SELECT 'metas', 'goal', "id", "title", COALESCE("description", '') FROM "Goal" WHERE "userId"=${userId}
      UNION ALL SELECT 'trabalho', 'job', "id", "name", COALESCE("company", '') || ' ' || COALESCE("position", '') || ' ' || COALESCE("location", '') FROM "Job" WHERE "userId"=${userId}
      UNION ALL SELECT 'tarefas', 'jobTask', task."id", task."title", COALESCE(task."description", '') FROM "JobTask" task JOIN "Job" job ON job."id"=task."jobId" WHERE job."userId"=${userId}
      UNION ALL SELECT 'lembretes', 'reminder', "id", "title", COALESCE("description", '') FROM "Reminder" WHERE "userId"=${userId}
      UNION ALL SELECT 'imprevistos', 'unexpectedEvent', "id", "title", COALESCE("description", '') FROM "UnexpectedEvent" WHERE "userId"=${userId}
      UNION ALL SELECT 'financas', 'financeEntry', "id", "title", "category" FROM "FinanceEntry" WHERE "userId"=${userId}
      UNION ALL SELECT 'financas', 'financeBill', "id", "title", COALESCE("description", '') || ' ' || "category" FROM "FinanceBill" WHERE "userId"=${userId}
    )
    SELECT kind, type, id, title, LEFT(description,240) AS excerpt FROM records
    WHERE (${kind || null}::text IS NULL OR kind=${kind || null}) AND (title ILIKE ${pattern} OR description ILIKE ${pattern})
    ORDER BY CASE WHEN title ILIKE ${prefix} THEN 0 ELSE 1 END, type, id
    LIMIT ${limit + 1} OFFSET ${offset}
  `);
  const hasMore = rows.length > limit;
  return { items: rows.slice(0, limit).map(row => ({ ...row, href: row.kind === 'financas' ? '/financeiro' : `/planejamento?aba=${row.kind === 'tarefas' ? 'trabalho' : row.kind}` })), hasMore, nextOffset: hasMore && offset + limit <= 5000 ? offset + limit : null };
}
module.exports = { globalSearch, querySchema };

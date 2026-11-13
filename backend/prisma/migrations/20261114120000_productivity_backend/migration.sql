BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE "ChangeEvent" (
 "id" SERIAL PRIMARY KEY,
 "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "action" TEXT NOT NULL, "kind" TEXT NOT NULL, "sourceId" INTEGER NOT NULL,
 "date" TEXT, "before" JSONB NOT NULL, "after" JSONB NOT NULL,
 "reversible" BOOLEAN NOT NULL DEFAULT false, "undoneAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ChangeEvent_userId_id_idx" ON "ChangeEvent"("userId", "id");
CREATE INDEX "ChangeEvent_userId_kind_sourceId_id_idx" ON "ChangeEvent"("userId", "kind", "sourceId", "id");
CREATE TABLE "ScheduleChangePreview" (
 "id" TEXT PRIMARY KEY,
 "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "input" JSONB NOT NULL, "fingerprint" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING', "expiresAt" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ScheduleChangePreview_userId_createdAt_idx" ON "ScheduleChangePreview"("userId", "createdAt");
CREATE INDEX "ScheduleChangePreview_expiresAt_idx" ON "ScheduleChangePreview"("expiresAt");
COMMIT;

BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE "CalendarConnection" (
 "id" SERIAL PRIMARY KEY, "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "name" TEXT NOT NULL, "encryptedUrl" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "CalendarConnection_userId_idx" ON "CalendarConnection"("userId");
CREATE TABLE "CalendarImport" (
 "id" SERIAL PRIMARY KEY, "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "sourceKey" TEXT NOT NULL, "name" TEXT NOT NULL, "rows" JSONB NOT NULL, "fingerprint" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING', "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "CalendarImport_userId_createdAt_idx" ON "CalendarImport"("userId", "createdAt");
CREATE TABLE "CalendarLink" (
 "id" SERIAL PRIMARY KEY, "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "sourceKey" TEXT NOT NULL, "externalKey" TEXT NOT NULL, "eventId" INTEGER UNIQUE REFERENCES "UnexpectedEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "lastAppliedHash" TEXT NOT NULL,
 UNIQUE("userId","sourceKey","externalKey")
);
CREATE TABLE "PushPreference" (
 "userId" INTEGER PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "enabled" BOOLEAN NOT NULL DEFAULT false, "quietEnabled" BOOLEAN NOT NULL DEFAULT true,
 "quietStart" TEXT NOT NULL DEFAULT '22:00', "quietEnd" TEXT NOT NULL DEFAULT '07:00',
 "upcoming" BOOLEAN NOT NULL DEFAULT true, "hydration" BOOLEAN NOT NULL DEFAULT true,
 "actions" BOOLEAN NOT NULL DEFAULT false, "showDetails" BOOLEAN NOT NULL DEFAULT false
);
CREATE TABLE "PushSubscription" (
 "id" SERIAL PRIMARY KEY, "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "endpoint" TEXT NOT NULL UNIQUE, "keys" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");
CREATE TABLE "PushDelivery" (
 "id" SERIAL PRIMARY KEY, "notificationId" INTEGER NOT NULL REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "subscriptionId" INTEGER NOT NULL REFERENCES "PushSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "status" TEXT NOT NULL DEFAULT 'PENDING', "attempts" INTEGER NOT NULL DEFAULT 0,
 "lockedUntil" TIMESTAMP(3), "sentAt" TIMESTAMP(3), "errorCode" TEXT,
 UNIQUE("notificationId","subscriptionId")
);
CREATE INDEX "PushDelivery_status_lockedUntil_idx" ON "PushDelivery"("status","lockedUntil");
CREATE TABLE "WeeklyReview" (
 "id" SERIAL PRIMARY KEY, "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "weekStart" DATE NOT NULL, "metrics" JSONB NOT NULL, "suggestions" JSONB NOT NULL,
 "accepted" JSONB NOT NULL DEFAULT '[]', "notes" TEXT NOT NULL DEFAULT '',
 "status" TEXT NOT NULL DEFAULT 'DRAFT', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 UNIQUE("userId","weekStart")
);
CREATE TABLE "GoalMilestone" (
 "id" SERIAL PRIMARY KEY, "goalId" INTEGER NOT NULL REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "title" TEXT NOT NULL, "unit" TEXT NOT NULL DEFAULT 'unidades', "target" DOUBLE PRECISION NOT NULL CHECK ("target" > 0 AND "target" < 'Infinity'::float8),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "GoalMilestone_goalId_idx" ON "GoalMilestone"("goalId");
CREATE TABLE "MilestoneProgress" (
 "id" SERIAL PRIMARY KEY, "milestoneId" INTEGER NOT NULL REFERENCES "GoalMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "sessionId" INTEGER REFERENCES "GoalPlanSession"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "amount" DOUBLE PRECISION NOT NULL CHECK ("amount" > 0 AND "amount" < 'Infinity'::float8), "note" TEXT NOT NULL DEFAULT '',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("milestoneId","sessionId")
);
CREATE INDEX "MilestoneProgress_sessionId_idx" ON "MilestoneProgress"("sessionId");
CREATE TABLE "SyncReceipt" (
 "id" SERIAL PRIMARY KEY, "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "operationId" TEXT NOT NULL, "hash" TEXT NOT NULL, "result" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("userId","operationId")
);
COMMIT;

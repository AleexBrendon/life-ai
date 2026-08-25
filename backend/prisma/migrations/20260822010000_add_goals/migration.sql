CREATE TABLE "Goal" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" TIMESTAMP(3),
    "weeklyFrequency" INTEGER NOT NULL DEFAULT 3,
    "sessionMinutes" INTEGER NOT NULL DEFAULT 60,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "GoalPlanSession" (
    "id" SERIAL NOT NULL,
    "goalId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GoalPlanSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Goal_userId_status_idx" ON "Goal"("userId", "status");
CREATE INDEX "GoalPlanSession_goalId_date_idx" ON "GoalPlanSession"("goalId", "date");
CREATE UNIQUE INDEX "GoalPlanSession_goalId_date_startTime_key" ON "GoalPlanSession"("goalId", "date", "startTime");
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoalPlanSession" ADD CONSTRAINT "GoalPlanSession_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

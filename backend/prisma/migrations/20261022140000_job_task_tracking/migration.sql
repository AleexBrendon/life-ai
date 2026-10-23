
-- AlterTable
ALTER TABLE "JobTask" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "dueDate" DATE,
ADD COLUMN     "estimatedMinutes" INTEGER,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "project" TEXT,
ADD COLUMN     "repositoryUrl" TEXT;

-- CreateTable
CREATE TABLE "JobTaskTimeLog" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobTaskTimeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobTaskEvent" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobTaskEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobTaskTimeLog_userId_startedAt_idx" ON "JobTaskTimeLog"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "JobTaskTimeLog_taskId_idx" ON "JobTaskTimeLog"("taskId");

-- CreateIndex
CREATE INDEX "JobTaskEvent_taskId_createdAt_idx" ON "JobTaskEvent"("taskId", "createdAt");

-- AddForeignKey
ALTER TABLE "JobTaskTimeLog" ADD CONSTRAINT "JobTaskTimeLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "JobTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTaskTimeLog" ADD CONSTRAINT "JobTaskTimeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTaskEvent" ADD CONSTRAINT "JobTaskEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "JobTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTaskEvent" ADD CONSTRAINT "JobTaskEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


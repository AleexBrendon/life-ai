-- CreateTable
CREATE TABLE "RoutineExecution" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "routineItemId" INTEGER NOT NULL,
    "routineScheduleId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutineExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoutineExecution_userId_date_idx" ON "RoutineExecution"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RoutineExecution_userId_routineScheduleId_date_key" ON "RoutineExecution"("userId", "routineScheduleId", "date");

-- AddForeignKey
ALTER TABLE "RoutineExecution" ADD CONSTRAINT "RoutineExecution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineExecution" ADD CONSTRAINT "RoutineExecution_routineItemId_fkey" FOREIGN KEY ("routineItemId") REFERENCES "RoutineItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineExecution" ADD CONSTRAINT "RoutineExecution_routineScheduleId_fkey" FOREIGN KEY ("routineScheduleId") REFERENCES "RoutineSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

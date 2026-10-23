
-- CreateTable
CREATE TABLE "RoutineCycle" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "optionId" TEXT NOT NULL,
    "recommendationId" INTEGER,
    "template" JSONB NOT NULL,
    "metrics" JSONB,
    "performance" JSONB,
    "goalSessionIds" JSONB,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutineCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineCheckin" (
    "id" SERIAL NOT NULL,
    "cycleId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "step" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoutineCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoutineCycle_userId_status_idx" ON "RoutineCycle"("userId", "status");

-- CreateIndex
CREATE INDEX "RoutineCheckin_userId_idx" ON "RoutineCheckin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RoutineCheckin_cycleId_step_key" ON "RoutineCheckin"("cycleId", "step");

-- AddForeignKey
ALTER TABLE "RoutineCycle" ADD CONSTRAINT "RoutineCycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineCheckin" ADD CONSTRAINT "RoutineCheckin_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "RoutineCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineCheckin" ADD CONSTRAINT "RoutineCheckin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


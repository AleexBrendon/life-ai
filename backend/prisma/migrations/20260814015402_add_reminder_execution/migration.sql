-- CreateTable
CREATE TABLE "ReminderExecution" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "reminderId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReminderExecution_userId_date_idx" ON "ReminderExecution"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderExecution_userId_reminderId_date_key" ON "ReminderExecution"("userId", "reminderId", "date");

-- AddForeignKey
ALTER TABLE "ReminderExecution" ADD CONSTRAINT "ReminderExecution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderExecution" ADD CONSTRAINT "ReminderExecution_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "Reminder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

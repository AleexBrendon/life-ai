-- CreateTable
CREATE TABLE "UnexpectedEvent" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnexpectedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnexpectedEvent_userId_date_idx" ON "UnexpectedEvent"("userId", "date");

-- AddForeignKey
ALTER TABLE "UnexpectedEvent" ADD CONSTRAINT "UnexpectedEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

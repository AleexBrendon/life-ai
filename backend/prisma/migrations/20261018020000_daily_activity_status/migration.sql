CREATE TABLE "ActivityExecution" (
 "id" SERIAL PRIMARY KEY, "userId" INTEGER NOT NULL, "kind" TEXT NOT NULL,
 "sourceId" INTEGER NOT NULL, "date" DATE NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
 "skipReason" TEXT, "completedAt" TIMESTAMP(3),
 CONSTRAINT "ActivityExecution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ActivityExecution_userId_kind_sourceId_date_key" ON "ActivityExecution"("userId", "kind", "sourceId", "date");
CREATE INDEX "ActivityExecution_userId_date_idx" ON "ActivityExecution"("userId", "date");

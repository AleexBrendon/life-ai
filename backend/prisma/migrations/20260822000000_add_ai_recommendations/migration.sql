CREATE TABLE "AIRecommendation" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" INTEGER,
    "reason" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "changes" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AIRecommendation_userId_status_idx" ON "AIRecommendation"("userId", "status");
CREATE INDEX "AIRecommendation_userId_date_idx" ON "AIRecommendation"("userId", "date");

ALTER TABLE "AIRecommendation" ADD CONSTRAINT "AIRecommendation_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

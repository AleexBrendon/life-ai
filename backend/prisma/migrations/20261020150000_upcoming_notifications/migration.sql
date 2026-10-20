ALTER TABLE "Profile" ADD COLUMN "notifyUpcoming" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Notification" ADD COLUMN "dedupKey" TEXT;
CREATE UNIQUE INDEX "Notification_dedupKey_key" ON "Notification"("dedupKey");

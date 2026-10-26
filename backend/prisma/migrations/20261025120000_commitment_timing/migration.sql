ALTER TABLE "Job" ADD COLUMN "preparationMinutes" INTEGER, ADD COLUMN "outboundMinutes" INTEGER, ADD COLUMN "returnMinutes" INTEGER, ADD COLUMN "travelDuringBreak" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RoutineItem" ADD COLUMN "preparationMinutes" INTEGER, ADD COLUMN "outboundMinutes" INTEGER, ADD COLUMN "returnMinutes" INTEGER;

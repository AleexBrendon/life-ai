ALTER TABLE "RoutineItem" ADD COLUMN "locationMode" TEXT;
UPDATE "RoutineItem" SET "locationMode" = 'ONSITE' WHERE COALESCE("outboundMinutes",0) > 0 OR COALESCE("returnMinutes",0) > 0;

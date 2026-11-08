-- Each item becomes its own listing with its own bidding window, replacing the auction-wide close time and switch.
-- (Columns are UTC "timestamp without time zone", so "now" is always taken AT TIME ZONE 'utc'.)
ALTER TABLE "Item"
  ADD COLUMN "startsAt" TIMESTAMP(3) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  ADD COLUMN "endsAt" TIMESTAMP(3) NOT NULL DEFAULT ((now() AT TIME ZONE 'utc') + interval '7 days'),
  ADD COLUMN "hiddenUntilStart" BOOLEAN NOT NULL DEFAULT false;

-- Existing items: open since they were created, ending at the old auction-wide close time if one was set...
UPDATE "Item" SET
  "startsAt" = "createdAt",
  "endsAt" = COALESCE((SELECT "endsAt" FROM "Auction" WHERE "id" = 1), "endsAt");
-- ...or straight away if bidding had been closed with the switch.
UPDATE "Item" SET "endsAt" = LEAST("endsAt", now() AT TIME ZONE 'utc')
WHERE EXISTS (SELECT 1 FROM "Auction" WHERE "id" = 1 AND "closed");

-- From now on the app always sets both times.
ALTER TABLE "Item" ALTER COLUMN "startsAt" DROP DEFAULT, ALTER COLUMN "endsAt" DROP DEFAULT;
CREATE INDEX "Item_endsAt_idx" ON "Item"("endsAt");

ALTER TABLE "Auction" DROP COLUMN "endsAt", DROP COLUMN "closed";

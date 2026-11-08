-- More bell notifications: "ending soon" and "new items" (a roll-up of several new items has no single lot).
ALTER TABLE "Notification" ALTER COLUMN "lot" DROP NOT NULL,
ADD COLUMN "count" INTEGER;

ALTER TABLE "Item" ADD COLUMN "endingSoonNotifiedAt" TIMESTAMP(3),
ADD COLUMN "announcedAt" TIMESTAMP(3);

-- Listings that already exist aren't announced as new.
UPDATE "Item" SET "announcedAt" = (now() AT TIME ZONE 'utc');

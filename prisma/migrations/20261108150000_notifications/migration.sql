-- Bell notifications (outbid, won, didn't win).
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "lot" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "amount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Listings that have already ended don't get Won / Didn't win notifications retroactively.
ALTER TABLE "Item" ADD COLUMN "endNotifiedAt" TIMESTAMP(3);
UPDATE "Item" SET "endNotifiedAt" = (now() AT TIME ZONE 'utc') WHERE "endsAt" <= (now() AT TIME ZONE 'utc');

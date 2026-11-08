-- Daily "new items" digest: Admin switch + send hour, last run, and a per-user opt-out.
ALTER TABLE "Auction" ADD COLUMN "emailNewItems" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "digestHour" INTEGER NOT NULL DEFAULT 9,
ADD COLUMN "lastDigestAt" TIMESTAMP(3);

ALTER TABLE "User" ADD COLUMN "emailDigest" BOOLEAN NOT NULL DEFAULT true;

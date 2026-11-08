-- Rename the BIDDER role to USER, keeping existing rows and the column default.
ALTER TYPE "Role" RENAME VALUE 'BIDDER' TO 'USER';

-- Track where each session is signed in from.
ALTER TABLE "Session" ADD COLUMN "ip" TEXT,
ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "userAgent" TEXT;

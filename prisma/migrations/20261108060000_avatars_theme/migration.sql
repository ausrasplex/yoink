-- Profile pictures
ALTER TABLE "User" ADD COLUMN "avatar" TEXT;

-- Server theme (copy and styling variants)
ALTER TABLE "Auction" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'yoink';

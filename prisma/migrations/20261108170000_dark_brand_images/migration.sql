-- Branding: separate icon and landscape logo for dark backgrounds.
ALTER TABLE "Auction" ADD COLUMN "appLogoDark" TEXT,
ADD COLUMN "appLogoWideDark" TEXT;

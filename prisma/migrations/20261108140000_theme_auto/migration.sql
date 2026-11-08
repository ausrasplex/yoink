-- Themes: "auto" switches seasonal themes on by their dates; existing default ("yoink") becomes automatic.
ALTER TABLE "Auction" ALTER COLUMN "theme" SET DEFAULT 'auto';
UPDATE "Auction" SET "theme" = 'auto' WHERE "theme" = 'yoink';

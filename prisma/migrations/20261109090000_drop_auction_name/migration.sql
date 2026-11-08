-- One name for the app: the Branding name (appName). Keep a customised auction name by moving it there, then drop it.
UPDATE "Auction" SET "appName" = "name"
WHERE ("appName" IS NULL OR "appName" = '') AND "name" IS NOT NULL AND "name" <> '' AND "name" <> 'Silent Auction';

ALTER TABLE "Auction" DROP COLUMN "name";

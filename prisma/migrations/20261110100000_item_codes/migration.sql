-- Unguessable QR links: each item gets a secret code (QR codes print /i/<code>), and scanning one records access.

ALTER TABLE "Item" ADD COLUMN "code" TEXT;
-- Existing items: 12 hex characters from gen_random_uuid() (strong randomness, built into Postgres 13+). The first 12
-- characters of a v4 UUID are all random (the fixed version digit comes after them). New items get codes from the app.
UPDATE "Item" SET "code" = substr(replace(gen_random_uuid()::text, '-', ''), 1, 12) WHERE "code" IS NULL;
ALTER TABLE "Item" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "Item_code_key" ON "Item"("code");

CREATE TABLE "ItemAccess" (
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItemAccess_pkey" PRIMARY KEY ("userId","itemId")
);
CREATE INDEX "ItemAccess_itemId_idx" ON "ItemAccess"("itemId");
ALTER TABLE "ItemAccess" ADD CONSTRAINT "ItemAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItemAccess" ADD CONSTRAINT "ItemAccess_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

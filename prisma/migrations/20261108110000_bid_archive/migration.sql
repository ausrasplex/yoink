-- Bidders can archive ended items they didn't win (My Bids → Archive).
CREATE TABLE "BidArchive" (
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BidArchive_pkey" PRIMARY KEY ("userId","itemId")
);

CREATE INDEX "BidArchive_itemId_idx" ON "BidArchive"("itemId");

ALTER TABLE "BidArchive" ADD CONSTRAINT "BidArchive_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BidArchive" ADD CONSTRAINT "BidArchive_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

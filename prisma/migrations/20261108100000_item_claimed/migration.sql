-- Winners mark an ended item as claimed (collected); it then moves to the Claimed tab on My Bids.
ALTER TABLE "Item" ADD COLUMN "claimedAt" TIMESTAMP(3);

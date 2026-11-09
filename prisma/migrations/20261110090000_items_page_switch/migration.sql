-- Admin switch: Users can browse/search all items (default), or reach them only by QR code.
ALTER TABLE "Auction" ADD COLUMN "itemsPageEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Admin-controlled email switches (the Server Admin still owns the SMTP connection itself).
ALTER TABLE "Auction" ADD COLUMN "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "emailPasswordReset" BOOLEAN NOT NULL DEFAULT true;

import "server-only";
import crypto from "node:crypto";

function key() {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("Set APP_SECRET (at least 16 characters) in the environment to store the SMTP password.");
  }
  return crypto.scryptSync(secret, "auction-smtp-v1", 32);
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}

export function decrypt(payload: string): string {
  const [iv, tag, enc] = payload.split(".").map((p) => Buffer.from(p, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

/** Readable temp password without look-alike characters (no 0/O, 1/l/I). */
export function tempPassword(len = 12): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: len }, () => alphabet[crypto.randomInt(alphabet.length)]).join("");
}

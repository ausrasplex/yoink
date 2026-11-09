import crypto from "node:crypto";

/**
 * The secret part of an item's QR link (/i/<code>): 12 characters from 31 that can't be mixed up (no 0/o, 1/l/i),
 * about 59 bits, from the system's secure random source. Long enough that nobody guesses one, short enough to keep
 * the QR code simple. Existing items got 12 hex characters in the migration that added codes; both match ITEM_CODE.
 */
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
export const ITEM_CODE = /^[0-9a-z]{8,32}$/;

export function newItemCode(length = 12): string {
  let out = "";
  while (out.length < length) {
    for (const b of crypto.randomBytes(length * 2)) {
      if (b < 248 && out.length < length) out += ALPHABET[b % 31]; // 248 = 8 × 31: no bias towards early letters
    }
  }
  return out;
}

export const itemCodePath = (code: string) => `/i/${code}`;

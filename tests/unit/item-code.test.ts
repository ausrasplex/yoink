// QR link codes: length, alphabet, and that they don't repeat.  npm run test:unit
import assert from "node:assert/strict";
import { test } from "node:test";
import { ITEM_CODE, itemCodePath, newItemCode } from "../../src/lib/item-code";

test("item codes are 12 unambiguous characters and unique", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 5000; i++) {
    const c = newItemCode();
    assert.match(c, /^[2-9a-hjkmnp-z]{12}$/); // no 0/1/i/l/o
    assert.ok(ITEM_CODE.test(c));
    seen.add(c);
  }
  assert.equal(seen.size, 5000);
  assert.equal(itemCodePath("abc234def567"), "/i/abc234def567");
});

test("codes from the migration (12 hex) also pass; junk doesn't", () => {
  assert.ok(ITEM_CODE.test("0ca2a2441098"));
  for (const bad of ["", "short", "../etc/passwd", "ABCDEF123456", "a".repeat(40), "abc def 1234"]) assert.ok(!ITEM_CODE.test(bad), bad);
});

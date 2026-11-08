# End-to-end checks (Playwright scripts)

Plain Node scripts that drive a real browser against a running app and print `PASS`/`FAIL` lines
(exit code 1 on any failure). They're kept outside the app's `package.json` so the app has no test deps.

```bash
cd tests/e2e
npm install
npx playwright install chromium
```

**They change data, so only run them against a throwaway database**, prepared like this (from the project root):

```bash
npx prisma migrate deploy
npm run seed        # server admin from SERVER_ADMIN_EMAIL / SERVER_ADMIN_PASSWORD (or create it at /setup first)
npm run seed:demo   # demo users/items/bids; alyssa@example.com / demo-password-1; admin admin@example.com / change-me-please
npm run build && npm start      # or npm run dev
```

Then, in order (later scripts depend on earlier ones — `04` changes Alyssa's password to `brand-new-pass-9`, which `05` uses):

```bash
cd tests/e2e
BASE_URL=http://localhost:3000 npm test
```

Re-run `npm run seed:demo` before running the set again. Screenshots land in `tests/e2e/shots/`.

| Script | Covers |
| --- | --- |
| 01-history-icons | admin-only bid history, lot filter, icon-only actions + tooltips |
| 02-search-qr | item search (name / lot), admin search, QR logo upload (and that it still decodes), colour, logo removal |
| 03-item-qr | QR card on the admin item page, PNG/SVG downloads decode to the right lot |
| 04-roles-settings | user vs admin access, user settings: password change, signed-in devices, sign out others |
| 05-mobile | bottom nav, no horizontal scrolling on phone widths (iPhone 13 and 320px) |
| 06-server-admin | server admin kept out of auction pages, branding, admin invite + accept + single use, removing admin access |

`04` and `05` also need the app started with `APP_SECRET` set (any 16+ characters).
`06` needs the server admin's sign-in: `SA_EMAIL=… SA_PASSWORD=… npm test` (it skips itself without them).

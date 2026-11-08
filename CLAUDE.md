# CLAUDE.md — Silent Auction

@AGENTS.md

Context for Claude Code working on this repo. Read this first, then `README.md` for user-facing behaviour.

## What it is
A self-hosted silent auction web app. Guests scan a QR code on an item → `/lot/<n>` → sign in or register → bid.
Each bid must be ≥ current bid + the item's minimum increment (or ≥ starting bid if no bids). Three roles, **not** a hierarchy:
**SERVER_ADMIN** (exactly one, always the first account: server settings — branding, SMTP, env status — and managing admins; no
auction content, can't bid), **ADMIN** (items, users, QR codes, bid history, auction setup; manages USERs only) and
**USER** (browse, bid, My bids, own Settings).

## Stack
- **Next.js 16** (App Router, Turbopack, React 19, server actions + `useActionState`, `output: "standalone"`).
  ⚠️ Next 16 has breaking changes vs. older versions — check `node_modules/next/dist/docs/` before using an API you're unsure of.
- **Postgres + Prisma 6** (`prisma/schema.prisma`, migrations in `prisma/migrations/`).
- **Tailwind v4** + **shadcn/ui on Radix** (`radix-ui` package; style `radix-nova`; components in `src/components/ui/`).
- **lucide-react** icons, **qrcode.react** for QR codes, **nodemailer** for SMTP, **bcryptjs**, **zod**.
- Node 22.

## Commands
```bash
npm run dev            # dev server on :3000
npm run build && npm start
npx tsc --noEmit       # typecheck (run after every change). On a fresh checkout run `npx next typegen`
                       # (or one dev/build) first — Next generates global types like LayoutProps into .next/
npm run lint           # one known error in stock src/components/ui/carousel.tsx — not ours, ignore
npx prisma migrate deploy   # apply migrations
npx prisma generate         # after schema edits (also runs on npm install)
npm run seed           # optional: create/refresh the server admin from SERVER_ADMIN_EMAIL / SERVER_ADMIN_PASSWORD
npm run seed:demo      # demo users/items/bids/photos + demo admin admin@example.com — DESTRUCTIVE: replaces items, bids, USERs
```
E2E scripts: `tests/e2e/` (see its README). Run against a throwaway DB only.

## Layout
```
prisma/            schema.prisma, migrations/, seed.ts (admin), seed-demo.ts (demo data)
src/lib/           server-only helpers
  auth.ts          sessions, getUser/requireUser/requireAdmin/requireServerAdmin/requireManager, canManageUser, hasServerAdmin
  bids.ts          placeBid (transaction + SELECT … FOR UPDATE), returns displaced bidder for outbid email
  auction.ts       getAuction (single row id=1), minNextBid
  listing.ts       per-item bidding windows: phaseOf (scheduled/open/ended), visibleToUsers, openNow (client-safe)
  ratelimit.ts     login/reset attempt limiting (raw SQL, see timezone note)
  crypto.ts        AES-256-GCM for the SMTP password (key from APP_SECRET)
  mail.ts          SMTP: test, outbid, password-reset, admin-invite emails
  uploads.ts       saveImage (photos: raster only) / saveLogo (raster or SVG), PHOTO_NAME / LOGO_NAME patterns
  themes.ts        theme registry + copy(theme, key) wording lookup (Server → Theme; <html data-theme>)
  usage.ts         server-admin usage totals (counts, uploads folder size, pg_database_size)
  svg.ts           SVG repair + allow-list rebuild for logos (xmldom parse, own serialiser) — checks: npm run test:unit
  qr.ts            qrBase(headers) → APP_URL or request origin; logoDataUri() inlines the QR logo
  status.ts, user-data.ts, devices.ts, format.ts (money, initials)
src/app/           routes
  page.tsx (dashboard), items/, lot/[lot]/ (item + bid panel), bids/, settings/ (user), account/password/
  login, register, forgot-password, reset-password/[token], setup (first run: creates the server admin), invite/[token]
  server/ (server admin: page.tsx settings, admins/[id], actions.ts branding+SMTP, admin-actions.ts invites)
  brand/logo (public route serving the app logo — the only upload served without sign-in)
  admin/page.tsx (Manage items + search), admin/items/[id] (edit + QR card), admin/history, admin/users[/id],
  admin/qr (sheet + customise), admin/settings (auction setup), admin/export (CSV)
  admin/user-actions.ts is shared by /admin/users (admin → USERs) and /server/admins (server admin → ADMINs)
  api/lot/[lot]/status (polled every 3 s by the bid panel), uploads/[name] (auth'd image serving)
  actions.ts, reset-actions.ts, admin/*-actions.ts, settings/actions.ts — server actions
src/components/    shell/ (AppShell, sidebar, top bar, mobile nav), admin/, settings/, ui/ (shadcn)
```

## Data model (short)
User(role USER|ADMIN|SERVER_ADMIN, shift?, mustChangePassword, avatar?) · Session(tokenHash, expiresAt, lastSeenAt, userAgent, ip) ·
Auction (single row id=1: name, registrationOpen, terms, login limits, SMTP fields, qrLogo, qrColor, appName?, appLogo?, theme, emailEnabled, emailPasswordReset) ·
Invite(email, name, tokenHash, expiresAt — admin invites, single use, 7 days) ·
Item(lot autoincrement, startingBid, minIncrement, currentBid?, highBidderId?, startsAt, endsAt, hiddenUntilStart) · ItemImage · Bid · LoginAttempt · PasswordReset.
Money is **whole dollars** (Int).

## Conventions & gotchas (learned the hard way)
- **Every admin page/action calls `requireAdmin()`; every server page/action calls `requireServerAdmin()`; every user page calls
  `requireUser(next)`.** Server-side checks only — never rely on hiding UI. `requireUser` sends the server admin to /server unless
  `next` is /server, /settings or /account/password, so pass an accurate `next`. Account actions check `canManageUser(me, target)`.
- **Listings:** every item has its own window; there is no auction-wide close. Any query that lists items for Users must
  apply `visibleToUsers()` (Admins see hidden scheduled listings). Bids check the window inside the locked transaction.
- Until a server admin exists, /login and /register redirect to /setup and registration is refused.
- **Timezone:** Prisma `DateTime` columns are `timestamp without time zone` holding UTC. In raw SQL always use
  `(now() AT TIME ZONE 'utc')`, never bare `now()` — the DB server's timezone may not be UTC (it broke lockouts once).
- **Migrations:** `prisma migrate dev` needs an interactive terminal and a shadow DB (CREATEDB rights). If that's not available,
  hand-write `prisma/migrations/<timestamp>_<name>/migration.sql` and run `migrate deploy`. Never reset a DB that has real data.
- **Tailwind** is wired through the Turbopack rule in `next.config.ts` (`@tailwindcss/turbopack`). If pages render unstyled, check that rule.
- **shadcn Button** supports `asChild` (Radix Slot). Use `<Button asChild><Link …/></Button>` for link buttons.
- **Icon-only actions** use `IconLink` (`src/components/icon-action.tsx`): tooltip + `aria-label`. Keep text labels for primary buttons, with a leading Lucide icon.
- **Tooltips** need a `TooltipProvider` (IconLink includes one).
- **Page titles** take the page's menu icon: `<PageTitle icon={<Boxes />}>`. Menu labels and page titles are Title Case
  ("Manage Items", "Bid History"). Pages fill the shell's content container (`max-w-7xl`): don't cap page wrappers with
  `max-w-2xl/3xl`, which leaves them hugging the left on desktop. Log out lives only in the profile menu.
- **Tables:** use `FilterTable` (`src/components/filter-table.tsx`): click-to-sort headers (A→Z, Z→A, default), a search box
  and `options` dropdowns above the table. Rows have plain `values` (search/filter), optional `sort` keys (dates → epoch), and
  server-rendered `cells`. Optional `selected`/`onSelectedChange` adds
  checkboxes (see `ArchiveTable`).
- **Emails:** every send goes through `transportFromSettings(kind)` in mail.ts, gated by `emailStatusOf` (SMTP set up by the
  Server Admin → Admin master switch → per-kind switch). Add a kind there, plus a switch in NotificationsForm, for new emails.
- **Destructive actions** ask first with `useConfirm()` (`src/components/confirm-dialog.tsx`) — never `window.confirm`.
- **Corner radius:** one scale from `--radius: 0.5rem` in globals.css. Cards `rounded-3xl`; fields (inputs, selects, search,
  date field) and floating panels (select, menu) `rounded-xl` with `p-1.5` and option rows `rounded-md`; buttons, nav
  pills and badges stay `rounded-full`. Don't use arbitrary `rounded-[…]` values.
- **Dropdowns:** use the themed `Select` (`src/components/ui/select.tsx`; `variant="soft"` for toolbars), never a native `<select>`.
  Radix items can't have an empty value — use a sentinel like `"__all"`.
- **Favicon:** comes from the Branding logo via `generateMetadata` in `src/app/layout.tsx`; the default is `public/favicon.ico`.
  Don't add `src/app/favicon.ico` back (Next would always link it and browsers prefer it).
- **File inputs:** use `FileInput` (`src/components/ui/file-input.tsx`), not a bare `<Input type="file">` (the browser's own
  control doesn't line up). It wraps a real file input, so forms submit it normally and e2e `setInputFiles('#id')` still works.
- **Date/time inputs:** `DateTimeField` (themed calendar + time popover; submits ISO/UTC in a hidden field).
- **Background job:** `src/instrumentation.ts` runs the daily digest check (`src/lib/digest.ts`) every 5 min; it's idempotent.
- **Section cards:** use `SectionCard` (`src/components/section-card.tsx`). A section's main form button goes right of the heading
  on desktop and at the end of the form below `lg`: the form component renders the card itself and puts
  `<FormActions where="header">` in `action` and `<FormActions where="footer">` in the form (same `form={useId()}` id).
  Scope e2e lookups to the `section`, not the `form` (the desktop button sits outside the form).
- **React 19 resets uncontrolled form fields after a server action** — use `defaultValue` from returned state if a field must persist.
- Don't export helpers from `"use client"` files for server use; put shared pure helpers in `src/lib/format.ts`.
- Theme: CSS vars in `src/app/globals.css` — `--ink #2a2742` (navy), `--lilac #b9a4fa`, `--peach #fddfba`, `--lime #e9f94c`,
  `--canvas #f1f1f3`; Manrope font; `rounded-3xl` white cards; pill buttons (variants incl. `lime`, `lilac`, `soft`); Badge variants `lime`/`lilac`/`peach`.
- Layout: `AppShell` (sticky sidebar ≥lg, top bar with search, mobile bottom nav) + `PageTitle`. Keep pages free of horizontal scroll at 320px wide.
- Avoid inventing marketing copy in the UI.

## Security model
- Session: random 256-bit token in httpOnly SameSite=Lax cookie (`Secure` unless `COOKIE_SECURE=false`); only SHA-256 stored; 3-day expiry.
- Passwords bcrypt; login limiting per email and per IP (`X-Forwarded-For`, so run behind a proxy that sets it).
- Reset links: single use, 1 h, hashed, no account enumeration, 3 per 15 min per email.
- Uploads: magic-byte check, random names, strict filename regex when serving, signed-in users only.
  Logos may be SVG: always rebuilt by `sanitizeSvg` (never store the original); /uploads never serves .svg; /brand/logo
  (public) serves only the configured logo with `nosniff` and a `sandbox` CSP. If you widen the SVG allow-list, add a case
  to tests/unit/svg.test.ts.
- `APP_SECRET` (16+ chars) encrypts the stored SMTP password — changing it means re-entering that password.

## Environment
See `.env.example`. Key ones: `DATABASE_URL`, `APP_URL` (what QR codes and email links point at), `APP_SECRET`,
`COOKIE_SECURE`, `UPLOAD_DIR`, optional `SERVER_ADMIN_EMAIL`/`SERVER_ADMIN_PASSWORD`/`SERVER_ADMIN_NAME`, optional `ACCESS_CODE` (code required to self-register).

## Status
Done: server admin role (setup, branding, SMTP, admin invites), bidding, QR codes (sheet, per-item card with PNG/SVG download, logo + colour), roles, user settings (password, devices),
admin users/items/history/search/setup, SMTP outbid + forgot-password emails, login limiting, CSV export, Docker.

Known gaps / ideas: lint error in stock carousel.tsx; unit checks only for SVG sanitising (`npm run test:unit`); otherwise `tests/e2e` scripts;
amounts are whole dollars only; no printable label-sheet sizes yet; no real-time push (polling every 3 s).

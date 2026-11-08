# Silent Auction

Next.js (App Router) + Postgres (Prisma) + shadcn/ui. Guests scan a QR code, land on the item
(`/lot/<n>`), sign in (or register) and bid. Each bid must beat the current high bid by at least the
item's minimum increment; the bidder then becomes the leader.

## Run locally
Full walkthrough (external Postgres, phone testing, troubleshooting): **[LOCAL_SETUP.md](LOCAL_SETUP.md)**.
```bash
cp .env.example .env          # edit DATABASE_URL, APP_SECRET etc.
npm install
npx prisma migrate deploy
npm run seed                  # optional: creates the server admin from SERVER_ADMIN_EMAIL / SERVER_ADMIN_PASSWORD
npm run dev
```
Without the `SERVER_ADMIN_*` variables, the first visit opens **/setup**, which creates the server admin (always the first account).

## Run with Docker
```bash
APP_SECRET="$(openssl rand -hex 24)" APP_URL='http://192.168.1.50:3000' docker compose up -d --build
```

## Run on Unraid
The template is `unraid/yoink.xml` (icon: `unraid/icon.png`). It installs only the app; it uses your own PostgreSQL.
1. Push the repo to GitHub. `.github/workflows/docker.yml` builds and publishes `ghcr.io/<you>/yoink` (`latest` from main,
   version tags from `v*` tags). Make the package public, or log Unraid in to ghcr.io.
2. The template points at `ghcr.io/ausrasplex/yoink`; change the user name in `unraid/yoink.xml` if you fork it.
3. On your Postgres server, create an empty database and a user that owns it.
4. In Unraid: **Docker → Add Container**, paste the raw template URL into *Template* (or copy the XML to
   `/boot/config/plugins/dockerMan/templates-user/my-yoink.xml`), then fill in **Database URL**, **Public web address**
   and **Secret key** (`openssl rand -base64 32`). Set **Secure cookies** to `true` behind an HTTPS reverse proxy.
5. Start it and open the WebUI: migrations run automatically on every start, and the first visit creates the server admin
   (unless you filled in the optional Server admin settings).

Uploads live in the **App data** path (`/data`); back it up along with the database.

## Running an event
1. As the **server admin**: set the app name/logo and SMTP on **Server**, then invite admins on **Admins**.
1. As an **admin** → **Admin**: set the auction name (Auction setup).
2. **Add item** (title, description, starting bid, increment, photos) and its listing: start and end time (prefilled now → 7 days)
   and whether Users can see it before it starts ("Visible, starts in…") or not ("Hidden until it starts").
3. **QR codes** → print. Codes point at `APP_URL`, so set it to an address guests' phones can reach.
4. Set `ACCESS_CODE` if you want only people at the event to be able to register.
5. After closing, **Export CSV** gives winners and their emails.

## Listings
Admins see listings in **Manage items → Active** (scheduled and open) and **→ Archived** (ended), where old listings can be
reviewed and deleted one by one or several at once (only ended items can be bulk-deleted; their bids and photos go too).

Each item is its own listing with its own bidding window, like eBay. Bids are accepted from its start time until its end
time (checked on the locked item row against the database clock, so nothing slips in after the deadline). Before it starts an
item shows "Starts in…" or is hidden from Users entirely (lists, search, the dashboard and its QR link 404) — Admins always see
it. Cards, the item page and the dashboard count down on their own, and the item page flips open/closed without a refresh.
Once an item ends its highest bidder has won it ("Won" / "Not won" in My Bids). After collecting it, the winner can
press **Claimed** to move it to their **Claimed** tab (with Undo); only the winner of an ended item can do this. There's no auction-wide closing time.

## Roles
- **Server admin** (exactly one, the first account) keeps the app running, not the auction: **Server** (usage totals —
  items, users, admins, storage —, app name and logo, theme, SMTP email, a read-only view of the environment) and **Admins** (invite by an emailed or copied single-use link valid
  7 days; edit, reset password, sign out, unlock, remove admin access, delete). Inviting an email that already has a user
  account makes that user an admin. It has no access to items, users, bids, QR codes or auction setup, and can't bid.
  It edits its own name and email under **Settings** (changing the email asks for the current password).
- **Admin** runs the auction: items and photos, users, QR codes and the auction setup (Admin section of the sidebar).
  Admins manage user accounts only; they can't create or change admins.
  **Bid history** lists every bid (who, when, amount, leading or outbid), filterable by item; each item row and item page links to its own history.
- **User** can browse, bid, see their bids, and use **Settings** to change their password and see/sign out the devices
  they're signed in on (sign out one device, all other devices, or every device including this one). Admin pages redirect users away, and the check is made on the server for every request.

## QR codes & search
On **QR codes**, tick the codes you want (or *Select all*) and *Print selected*: only those codes are printed, over as many
pages as needed.
Every item gets a QR code automatically (it just encodes `APP_URL/lot/<number>`), so new items show up on **QR codes** straight away. Each item's admin page also shows its code with PNG/SVG downloads (or use the QR icon on the Manage items row). On that page you can add a centre logo (SVG, PNG, JPEG or WebP) and change the code colour; with a logo the error-correction level is raised so codes still scan. Test-scan one printed code after changing them. Items and Manage items both have a search box (name or lot number).

## UI
Every page title has its menu icon on the left (`PageTitle icon=`). Tables (Manage items, Archive, Users, Bid history,
Admins) use `FilterTable`: click a column header to sort A→Z, again for Z→A, a third time for the default order. Above
the table: a search box (any column) and a dropdown for status columns. They work on the rows already loaded (Bid history:
the current page). Destructive actions ask first in a themed dialog (`useConfirm`), and dates/times use a themed picker.

Next.js + Tailwind + [shadcn/ui](https://ui.shadcn.com) on **Radix** primitives. The palette lives in `src/app/globals.css`
(`--ink`, `--lilac`, `--peach`, `--lime`, `--canvas`) and component shapes in `src/components/ui/*`; change those two places to
re-skin the app. Icons come from [Lucide](https://lucide.dev) (`lucide-react`); icon-only row actions use `IconLink` in `src/components/icon-action.tsx`, which adds a tooltip and an accessible label. `npm run seed:demo` loads sample items, bids and users plus a demo admin (`admin@example.com` / `change-me-please`) so you
can look around (**replaces** items, bids and user accounts, so never run it on a real event).

## Admin settings
- **Settings → Registration & login security:** switch self-registration off (add people on **Users** instead), and set
  failed-login limit and lockout length. Counted per email and, at 5x the limit, per IP (read from `X-Forwarded-For`, so run
  behind a reverse proxy that sets it). Locked accounts show a badge on **Users** with an Unlock button.
- **Settings → Emails:** (admin) a master *Send emails* switch plus one per kind: outbid emails (sent after the bid is saved,
  never blocking bidding) and password-reset emails (off hides "Forgot password?") and a **daily new items** email at a chosen hour (venue time), listing
  listings added since the last one; Users can opt out under Settings → Emails. The check runs every 5 minutes from
  `src/instrumentation.ts` (`src/lib/digest.ts`), claims the day atomically so it's sent once, and skips days with nothing new. With the master off nothing is sent, and
  admin invites fall back to a link the server admin shares by hand. They go through the server admin's SMTP connection;
  the Server page notes when admins have switched email off. All gating lives in `emailStatusOf()` in `src/lib/mail.ts`.
- **Settings → Terms & conditions:** shown on every item page.
- **Server → Email (SMTP):** (server admin) SMTP host/port/TLS/login/From. The SMTP password is AES-256-GCM encrypted with `APP_SECRET`. Use *Send test email* to check it.
- **Forgot password:** once SMTP is configured, the login page shows a *Forgot password?* link. It emails a single-use link
  (valid 1 hour, only its hash is stored, newest link replaces older ones). The screen reads the same whether or not the
  address has an account, and requests are limited to 3 per 15 minutes per email. Using the link signs the user out everywhere
  else. Needs `APP_URL` set so the link points at the right address.
- **Server → Theme:** (server admin) *Yoink* (original) or *Britney* ("Oops!… I did it again"). Sets `data-theme` on `<html>` and
  selects wording from `src/lib/themes.ts`; Britney's own wording and styling are still to be written.
- **Profile pictures:** everyone (user, admin, server admin) can add one under **Settings → Profile** (JPEG, PNG or WebP, up to
  5 MB; no SVG). Shown instead of initials in the top bar, Users/Admins lists and bid history.
- **Server → Branding:** (server admin) app name (falls back to the auction name) and logo (SVG, PNG, JPEG or WebP), shown in the sidebar,
  sign-in screens, browser tab and emails. An optional **landscape logo** replaces the icon + name in the sidebar, top bar
  and sign-in screens. Both are served publicly (`/brand/logo`, `/brand/wordmark`) so the sign-in page can show them.
- **Users:** add users (generated temp password shown once), edit name/email/shift, reset password, unlock, delete
  (not if they've bid). Temp passwords force a change at first sign-in; a reset also signs the user out everywhere.

## How it works
- **Sessions:** random 256-bit token in an `httpOnly`, `SameSite=Lax` cookie; only its SHA-256 hash is stored in Postgres. 3-day expiry; sign-out deletes the row.
- **Bidding:** one transaction locks the item row (`SELECT … FOR UPDATE`), re-checks the minimum, writes the bid and updates the leader, so simultaneous bids can't both win.
- **Live updates:** the item page polls `/api/lot/<n>/status` every 3 s while visible.
- **SVG logos:** never stored as uploaded. `src/lib/svg.ts` repairs common damage (.svgz, UTF-16/BOMs, junk around the
  markup, Illustrator entity declarations, stray `&`, undeclared `xlink`, missing viewBox or width/height), parses the XML
  (DOCTYPEs removed first, so no external or nested entities) and rebuilds the file from an allow-list: no scripts, event
  handlers, `foreignObject`, animation, links, external `href`s or CSS `url()`s. `/brand/logo` also serves it with a
  `sandbox` CSP. Files that can't be repaired are rejected with a reason. Checks: `npm run test:unit`. Item photos stay raster-only.
- **Photos:** stored on disk (`UPLOAD_DIR`, a Docker volume), validated by file signature, served only to signed-in users.
- **Amounts** are whole dollars.

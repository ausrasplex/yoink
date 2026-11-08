# Local setup (VS Code + external Postgres)

## 1. Prerequisites
- **Node.js 22** (`node -v`). npm comes with it.
- A **Postgres 14+** server you can reach from your computer (e.g. on your Unraid box or another machine).
- VS Code. Open this folder and accept the recommended extensions (Prisma, Tailwind CSS, ESLint, Claude Code).

## 2. Create the database
On the Postgres server (psql, pgAdmin, Adminer…):
```sql
CREATE USER auction WITH PASSWORD 'choose-a-password';
CREATE DATABASE auction OWNER auction;
```
Make sure the server accepts connections from your PC: `listen_addresses` in `postgresql.conf` and a matching
line in `pg_hba.conf` (e.g. `host auction auction 192.168.1.0/24 scram-sha-256`), and that port 5432 is reachable.
If Postgres runs in Docker, publish port 5432.

## 3. Configure
```bash
cp .env.example .env
```
Edit `.env`:
```
DATABASE_URL="postgresql://auction:choose-a-password@192.168.1.20:5432/auction"
APP_URL="http://localhost:3000"
APP_SECRET="paste 16+ random characters here"    # e.g. output of: openssl rand -hex 24
COOKIE_SECURE="false"
```
- Special characters in the DB password must be URL-encoded (`@` → `%40`, `#` → `%23`, `/` → `%2F`).
- Add `?sslmode=require` to the end of `DATABASE_URL` if your server enforces SSL.

## 4. Install, migrate, seed
```bash
npm install                 # also runs prisma generate
npx prisma migrate deploy   # creates all tables
npm run seed:demo           # OPTIONAL: sample items/users/bids + demo admin (wipes items, bids and user accounts — never on real data)
npm run dev
```
Open http://localhost:3000. The first page creates the server admin; sign in with it and invite admins from **Admins**
(or use the demo admin below).
Demo accounts (if seeded): user `alyssa@example.com` / `demo-password-1`, admin `admin@example.com` / `change-me-please`.

## 5. Testing from your phone
1. Find your PC's LAN IP (e.g. `192.168.1.50`).
2. In `.env`: `APP_URL="http://192.168.1.50:3000"` and `COOKIE_SECURE="false"`.
3. Run `npm run dev -- -H 0.0.0.0` and allow Node through your firewall if prompted.
4. Print or open **Admin → QR codes** and scan one with your phone.

## 6. Production-style run
```bash
npm run build && npm start
```
or with Docker: see `README.md` → *Run with Docker* (that compose file includes its own Postgres; point `DATABASE_URL`
at your external server instead if you prefer).

## Troubleshooting
| Symptom | Fix |
| --- | --- |
| `P1001: Can't reach database server` | Check host/port, firewall, `listen_addresses`, `pg_hba.conf`. |
| `P1000: Authentication failed` | Wrong user/password, or the password needs URL-encoding. |
| Logged straight back out / login loops on the phone | `COOKIE_SECURE="false"` when using plain http on a LAN IP. |
| Pages unstyled | Delete `.next/` and restart `npm run dev`. |
| `prisma migrate dev` asks about a shadow database | Use `migrate deploy` to apply, or give the DB user `CREATEDB` rights for `migrate dev`. |
| QR codes point at localhost | Set `APP_URL` to an address your phone can reach. |
| Photos 404 after moving machines | Photos live in `UPLOAD_DIR` (`./data/uploads`) on disk — copy that folder too. |

## Continuing with Claude Code
`CLAUDE.md` gives Claude Code the project context (architecture, conventions, gotchas, status). Start a session in this
folder and it's read automatically. Recommended first step: `git init && git add -A && git commit -m "Initial import"`
so every change after this is reviewable.

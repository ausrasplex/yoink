import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";

/** Client IP as reported by the reverse proxy. Without a proxy this header is client-controlled,
 *  which is why the per-email limit is the primary control and the IP limit a secondary one. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim().slice(0, 64);
}

export const loginKeys = (email: string, ip: string) => [`email:${email.slice(0, 254)}`, `ip:${ip}`];

// NOTE: the DB session timezone may not be UTC, and these columns are `timestamp without time zone`
// (Prisma stores UTC). Every now() below is converted to UTC so raw SQL and Prisma agree on what "now" is.

/** Minutes remaining on the longest active lock across the keys, or 0 if none. */
export async function lockedMinutes(keys: string[]): Promise<number> {
  const rows = await db.$queryRaw<{ secs: number | null }[]>`
    SELECT EXTRACT(EPOCH FROM (MAX("lockedUntil") - (now() AT TIME ZONE 'utc')))::float AS secs
    FROM "LoginAttempt" WHERE key = ANY(${keys}) AND "lockedUntil" > (now() AT TIME ZONE 'utc')`;
  const secs = rows[0]?.secs;
  return secs && secs > 0 ? Math.ceil(secs / 60) : 0;
}

/**
 * Records one failure atomically (single upsert, so parallel guesses can't slip past the counter).
 * The window restarts once it is older than `minutes`; hitting `max` locks the key for `minutes`.
 */
export async function recordFailure(key: string, max: number, minutes: number) {
  await db.$executeRaw`
    INSERT INTO "LoginAttempt" (key, failures, "windowStart", "lockedUntil")
    VALUES (${key}, 1, (now() AT TIME ZONE 'utc'), CASE WHEN ${max}::int <= 1 THEN (now() AT TIME ZONE 'utc') + make_interval(mins => ${minutes}::int) END)
    ON CONFLICT (key) DO UPDATE SET
      failures = CASE WHEN "LoginAttempt"."windowStart" < (now() AT TIME ZONE 'utc') - make_interval(mins => ${minutes}::int)
                      THEN 1 ELSE "LoginAttempt".failures + 1 END,
      "windowStart" = CASE WHEN "LoginAttempt"."windowStart" < (now() AT TIME ZONE 'utc') - make_interval(mins => ${minutes}::int)
                      THEN (now() AT TIME ZONE 'utc') ELSE "LoginAttempt"."windowStart" END,
      "lockedUntil" = CASE
        WHEN (CASE WHEN "LoginAttempt"."windowStart" < (now() AT TIME ZONE 'utc') - make_interval(mins => ${minutes}::int)
                   THEN 1 ELSE "LoginAttempt".failures + 1 END) >= ${max}::int
        THEN (now() AT TIME ZONE 'utc') + make_interval(mins => ${minutes}::int)
        ELSE "LoginAttempt"."lockedUntil" END`;
}

export async function clearFailures(key: string) {
  await db.loginAttempt.deleteMany({ where: { key } });
}

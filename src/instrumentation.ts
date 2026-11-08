/**
 * Runs once when the server starts. Starts the background checks (every 5 minutes; each is safe to run often and from
 * several processes at once):
 *   - bell notifications: Won / Didn't win, ending within the hour, new items (src/lib/notifications.ts)
 *   - the daily "new items" digest email, when it's due (src/lib/digest.ts)
 *   - hourly: clearing out old notifications
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const g = globalThis as unknown as { __yoinkTimer?: ReturnType<typeof setInterval> };
  if (g.__yoinkTimer) return; // dev hot-reload: keep a single timer
  const [{ runDigestIfDue }, { announceNewListings, notifyEndedListings, notifyEndingSoon, pruneNotifications }] = await Promise.all([
    import("./lib/digest"),
    import("./lib/notifications"),
  ]);
  const log = (what: string) => (e: unknown) => console.error(`[${what}] check failed:`, e instanceof Error ? e.message : e);
  let lastPrune = 0;
  const tick = async () => {
    await notifyEndedListings().catch(log("notify"));
    await notifyEndingSoon().catch(log("notify"));
    await announceNewListings().catch(log("notify"));
    await runDigestIfDue().catch(log("digest"));
    if (Date.now() - lastPrune > 3600_000) { lastPrune = Date.now(); await pruneNotifications().catch(log("prune")); }
  };
  g.__yoinkTimer = setInterval(tick, 5 * 60_000);
  setTimeout(tick, 30_000); // first check shortly after start-up, once the server is serving
}

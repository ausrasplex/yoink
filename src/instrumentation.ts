/**
 * Runs once when the server starts. Starts the background check for the daily "new items" digest
 * (src/lib/digest.ts decides whether one is due; it's safe to call often and from several processes).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const g = globalThis as unknown as { __digestTimer?: ReturnType<typeof setInterval> };
  if (g.__digestTimer) return; // dev hot-reload: keep a single timer
  const { runDigestIfDue } = await import("./lib/digest");
  const tick = () => runDigestIfDue().catch((e) => console.error("[digest] check failed:", e instanceof Error ? e.message : e));
  g.__digestTimer = setInterval(tick, 5 * 60_000);
  setTimeout(tick, 30_000); // first check shortly after start-up, once the server is serving
}

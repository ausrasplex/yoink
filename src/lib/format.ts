export const money = (n: number) => `$${n.toLocaleString("en-AU")}`;

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";

export type Role = "USER" | "ADMIN" | "SERVER_ADMIN";

export const roleLabel = (role: Role) => (role === "SERVER_ADMIN" ? "Server admin" : role === "ADMIN" ? "Admin" : "User");

/** What the sidebar, top bar and auth screens show: the app name, or the auction name if none is set. */
export const brandName = (a: { appName: string | null; name: string }) => a.appName || a.name;

/** 1536 → "1.5 KB" (binary units, one decimal from MB up). */
export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

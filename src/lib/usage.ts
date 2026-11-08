import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { uploadDir } from "@/lib/uploads";

/** Size of every file in the uploads folder (item photos, logos, avatars). Missing folder = nothing uploaded yet. */
async function uploadsSize(): Promise<{ bytes: number; files: number }> {
  const dir = uploadDir();
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch {
    return { bytes: 0, files: 0 };
  }
  let bytes = 0, files = 0;
  for (const n of names) {
    try {
      const st = await fs.stat(path.join(dir, n));
      if (st.isFile()) { bytes += st.size; files++; }
    } catch { /* removed while we were counting */ }
  }
  return { bytes, files };
}

/** Server admin overview: counts and storage, no auction content. */
export async function getUsage() {
  const [items, roles, uploads, dbSize] = await Promise.all([
    db.item.count(),
    db.user.groupBy({ by: ["role"], _count: { _all: true } }),
    uploadsSize(),
    db.$queryRaw<{ size: bigint }[]>`SELECT pg_database_size(current_database()) AS size`.then((r) => Number(r[0]?.size ?? 0)).catch(() => null),
  ]);
  const count = (role: string) => roles.find((r) => r.role === role)?._count._all ?? 0;
  return {
    items,
    users: count("USER"),
    admins: count("ADMIN"),
    uploads,
    database: dbSize, // null if the DB user can't read it
    total: uploads.bytes + (dbSize ?? 0),
  };
}

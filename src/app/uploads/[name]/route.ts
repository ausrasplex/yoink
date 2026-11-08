import fs from "node:fs/promises";
import path from "node:path";
import { getUser } from "@/lib/auth";
import { CONTENT_TYPES, PHOTO_NAME, uploadDir } from "@/lib/uploads";

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  if (!(await getUser())) return new Response("Unauthorised", { status: 401 });
  const { name } = await params;
  const ext = name.split(".").pop() ?? "";
  // strict allow-list: random hex + raster extension, so no path traversal — and no SVG
  // (logos are inlined as data URIs or served by /brand/logo with a locked-down CSP)
  if (!PHOTO_NAME.test(name)) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(path.join(uploadDir(), name));
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": CONTENT_TYPES[ext], "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

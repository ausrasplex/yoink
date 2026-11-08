import { requireServerAdmin } from "@/lib/auth";
import { exportThemeZip } from "@/lib/theme/store";

/** Server Admin: download a theme folder as a .zip (to edit and upload again). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireServerAdmin();
  const { id } = await params;
  const zip = exportThemeZip(id);
  if (!zip) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(zip), {
    headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${id}-theme.zip"` },
  });
}

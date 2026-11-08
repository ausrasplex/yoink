import fs from "node:fs";
import path from "node:path";
import { requireServerAdmin } from "@/lib/auth";
import { templateZip } from "@/lib/theme/store";

/**
 * Server Admin: a starter theme (every wording key with its default) plus the guides: README.md (THEMES.md, for people),
 * AI-THEME-GUIDE.md (paste into ChatGPT & co.) and theme.schema.json (exact rules, for validators).
 */
export async function GET() {
  await requireServerAdmin();
  const dir = path.resolve(/*turbopackIgnore: true*/ process.env.BUILTIN_THEMES_DIR ?? "./themes");
  const read = (f: string) => {
    try {
      return fs.readFileSync(path.join(dir, f), "utf8");
    } catch {
      return null;
    }
  };
  const docs: Record<string, string> = {
    "README.md": read("THEMES.md") ?? "See THEMES.md in the Yoink repository for the theme format.\n",
  };
  for (const f of ["AI-THEME-GUIDE.md", "theme.schema.json"]) {
    const text = read(f);
    if (text) docs[f] = text;
  }
  return new Response(new Uint8Array(templateZip(docs)), {
    headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="yoink-theme-template.zip"` },
  });
}

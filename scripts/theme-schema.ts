// Writes themes/theme.schema.json (JSON Schema for theme.json) from the app's own rules in src/lib/theme/schema.ts,
// so AI assistants and editors can validate themes exactly the way the app does.  npm run themes:schema
import fs from "node:fs";
import { z } from "zod";
import { COPY_KEYS, DEFAULT_COPY } from "../src/lib/theme/copy";
import { themeSchema } from "../src/lib/theme/schema";

export function buildThemeJsonSchema() {
  const schema = z.toJSONSchema(themeSchema, { io: "input", unrepresentable: "any" }) as { properties: Record<string, unknown> } & Record<string, unknown>;
  // The copy keys are checked in code (unknown keys rejected); spell them out for JSON Schema users too.
  const text = { type: "string", minLength: 1, maxLength: 500 };
  const value = { anyOf: [text, { type: "array", items: text, minItems: 1, maxItems: 20 }] };
  schema.properties.copy = {
    type: "object",
    description: "Wording. Each key: one string, or a list of 1-20 options (one is picked per day). Unknown keys are rejected.",
    properties: Object.fromEntries(COPY_KEYS.map((k) => [k, { ...value, description: `Default: ${DEFAULT_COPY[k]}` }])),
    additionalProperties: false,
  };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://github.com/ausrasplex/yoink/blob/main/themes/theme.schema.json",
    title: "Yoink theme (theme.json)",
    ...schema,
  };
}

if (require.main === module) {
  fs.writeFileSync("themes/theme.schema.json", JSON.stringify(buildThemeJsonSchema(), null, 2) + "\n");
  console.log("wrote themes/theme.schema.json");
}

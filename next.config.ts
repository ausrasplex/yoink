import type { NextConfig } from "next";

import pkg from "./package.json";

const nextConfig: NextConfig = {
  output: "standalone",
  // Shown in the page footer. APP_BUILD is the short commit SHA that CI passes in as NEXT_DEPLOYMENT_ID (empty locally).
  env: {
    APP_VERSION: pkg.version,
    APP_BUILD: (process.env.NEXT_DEPLOYMENT_ID ?? "").slice(0, 7),
  },
  experimental: {
    serverActions: { bodySizeLimit: "40mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

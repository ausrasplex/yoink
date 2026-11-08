# Yoink — slim production image.
# Only the runtime ships: Next's standalone server (it already contains just the packages the app uses), the static
# files, the migrations and a standalone Prisma CLI to apply them on start-up. No dev tools, no full node_modules.

# Prisma needs OpenSSL on Alpine; tzdata lets TZ (venue time zone) apply to the container's clock and logs.
FROM node:22-alpine AS base
RUN apk add --no-cache openssl tzdata

# Dependencies — cached until package.json, package-lock.json or the schema change (npm ci's postinstall runs prisma generate).
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci

# Build the app (standalone output).
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Set by CI to the commit SHA (Next's version-skew protection); empty for local builds.
ARG NEXT_DEPLOYMENT_ID=""
ENV NEXT_DEPLOYMENT_ID=$NEXT_DEPLOYMENT_ID
RUN npx prisma generate && npm run build

# Prisma CLI on its own, pinned to the version in package-lock.json, just for `migrate deploy` at start-up.
FROM base AS migrate
WORKDIR /prisma-cli
COPY package-lock.json ./
RUN v=$(node -p "require('./package-lock.json').packages['node_modules/prisma'].version") \
 && npm init -y > /dev/null && npm install --omit=dev --no-audit --no-fund "prisma@$v" \
 && npm cache clean --force

FROM base AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 UPLOAD_DIR=/data/uploads NEXT_TELEMETRY_DISABLED=1     BUILTIN_THEMES_DIR=/app/themes THEMES_DIR=/data/themes
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# Built-in themes (installed ones go in /data/themes, on the App data volume).
COPY --from=build /app/themes ./themes
# The generated Prisma client + its query engine (copied explicitly so the standalone trace can never miss the engine).
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=build /app/prisma/migrations ./prisma/migrations
COPY --from=migrate /prisma-cli/node_modules /opt/prisma-cli/node_modules
VOLUME /data
EXPOSE 3000
# On every start: apply any new database migrations, then serve. Everything else (including creating the server admin)
# happens in the app.
CMD ["sh", "-c", "node /opt/prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma && node server.js"]

# Prisma needs OpenSSL on Alpine; tzdata lets TZ (venue time zone) apply to the container's clock and logs.
FROM node:22-alpine AS base
RUN apk add --no-cache openssl tzdata

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM base AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 UPLOAD_DIR=/data/uploads
# Full node_modules + prisma dir so the container can run `prisma migrate deploy` and the seed on start.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
VOLUME /data
EXPOSE 3000
# On every start: apply database migrations, create/refresh the server admin if SERVER_ADMIN_* are set, then serve.
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node server.js"]

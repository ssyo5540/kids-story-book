# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=24-bookworm-slim

# ---------- deps ----------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.34.5 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM node:${NODE_VERSION} AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.34.5 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time: content validation + static pages. No credentials, no spend.
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 TTS_DRIVER=fake STORAGE_DRIVER=local
ARG CONTENT_INCLUDE_UNREVIEWED=false
ENV CONTENT_INCLUDE_UNREVIEWED=${CONTENT_INCLUDE_UNREVIEWED}
RUN pnpm build

# ---------- runner ----------
FROM node:${NODE_VERSION} AS runner
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates tini \
 && rm -rf /var/lib/apt/lists/* \
 && ffmpeg -version | head -1
WORKDIR /app
# NEXT_MANUAL_SIG_HANDLE lets instrumentation-node.ts drain running audio jobs on SIGTERM instead of
# Next.js exiting immediately. TINI_SUBREAPER keeps orphaned ffmpeg children reaped when tini is not PID 1.
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 \
    TMPDIR=/app/tmp NODE_OPTIONS=--max-old-space-size=384 CONTENT_DIR=/app/content \
    NEXT_MANUAL_SIG_HANDLE=true TINI_SUBREAPER=1
RUN mkdir -p /app/tmp && chown -R node:node /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/content ./content
USER node
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]

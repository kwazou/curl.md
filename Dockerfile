FROM node:24-slim

ENV CI=true \
    HOST=0.0.0.0 \
    NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PORT=3000

WORKDIR /app

RUN corepack enable \
  && corepack prepare pnpm@11.0.9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm config set fetch-retries 5 \
  && pnpm config set fetch-retry-mintimeout 20000 \
  && pnpm config set fetch-retry-maxtimeout 120000 \
  && pnpm config set network-timeout 300000 \
  && (pnpm install --frozen-lockfile --prod \
      || pnpm install --frozen-lockfile --prod \
      || pnpm install --frozen-lockfile --prod) \
  && pnpm exec playwright install --with-deps --only-shell chromium \
  && rm -rf /root/.cache /root/.local/share/pnpm /var/lib/apt/lists/*

COPY src ./src

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + process.env.PORT + '/api/health').then(function (r) { process.exit(r.ok ? 0 : 1) }, function () { process.exit(1) })"]

CMD ["node", "--experimental-strip-types", "src/local/serve.ts"]

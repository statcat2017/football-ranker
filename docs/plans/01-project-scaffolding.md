# Stage 01 — Project Scaffolding

## Goal

Scaffold a Next.js 15 project with React 19, TypeScript, and the same conventions as `footballticketsdashboard`.

## Steps

### 1. Create Next.js project

```bash
npx create-next-app@latest football-ranker \
  --typescript \
  --eslint \
  --tailwind=no \
  --app \
  --src-dir=no \
  --import-alias="@/*"
```

This puts routes directly under `app/`, not `src/app/`.

### 2. Install dependencies

```bash
npm install better-sqlite3 zod
npm install -D @types/better-sqlite3 vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom typescript
```

### 3. Add scripts to package.json

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "NODE_ENV=production next build",
    "start": "node server.js",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "import:players": "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types scripts/import-players.ts"
  }
}
```

### 4. Create directory structure

```bash
mkdir -p components lib/db/migrations lib/players lib/votes lib/leaderboard scripts data docs/plans
touch data/.gitkeep
```

### 5. Create .gitignore additions

```
data/*.sqlite
data/*.sqlite-wal
data/*.sqlite-shm
.env
.dev.vars
```

### 6. Create .env.example

```
SQLITE_DB_PATH=data/football-ranker.sqlite
FOOTBALL_DATA_API_TOKEN=
ADMIN_SECRET=
SESSION_SECRET=
```

### 7. Configure next.config.ts

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
};

export default nextConfig;
```

### 8. Configure tsconfig.json

Match `footballticketsdashboard` settings:

- `target: "ES2017"`
- `module: "esnext"`
- `moduleResolution: "bundler"`
- `strict: true`
- `noEmit: true`
- `isolatedModules: true`
- `allowImportingTsExtensions: true`
- Path alias: `@/*` → `./*`

### 9. Create vitest.config.ts

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

### 10. Create minimal layout and page

- `app/layout.tsx`: root layout with `<html><body>{children}</body></html>`
- `app/page.tsx`: simple landing page that redirects to `/vote` or shows a "coming soon" message

### 11. Create server.js for production

Copy the standalone server pattern from `footballticketsdashboard`.

## Verification

```bash
npm run dev       # starts without errors
npm run build     # builds successfully
npm run lint      # no errors
```

## Dependencies

None — this is the first stage.

## Blocked By

Nothing.

## Blocks

All subsequent stages.

# Stage 11 — Lint, Test, Build & Deploy

## Goal

Final quality gates: lint, typecheck, test, build. Set up for VPS deployment.

## Dependencies

- All previous stages

## Steps

### 1. ESLint configuration

Create `eslint.config.mjs` matching `footballticketsdashboard`:

```js
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [...compat.extends("next/core-web-vitals")];
```

### 2. TypeScript strictness

Ensure `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "target": "ES2017",
    "allowImportingTsExtensions": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### 3. Test coverage checklist

| Area | Test File | Key Assertions |
|---|---|---|
| ELO | `lib/elo.test.ts` | K-factor thresholds, rating convergence, upsets |
| Vote service | `lib/votes/cast.test.ts` | Transaction atomicity, stat updates, validation |
| DB migrations | `lib/db/migrate.test.ts` | Schema applied, idempotent |
| Position normalize | `lib/players/normalize.test.ts` | All raw positions map correctly |
| API: matchups | `api/matchups/next.test.ts` | Returns two different active players |
| API: votes | `api/votes.test.ts` | Valid/invalid vote handling |
| API: leaderboard | `api/leaderboard.test.ts` | Ordering, provisional filter |

### 4. Run validation

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

All four must pass before deployment.

### 5. Production server.js

Create `server.js` for standalone Next.js deployment (copy from `footballticketsdashboard`):

```js
const { createServer } = require("http");
const next = require("next");

const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(3001, () => {
    console.log("Football Ranker listening on http://localhost:3001");
  });
});
```

### 6. Deployment

**VPS deployment:**

```bash
# On VPS
cd /home/ben/repos/football-ranker
git pull origin main
npm install
NODE_ENV=production npm run build
pm2 restart football-ranker  # or systemd
```

**systemd service** (`/etc/systemd/system/football-ranker.service`):

```ini
[Unit]
Description=Football Ranker
After=network.target

[Service]
Type=simple
User=ben
WorkingDirectory=/home/ben/repos/football-ranker
ExecStart=/usr/bin/node server.js
Restart=on-failure
EnvironmentFile=/etc/football-ranker.env

[Install]
WantedBy=multi-user.target
```

**Production environment** (`/etc/football-ranker.env`):

```
SQLITE_DB_PATH=/var/lib/football-ranker/football-ranker.sqlite
FOOTBALL_DATA_API_TOKEN=...
SESSION_SECRET=...
NODE_ENV=production
PORT=3001
```

### 7. Nginx reverse proxy

Serve from its own subdomain or root path:

```nginx
server {
    server_name ranker.example.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

For rate limiting and a full nginx config, see `docs/nginx.conf`.

### 8. Cron for re-import

Weekly re-import of player data:

```cron
0 3 * * 0 cd /home/ben/repos/football-ranker && /usr/bin/node --experimental-strip-types scripts/import-players.ts >> /var/log/football-ranker-import.log 2>&1
```

## Verification

```bash
npm run lint          # 0 errors
npm run typecheck     # 0 errors
npm run test          # all pass
npm run build         # success
```

## Key Design Decisions

- **Standalone output**: simplest deployment, no Docker needed.
- **systemd**: reliable process management, auto-restart on crash.
- **Weekly re-import**: keeps player data fresh without manual intervention.
- **Nginx**: existing reverse proxy infrastructure.

## Blocks

Nothing — this is the final stage.

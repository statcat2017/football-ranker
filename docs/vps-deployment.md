# VPS Deployment

Football Ranker is deployed to a VPS as a standalone Next.js Node.js app.

## Build

GitHub Actions runs:

```bash
npm ci
npm run build
```

The deployment bundle comes from `.next/standalone` and `.next/static`.

## Runtime

The app runs under systemd as `football-ranker`.

Environment variables are loaded from:

```
/etc/football-ranker.env
```

Required variables:

```
SQLITE_DB_PATH=/srv/football-ranker/data/football-ranker.sqlite
FOOTBALL_DATA_API_TOKEN=...
ADMIN_SECRET=...
SESSION_SECRET=...
PORT=3001
NODE_ENV=production
```

## Database

Production uses SQLite via `better-sqlite3`.

## Reverse Proxy

Nginx should proxy `ranker.statcat.co.uk` to `127.0.0.1:3001`.

See `docs/nginx.conf` for the suggested config.

## systemd

The service should be named `football-ranker` and point at `node server.js` in the deploy directory.

## Health Check

Deployment checks:

```
http://localhost:3001/api/health
```

## GitHub Secrets

The deploy workflow expects:

```
DEPLOY_KEY
DEPLOY_HOST
DEPLOY_PATH
```

## Naming

| Context | Name |
|---------|------|
| Repository | football-ranker |
| Product/service name | Football Ranker |
| Systemd service | football-ranker |
| SQLite database | football-ranker.sqlite |

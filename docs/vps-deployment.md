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
ADMIN_PASSWORD=...
ADMIN_SESSION_SECRET=...
SESSION_SECRET=...
UPLOAD_DIR=/srv/football-ranker/data/uploads/player-photos
PORT=3001
NODE_ENV=production
```

## Uploads

Player photos are stored in the directory specified by `UPLOAD_DIR` (default: `data/uploads/player-photos`).

Upload directory setup:

```bash
sudo -u appuser mkdir -p /srv/football-ranker/data/uploads/player-photos
```

Uploaded files are served at `/uploads/player-photos/<filename>` and cached with immutable headers.

## Database

Production uses SQLite via `better-sqlite3`.

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

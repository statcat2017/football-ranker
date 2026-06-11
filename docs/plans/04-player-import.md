# Stage 04 — Player Import

## Goal

Build an idempotent import script that fetches Premier League squads from football-data.org and upserts teams and players into SQLite.

## Dependencies

- Stage 02 (database layer)

## Steps

### 1. Create scripts/import-players.ts

```ts
// Fetch PL teams from football-data.org
// For each team, fetch squad
// Upsert teams by external_id
// Upsert players by external_id
// Mark missing players as inactive
```

### 2. API integration

**Endpoint:** `https://api.football-data.org/v4/competitions/PL/teams`

Headers:
```
X-Auth-Token: {FOOTBALL_DATA_API_TOKEN}
```

**Response structure:**
```json
{
  "competition": { "name": "Premier League" },
  "season": { "startDate": "2025-08-01", "endDate": "2026-05-31" },
  "teams": [
    {
      "id": 57,
      "name": "Arsenal FC",
      "shortName": "Arsenal",
      "tla": "ARS",
      "crest": "https://crests.football-data.org/57.png",
      "squad": [
        {
          "id": 3185,
          "name": "Bukayo Saka",
          "position": "Offence",
          "nationality": "England",
          "dateOfBirth": "2001-09-05",
          "shirtNumber": 7
        }
      ]
    }
  ]
}
```

### 3. Position normalization

Map raw football-data.org positions to groups:

| Raw Position | Group |
|---|---|
| `Goalkeeper` | `Goalkeeper` |
| `Defence` | `Defender` |
| `Defender` | `Defender` |
| `Midfield` | `Midfielder` |
| `Midfielder` | `Midfielder` |
| `Offence` | `Attacker` |
| `Attacker` | `Attacker` |

Store both `raw_position` and `position_group`.

### 4. Upsert logic

```sql
-- Team upsert
INSERT INTO teams (external_id, name, short_name, crest_url, season_label, updated_at)
VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
ON CONFLICT(external_id) DO UPDATE SET
  name = excluded.name,
  short_name = excluded.short_name,
  crest_url = excluded.crest_url,
  season_label = excluded.season_label,
  updated_at = CURRENT_TIMESTAMP;

-- Player upsert
INSERT INTO players (external_id, name, raw_position, position_group, nationality, date_of_birth, shirt_number, team_id, is_active, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
ON CONFLICT(external_id) DO UPDATE SET
  name = excluded.name,
  raw_position = excluded.raw_position,
  position_group = excluded.position_group,
  nationality = excluded.nationality,
  date_of_birth = excluded.date_of_birth,
  shirt_number = excluded.shirt_number,
  team_id = excluded.team_id,
  is_active = 1,
  updated_at = CURRENT_TIMESTAMP;
```

### 5. Mark missing players inactive

After importing all teams, mark players not seen in this import:

```sql
UPDATE players
SET is_active = 0, updated_at = CURRENT_TIMESTAMP
WHERE external_id NOT IN (/* list of all external_ids from this import */)
AND is_active = 1;
```

This handles transfers, loans, and retirements without deleting data.

### 6. Season tracking

Store `season_label` on teams (e.g., "2025-2026"). On re-import, update `season_label` for all teams in the current import. This allows historical comparison if needed.

### 7. Add npm script

```json
{
  "import:players": "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types scripts/import-players.ts"
}
```

### 8. Handle rate limits

football-data.org free tier has rate limits (10 requests/minute). Add a simple delay between team fetches:

```ts
await new Promise(resolve => setTimeout(resolve, 6500)); // ~9 requests/minute
```

### 9. Write tests

- `lib/players/normalize.test.ts`: test position normalization.
- `scripts/import-players.test.ts`: mock API responses, verify upserts.

## Verification

```bash
npm run import:players
npm run test
```

## Key Design Decisions

- **Idempotent**: can be run repeatedly without duplicating data.
- **Soft delete**: inactive players keep their vote history and ELO.
- **Season-aware**: tracks which season each team import belongs to.
- **Rate-limited**: respects football-data.org free tier limits.
- **No photos**: football-data.org free tier doesn't provide player photos.

## Blocks

- Stage 06 (API routes need player data)
- Stage 07 (UI needs player data)

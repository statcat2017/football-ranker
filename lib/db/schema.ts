export const SCHEMA = `
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY,
  external_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT,
  crest_url TEXT,
  season_label TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY,
  external_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  raw_position TEXT,
  position_group TEXT,
  nationality TEXT,
  date_of_birth TEXT,
  shirt_number INTEGER,
  team_id INTEGER REFERENCES teams(id),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  elo_rating REAL NOT NULL DEFAULT 1500,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  comparisons INTEGER NOT NULL DEFAULT 0,
  photo_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY,
  player_a_id INTEGER NOT NULL REFERENCES players(id),
  player_b_id INTEGER NOT NULL REFERENCES players(id),
  winner_id INTEGER NOT NULL REFERENCES players(id),
  loser_id INTEGER NOT NULL REFERENCES players(id),
  player_a_elo_before REAL NOT NULL,
  player_b_elo_before REAL NOT NULL,
  player_a_elo_after REAL NOT NULL,
  player_b_elo_after REAL NOT NULL,
  k_factor REAL NOT NULL,
  session_id TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (player_a_id <> player_b_id),
  CHECK (winner_id IN (player_a_id, player_b_id)),
  CHECK (loser_id IN (player_a_id, player_b_id)),
  CHECK (winner_id <> loser_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_winner ON votes(winner_id);
CREATE INDEX IF NOT EXISTS idx_votes_players ON votes(player_a_id, player_b_id);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_elo ON players(elo_rating);
CREATE INDEX IF NOT EXISTS idx_players_active ON players(is_active);

CREATE TABLE IF NOT EXISTS consumed_matchups (
  id INTEGER PRIMARY KEY,
  nonce TEXT UNIQUE NOT NULL,
  session_id TEXT,
  consumed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

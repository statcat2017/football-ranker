import type { AppDatabase } from "../db/adapter";

export interface AdminPlayer {
  id: number;
  external_id: string;
  name: string;
  raw_position: string | null;
  position_group: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  shirt_number: number | null;
  team_id: number | null;
  is_active: number;
  elo_rating: number;
  wins: number;
  losses: number;
  comparisons: number;
  photo_url: string | null;
  team_name: string | null;
  team_crest_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminPlayerListOptions {
  search?: string;
  teamId?: number;
  active?: boolean;
  hasPhoto?: boolean;
  limit?: number;
  offset?: number;
}

export async function getAdminPlayers(
  db: AppDatabase,
  options: AdminPlayerListOptions = {},
): Promise<{ players: AdminPlayer[]; total: number }> {
  const {
    search,
    teamId,
    active,
    hasPhoto,
    limit = 50,
    offset = 0,
  } = options;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (search) {
    conditions.push("p.name LIKE ?");
    params.push(`%${search}%`);
  }
  if (teamId !== undefined) {
    conditions.push("p.team_id = ?");
    params.push(teamId);
  }
  if (active !== undefined) {
    conditions.push("p.is_active = ?");
    params.push(active ? 1 : 0);
  }
  if (hasPhoto !== undefined) {
    if (hasPhoto) {
      conditions.push("p.photo_url IS NOT NULL AND p.photo_url != ''");
    } else {
      conditions.push("(p.photo_url IS NULL OR p.photo_url = '')");
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM players p ${where}`,
    params,
  );
  const total = countResult?.count ?? 0;

  const players = await db.all<AdminPlayer>(
    `SELECT p.*, t.name as team_name, t.crest_url as team_crest_url
     FROM players p
     LEFT JOIN teams t ON p.team_id = t.id
     ${where}
     ORDER BY p.name ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { players, total };
}

export async function getAdminPlayer(
  db: AppDatabase,
  id: number,
): Promise<AdminPlayer | undefined> {
  return db.get<AdminPlayer>(
    `SELECT p.*, t.name as team_name, t.crest_url as team_crest_url
     FROM players p
     LEFT JOIN teams t ON p.team_id = t.id
     WHERE p.id = ?`,
    [id],
  );
}

export async function createAdminPlayer(
  db: AppDatabase,
  input: {
    name: string;
    team_id?: number | null;
    raw_position?: string | null;
    position_group?: string | null;
    nationality?: string | null;
    date_of_birth?: string | null;
    shirt_number?: number | null;
    is_active?: boolean;
    photo_url?: string | null;
  },
): Promise<{ id: number }> {
  const result = await db.run(
    `INSERT INTO players (external_id, name, team_id, raw_position, position_group, nationality, date_of_birth, shirt_number, is_active, photo_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      `manual:${crypto.randomUUID()}`,
      input.name,
      input.team_id ?? null,
      input.raw_position ?? null,
      input.position_group ?? null,
      input.nationality ?? null,
      input.date_of_birth ?? null,
      input.shirt_number ?? null,
      input.is_active === false ? 0 : 1,
      input.photo_url ?? null,
    ],
  );
  return { id: Number(result.lastInsertRowid) };
}

export async function updateAdminPlayer(
  db: AppDatabase,
  id: number,
  input: {
    name?: string;
    team_id?: number | null;
    raw_position?: string | null;
    position_group?: string | null;
    nationality?: string | null;
    date_of_birth?: string | null;
    shirt_number?: number | null;
    photo_url?: string | null;
  },
): Promise<void> {
  const fields: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.name !== undefined) {
    fields.push("name = ?");
    params.push(input.name);
  }
  if (input.team_id !== undefined) {
    fields.push("team_id = ?");
    params.push(input.team_id);
  }
  if (input.raw_position !== undefined) {
    fields.push("raw_position = ?");
    params.push(input.raw_position);
  }
  if (input.position_group !== undefined) {
    fields.push("position_group = ?");
    params.push(input.position_group);
  }
  if (input.nationality !== undefined) {
    fields.push("nationality = ?");
    params.push(input.nationality);
  }
  if (input.date_of_birth !== undefined) {
    fields.push("date_of_birth = ?");
    params.push(input.date_of_birth);
  }
  if (input.shirt_number !== undefined) {
    fields.push("shirt_number = ?");
    params.push(input.shirt_number);
  }
  if (input.photo_url !== undefined) {
    fields.push("photo_url = ?");
    params.push(input.photo_url);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = CURRENT_TIMESTAMP");
  params.push(id);

  await db.run(`UPDATE players SET ${fields.join(", ")} WHERE id = ?`, params);
}

export async function setPlayerActive(
  db: AppDatabase,
  id: number,
  active: boolean,
): Promise<void> {
  await db.run(
    "UPDATE players SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [active ? 1 : 0, id],
  );
}

export async function removePlayerPhoto(
  db: AppDatabase,
  id: number,
): Promise<string | null> {
  const player = await db.get<{ photo_url: string | null }>(
    "SELECT photo_url FROM players WHERE id = ?",
    [id],
  );
  if (!player) return null;

  await db.run(
    "UPDATE players SET photo_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [id],
  );

  return player.photo_url;
}

export async function deleteAdminPlayer(
  db: AppDatabase,
  id: number,
): Promise<{ deleted: boolean; hadVotes: boolean }> {
  const voteCount = await db.get<{ count: number }>(
    "SELECT COUNT(*) as count FROM votes WHERE player_a_id = ? OR player_b_id = ? OR winner_id = ? OR loser_id = ?",
    [id, id, id, id],
  );
  const hadVotes = (voteCount?.count ?? 0) > 0;

  if (hadVotes) {
    return { deleted: false, hadVotes: true };
  }

  await db.run("DELETE FROM players WHERE id = ?", [id]);

  return { deleted: true, hadVotes: false };
}

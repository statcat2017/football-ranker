import { describe, it, expect, beforeEach } from "vitest";
import {
  getAdminPlayers,
  getAdminPlayer,
  createAdminPlayer,
  updateAdminPlayer,
  setPlayerActive,
  removePlayerPhoto,
  deleteAdminPlayer,
} from "./players";
import { createAppDatabase, type AppDatabase } from "../db/adapter";

let db: AppDatabase;

beforeEach(async () => {
  db = createAppDatabase(":memory:");
  await db.exec(`
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
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
});

describe("admin players", () => {
  describe("createAdminPlayer", () => {
    it("creates a player with manual external_id", async () => {
      const result = await createAdminPlayer(db, { name: "Test Player" });
      expect(result.id).toBe(1);

      const player = await db.get<{ name: string; external_id: string; is_active: number }>(
        "SELECT name, external_id, is_active FROM players WHERE id = ?",
        [result.id],
      );
      expect(player?.name).toBe("Test Player");
      expect(player?.external_id).toMatch(/^manual:/);
      expect(player?.is_active).toBe(1);
    });

    it("creates an inactive player", async () => {
      const result = await createAdminPlayer(db, { name: "Inactive", is_active: false });
      const player = await db.get<{ is_active: number }>(
        "SELECT is_active FROM players WHERE id = ?",
        [result.id],
      );
      expect(player?.is_active).toBe(0);
    });
  });

  describe("getAdminPlayer", () => {
    it("returns a player with team info", async () => {
      await db.run(
        "INSERT INTO teams (external_id, name, season_label) VALUES (?, ?, ?)",
        ["ext-team-1", "Arsenal", "2025"],
      );
      const { id } = await createAdminPlayer(db, { name: "Bukayo Saka", team_id: 1 });
      const player = await getAdminPlayer(db, id);
      expect(player?.name).toBe("Bukayo Saka");
      expect(player?.team_name).toBe("Arsenal");
    });

    it("returns undefined for non-existent player", async () => {
      const player = await getAdminPlayer(db, 999);
      expect(player).toBeUndefined();
    });
  });

  describe("getAdminPlayers", () => {
    it("returns all players", async () => {
      await createAdminPlayer(db, { name: "Player A" });
      await createAdminPlayer(db, { name: "Player B" });
      const result = await getAdminPlayers(db);
      expect(result.total).toBe(2);
      expect(result.players.length).toBe(2);
    });

    it("filters by search term", async () => {
      await createAdminPlayer(db, { name: "Bukayo Saka" });
      await createAdminPlayer(db, { name: "Martin Odegaard" });
      const result = await getAdminPlayers(db, { search: "Saka" });
      expect(result.total).toBe(1);
      expect(result.players[0].name).toBe("Bukayo Saka");
    });

    it("filters by active status", async () => {
      await createAdminPlayer(db, { name: "Active", is_active: true });
      await createAdminPlayer(db, { name: "Inactive", is_active: false });
      const active = await getAdminPlayers(db, { active: true });
      expect(active.total).toBe(1);
      expect(active.players[0].name).toBe("Active");

      const inactive = await getAdminPlayers(db, { active: false });
      expect(inactive.total).toBe(1);
      expect(inactive.players[0].name).toBe("Inactive");
    });

    it("filters by photo presence", async () => {
      await createAdminPlayer(db, { name: "With Photo", photo_url: "https://example.com/photo.jpg" });
      await createAdminPlayer(db, { name: "No Photo" });
      const withPhoto = await getAdminPlayers(db, { hasPhoto: true });
      expect(withPhoto.total).toBe(1);
      expect(withPhoto.players[0].name).toBe("With Photo");

      const noPhoto = await getAdminPlayers(db, { hasPhoto: false });
      expect(noPhoto.total).toBe(1);
      expect(noPhoto.players[0].name).toBe("No Photo");
    });
  });

  describe("updateAdminPlayer", () => {
    it("updates player fields", async () => {
      const { id } = await createAdminPlayer(db, { name: "Old Name" });
      await updateAdminPlayer(db, id, { name: "New Name", shirt_number: 7 });
      const player = await getAdminPlayer(db, id);
      expect(player?.name).toBe("New Name");
      expect(player?.shirt_number).toBe(7);
    });

    it("sets nullable fields to null", async () => {
      const { id } = await createAdminPlayer(db, { name: "P", nationality: "English" });
      await updateAdminPlayer(db, id, { nationality: null });
      const player = await getAdminPlayer(db, id);
      expect(player?.nationality).toBeNull();
    });
  });

  describe("setPlayerActive", () => {
    it("activates a player", async () => {
      const { id } = await createAdminPlayer(db, { name: "P", is_active: false });
      await setPlayerActive(db, id, true);
      const player = await getAdminPlayer(db, id);
      expect(player?.is_active).toBe(1);
    });

    it("deactivates a player", async () => {
      const { id } = await createAdminPlayer(db, { name: "P", is_active: true });
      await setPlayerActive(db, id, false);
      const player = await getAdminPlayer(db, id);
      expect(player?.is_active).toBe(0);
    });
  });

  describe("removePlayerPhoto", () => {
    it("removes photo and returns old URL", async () => {
      const { id } = await createAdminPlayer(db, {
        name: "P",
        photo_url: "https://example.com/photo.jpg",
      });
      const oldUrl = await removePlayerPhoto(db, id);
      expect(oldUrl).toBe("https://example.com/photo.jpg");

      const player = await getAdminPlayer(db, id);
      expect(player?.photo_url).toBeNull();
    });

    it("returns null when no photo", async () => {
      const { id } = await createAdminPlayer(db, { name: "P" });
      const oldUrl = await removePlayerPhoto(db, id);
      expect(oldUrl).toBeNull();
    });
  });

  describe("deleteAdminPlayer", () => {
    it("deletes a player without votes", async () => {
      const { id } = await createAdminPlayer(db, { name: "P" });
      const { hadVotes } = await deleteAdminPlayer(db, id);
      expect(hadVotes).toBe(false);

      const player = await getAdminPlayer(db, id);
      expect(player).toBeUndefined();
    });

    it("detects player with votes", async () => {
      const p1 = await createAdminPlayer(db, { name: "P1" });
      const p2 = await createAdminPlayer(db, { name: "P2" });
      await db.run(
        `INSERT INTO votes (player_a_id, player_b_id, winner_id, loser_id, player_a_elo_before, player_b_elo_before, player_a_elo_after, player_b_elo_after, k_factor)
         VALUES (?, ?, ?, ?, 1500, 1500, 1516, 1484, 32)`,
        [p1.id, p2.id, p1.id, p2.id],
      );
      const result = await deleteAdminPlayer(db, p1.id);
      expect(result.hadVotes).toBe(true);
      expect(result.deleted).toBe(false);
      // Player should still exist
      const player = await getAdminPlayer(db, p1.id);
      expect(player).toBeDefined();
    });
  });
});

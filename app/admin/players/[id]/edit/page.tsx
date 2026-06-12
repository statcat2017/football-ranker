"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { AdminPlayerForm, type PlayerFormData } from "@/components/AdminPlayerForm";

interface Player {
  id: number;
  name: string;
  team_id: number | null;
  raw_position: string | null;
  position_group: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  shirt_number: number | null;
  is_active: number;
  elo_rating: number;
  wins: number;
  losses: number;
  comparisons: number;
  photo_url: string | null;
  team_name: string | null;
}

interface Team {
  id: number;
  name: string;
}

export default function EditPlayerPage() {
  const router = useRouter();
  const params = useParams();
  const playerId = params.id;

  const [player, setPlayer] = useState<Player | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/players/" + playerId);
        if (res.status === 401) { window.location.href = "/admin/login"; return; }
        const data = await res.json();
        if (cancelled) return;
        if (!data.player) { setError("Player not found"); return; }
        setPlayer(data.player);
        setPhotoUrl(data.player.photo_url ?? "");
      } catch {
        if (!cancelled) setError("Failed to load player");
      }
    }
    load();
    fetch("/api/admin/teams")
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setTeams(data.teams ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [playerId]);

  async function reloadPlayer() {
    try {
      const res = await fetch("/api/admin/players/" + playerId);
      if (res.status === 401) { window.location.href = "/admin/login"; return; }
      const data = await res.json();
      if (!data.player) return;
      setPlayer(data.player);
      setPhotoUrl(data.player.photo_url ?? "");
    } catch {
      // silent
    }
  }

  async function handleSave(form: PlayerFormData) {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        team_id: form.team_id ? Number(form.team_id) : null,
        raw_position: form.raw_position || null,
        position_group: form.position_group || null,
        nationality: form.nationality || null,
        date_of_birth: form.date_of_birth || null,
        shirt_number: form.shirt_number ? Number(form.shirt_number) : null,
      };

      const res = await fetch("/api/admin/players/" + playerId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
        return;
      }

      setSuccess("Player updated");
      reloadPlayer();
    } catch {
      setError("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch("/api/admin/players/" + playerId + "/photo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Upload failed");
        return;
      }

      const data = await res.json();
      setPhotoUrl(data.photo_url);
      setSuccess("Photo uploaded");
      reloadPlayer();
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePhoto() {
    if (!confirm("Remove photo?")) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/players/" + playerId + "/photo", {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Remove failed");
        return;
      }

      setPhotoUrl("");
      setSuccess("Photo removed");
      reloadPlayer();
    } catch {
      setError("Remove failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleToggleActive() {
    if (!player) return;

    try {
      const res = await fetch("/api/admin/players/" + playerId + "/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !player.is_active }),
      });
      if (!res.ok) {
        setError("Failed to toggle player status");
        return;
      }
      reloadPlayer();
    } catch {
      setError("Failed to toggle status");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this player? This cannot be undone.")) return;

    try {
      const res = await fetch("/api/admin/players/" + playerId, {
        method: "DELETE",
      });

      if (!res.ok) {
        setError("Delete failed");
        return;
      }

      router.push("/admin/players");
    } catch {
      setError("Delete failed");
    }
  }

  if (!player) {
    return <div style={{ color: "var(--text-muted)" }}>Loading...</div>;
  }

  const initialData: PlayerFormData = {
    name: player.name,
    team_id: player.team_id ? String(player.team_id) : "",
    raw_position: player.raw_position ?? "",
    position_group: player.position_group ?? "",
    nationality: player.nationality ?? "",
    date_of_birth: player.date_of_birth ?? "",
    shirt_number: player.shirt_number != null ? String(player.shirt_number) : "",
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Edit Player</h1>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={handleToggleActive}
            style={{
              padding: "0.5rem 1rem",
              background: player.is_active ? "var(--provisional)" : "var(--win)",
              color: "#000",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {player.is_active ? "Deactivate" : "Activate"}
          </button>
          <button
            onClick={handleDelete}
            style={{
              padding: "0.5rem 1rem",
              background: "var(--loss)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
        {/* Photo Section */}
        <div style={{ flex: "0 0 200px" }}>
          <div style={{
            width: "200px",
            height: "200px",
            borderRadius: "12px",
            background: "var(--surface)",
            border: "2px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            marginBottom: "1rem",
          }}>
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={player.name}
                width={200}
                height={200}
                style={{ borderRadius: "12px", objectFit: "cover" }}
              />
            ) : (
              <span style={{ fontSize: "3rem", fontWeight: 700, color: "var(--text-muted)" }}>
                {player.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{
              display: "block",
              padding: "0.5rem",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              textAlign: "center",
              fontSize: "0.875rem",
              color: "var(--text)",
              cursor: "pointer",
            }}>
              {uploading ? "Uploading..." : "Upload Photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handlePhotoUpload}
                disabled={uploading}
                style={{ display: "none" }}
              />
            </label>
            {photoUrl && (
              <button
                onClick={handleRemovePhoto}
                disabled={uploading}
                style={{
                  padding: "0.5rem",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--loss)",
                  fontSize: "0.875rem",
                  cursor: uploading ? "not-allowed" : "pointer",
                }}
              >
                Remove Photo
              </button>
            )}
          </div>

          {/* Stats */}
          <div style={{
            marginTop: "1.5rem",
            padding: "1rem",
            background: "var(--surface)",
            borderRadius: "8px",
            border: "1px solid var(--border)",
          }}>
            <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--text-muted)" }}>
              Stats
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.875rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>ELO</span>
                <span>{Math.round(player.elo_rating)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Wins</span>
                <span>{player.wins}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Losses</span>
                <span>{player.losses}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Comparisons</span>
                <span>{player.comparisons}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div style={{ flex: 1, minWidth: "300px" }}>
          <AdminPlayerForm
            initialData={initialData}
            teams={teams}
            onSubmit={handleSave}
            submitLabel="Save Changes"
            loading={loading}
            error={error}
            success={success}
            onCancel={() => router.push("/admin/players")}
          />
        </div>
      </div>
    </div>
  );
}

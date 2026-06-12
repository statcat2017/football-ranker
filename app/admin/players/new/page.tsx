"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminPlayerForm, type PlayerFormData } from "@/components/AdminPlayerForm";

interface Team {
  id: number;
  name: string;
}

export default function NewPlayerPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetch("/api/admin/teams")
      .then((r) => r.json())
      .then((data) => setTeams(data.teams ?? []))
      .catch(() => {});
  }, []);

  async function handleSubmit(form: PlayerFormData) {
    setError("");
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        is_active: isActive,
      };
      if (form.team_id) body.team_id = Number(form.team_id);
      if (form.raw_position) body.raw_position = form.raw_position;
      if (form.position_group) body.position_group = form.position_group;
      if (form.nationality) body.nationality = form.nationality;
      if (form.date_of_birth) body.date_of_birth = form.date_of_birth;
      if (form.shirt_number) body.shirt_number = Number(form.shirt_number);

      const res = await fetch("/api/admin/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
        return;
      }

      const data = await res.json();
      router.push("/admin/players/" + data.id + "/edit");
    } catch {
      setError("Failed to create player");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Add Player
      </h1>

      <AdminPlayerForm
        teams={teams}
        onSubmit={handleSubmit}
        submitLabel="Create Player"
        loading={loading}
        error={error}
        onCancel={() => router.push("/admin/players")}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            id="is-active"
          />
          <label htmlFor="is-active" style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Active (visible in voting)
          </label>
        </div>
      </AdminPlayerForm>
    </div>
  );
}

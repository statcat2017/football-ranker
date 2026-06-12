"use client";

import { useState } from "react";

interface Team {
  id: number;
  name: string;
}

export interface PlayerFormData {
  name: string;
  team_id: string;
  raw_position: string;
  position_group: string;
  nationality: string;
  date_of_birth: string;
  shirt_number: string;
}

interface AdminPlayerFormProps {
  initialData?: PlayerFormData;
  teams: Team[];
  onSubmit: (data: PlayerFormData) => Promise<void>;
  submitLabel: string;
  loading: boolean;
  error: string;
  success?: string;
  onCancel?: () => void;
  children?: React.ReactNode;
}

const EMPTY_FORM: PlayerFormData = {
  name: "",
  team_id: "",
  raw_position: "",
  position_group: "",
  nationality: "",
  date_of_birth: "",
  shirt_number: "",
};

export function AdminPlayerForm({
  initialData,
  teams,
  onSubmit,
  submitLabel,
  loading,
  error,
  success,
  onCancel,
  children,
}: AdminPlayerFormProps) {
  const [form, setForm] = useState<PlayerFormData>(initialData ?? EMPTY_FORM);

  function updateField(field: keyof PlayerFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <label style={labelStyle}>Name *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          required
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Team</label>
        <select value={form.team_id} onChange={(e) => updateField("team_id", e.target.value)} style={inputStyle}>
          <option value="">No team</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: "1rem" }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Position</label>
          <input
            type="text"
            value={form.raw_position}
            onChange={(e) => updateField("raw_position", e.target.value)}
            placeholder="e.g. Forward"
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Position Group</label>
          <select value={form.position_group} onChange={(e) => updateField("position_group", e.target.value)} style={inputStyle}>
            <option value="">Unknown</option>
            <option value="Goalkeeper">Goalkeeper</option>
            <option value="Defender">Defender</option>
            <option value="Midfielder">Midfielder</option>
            <option value="Forward">Forward</option>
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1rem" }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Nationality</label>
          <input
            type="text"
            value={form.nationality}
            onChange={(e) => updateField("nationality", e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Date of Birth</label>
          <input
            type="date"
            value={form.date_of_birth}
            onChange={(e) => updateField("date_of_birth", e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Shirt Number</label>
        <input
          type="number"
          min="0"
          max="99"
          value={form.shirt_number}
          onChange={(e) => updateField("shirt_number", e.target.value)}
          style={{ ...inputStyle, maxWidth: "120px" }}
        />
      </div>

      {children}

      {error && <p style={{ color: "var(--loss)", fontSize: "0.875rem" }}>{error}</p>}
      {success && <p style={{ color: "var(--win)", fontSize: "0.875rem" }}>{success}</p>}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          type="submit"
          disabled={loading || !form.name.trim()}
          style={{
            padding: "0.75rem 1.5rem",
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading || !form.name.trim() ? 0.6 : 1,
          }}
        >
          {loading ? "Saving..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "0.75rem 1.5rem",
              background: "var(--surface)",
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "0.25rem",
  fontSize: "0.875rem",
  color: "var(--text-muted)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  color: "var(--text)",
  fontSize: "0.875rem",
};

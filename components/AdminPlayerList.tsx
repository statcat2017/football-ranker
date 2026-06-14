"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface Player {
  id: number;
  name: string;
  team_name: string | null;
  position_group: string | null;
  shirt_number: number | null;
  is_active: number;
  elo_rating: number;
  comparisons: number;
  photo_url: string | null;
}

interface PlayersResponse {
  players: Player[];
  total: number;
}

const PAGE_SIZE = 50;

export function AdminPlayerList() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [photoFilter, setPhotoFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (activeFilter) params.set("active", activeFilter);
      if (photoFilter) params.set("hasPhoto", photoFilter);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));

      try {
        const res = await fetch("/api/admin/players?" + params.toString());
        if (res.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        const data: PlayersResponse = await res.json();
        if (!cancelled) {
          setPlayers(data.players);
          setTotal(data.total);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [search, activeFilter, photoFilter, offset, refreshKey]);

  function handleSearchChange(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      setOffset(0);
    }, 300);
  }

  function handleFilterChange(setter: (v: string) => void, value: string) {
    setter(value);
    setOffset(0);
  }

  async function handleToggleActive(id: number, activate: boolean) {
    const res = await fetch(`/api/admin/players/${id}/active`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: activate }),
    });
    if (res.ok) setRefreshKey((k) => k + 1);
  }

  async function handlePhotoUpload(id: number, file: File) {
    setUploadingId(id);
    const formData = new FormData();
    formData.append("photo", file);
    await fetch(`/api/admin/players/${id}/photo`, { method: "POST", body: formData });
    setUploadingId(null);
    setRefreshKey((k) => k + 1);
  }

  function setMissingPhotosFilter() {
    setActiveFilter("true");
    setPhotoFilter("false");
    setOffset(0);
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Players</h1>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={handleLogout}
            style={{
              padding: "0.5rem 1rem",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--text-muted)",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
          <a
            href="/admin/players/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.5rem 1rem",
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            + Add Player
          </a>
        </div>
      </div>

      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search players..."
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{
            padding: "0.5rem 1rem",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--text)",
            fontSize: "0.875rem",
            minWidth: "200px",
          }}
        />
        <select
          value={activeFilter}
          onChange={(e) => handleFilterChange(setActiveFilter, e.target.value)}
          style={{
            padding: "0.5rem 1rem",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--text)",
            fontSize: "0.875rem",
          }}
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select
          value={photoFilter}
          onChange={(e) => handleFilterChange(setPhotoFilter, e.target.value)}
          style={{
            padding: "0.5rem 1rem",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--text)",
            fontSize: "0.875rem",
          }}
        >
          <option value="">All Photos</option>
          <option value="true">Has Photo</option>
          <option value="false">No Photo</option>
        </select>
        <button
          onClick={setMissingPhotosFilter}
          style={{
            padding: "0.5rem 1rem",
            background: photoFilter === "false" && activeFilter === "true" ? "var(--accent)" : "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: photoFilter === "false" && activeFilter === "true" ? "#fff" : "var(--text)",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Missing Photos
        </button>
      </div>

      <div style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
        {loading ? "Loading..." : `${total} player${total !== 1 ? "s" : ""}`}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={thStyle}>Photo</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Team</th>
              <th style={thStyle}>Position</th>
              <th style={thStyle}>Shirt</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>ELO</th>
              <th style={thStyle}>Votes</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {players.length === 0 && !loading ? (
              <tr>
                <td colSpan={9} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                  No players found
                </td>
              </tr>
            ) : (
              players.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={tdStyle}>
                    {p.photo_url ? (
                      <Image src={p.photo_url} alt="" width={36} height={36} style={{ borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "var(--surface-hover)",
                          cursor: "pointer",
                          fontSize: "0.7rem",
                          color: uploadingId === p.id ? "var(--text-muted)" : "var(--accent)",
                          fontWeight: 600,
                        }}
                        title="Upload photo"
                      >
                        {uploadingId === p.id ? "\u2026" : "+"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          style={{ display: "none" }}
                          disabled={uploadingId !== null}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoUpload(p.id, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{p.name}</td>
                  <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{p.team_name || "\u2014"}</td>
                  <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{p.position_group || "\u2014"}</td>
                  <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{p.shirt_number ?? "\u2014"}</td>
                  <td style={tdStyle}>
                    {p.is_active ? (
                      <span style={{ color: "var(--win)" }}>Active</span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>Inactive</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{Math.round(p.elo_rating)}</td>
                  <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{p.comparisons}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <a href={`/admin/players/${p.id}/edit`} style={{ color: "var(--accent)", fontSize: "0.8rem" }}>Edit</a>
                      {p.is_active ? (
                        <button
                          onClick={() => handleToggleActive(p.id, false)}
                          style={{ background: "none", border: "none", color: "var(--provisional)", fontSize: "0.8rem", cursor: "pointer" }}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleActive(p.id, true)}
                          style={{ background: "none", border: "none", color: "var(--win)", fontSize: "0.8rem", cursor: "pointer" }}
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setOffset((page - 1) * PAGE_SIZE)}
              style={{
                padding: "0.5rem 0.75rem",
                background: page === currentPage ? "var(--accent)" : "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                color: "var(--text)",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.75rem",
  color: "var(--text-muted)",
  fontSize: "0.8rem",
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
};

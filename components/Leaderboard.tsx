"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import type { LeaderboardEntry } from "@/lib/types";

interface LeaderboardProps {
  initialData: LeaderboardEntry[];
}

export function Leaderboard({ initialData }: LeaderboardProps) {
  const [data, setData] = useState<LeaderboardEntry[]>(initialData);
  const [showProvisional, setShowProvisional] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const refreshLeaderboard = useCallback(async (include: boolean) => {
    try {
      const res = await fetch(`/api/leaderboard?provisional=${include}`);
      const json = await res.json();
      setData(json.leaderboard);
      setLastUpdated(new Date());
    } catch {
      // silently ignore refresh errors
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      refreshLeaderboard(showProvisional);
    }, 30000);

    return () => clearInterval(interval);
  }, [showProvisional, refreshLeaderboard]);

  const handleToggle = useCallback(
    (checked: boolean) => {
      setShowProvisional(checked);
      refreshLeaderboard(checked);
    },
    [refreshLeaderboard],
  );

  return (
    <div className="leaderboard">
      <div className="leaderboard__controls">
        <label className="leaderboard__toggle">
          <input
            type="checkbox"
            checked={showProvisional}
            onChange={(e) => handleToggle(e.target.checked)}
          />
          Show provisional rankings
        </label>
        <span className="leaderboard__updated">
          Updated {lastUpdated.toLocaleTimeString()}
        </span>
      </div>

      <div className="leaderboard__table-wrapper">
        <table className="leaderboard__table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Team</th>
              <th>Pos</th>
              <th>ELO</th>
              <th>W</th>
              <th>L</th>
              <th>Matches</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry) => {
              let rowClass = entry.is_provisional ? "provisional" : "";
              if (entry.rank === 1) rowClass += " rank-gold";
              if (entry.rank === 2) rowClass += " rank-silver";
              if (entry.rank === 3) rowClass += " rank-bronze";

              return (
                <tr key={entry.id} className={rowClass}>
                  <td className="leaderboard__rank">{entry.rank}</td>
                  <td>
                    <div className="leaderboard__player">
                      {entry.photo_url ? (
                        <Image
                          src={entry.photo_url}
                          alt={entry.name}
                          width={24}
                          height={24}
                          style={{ borderRadius: "50%", objectFit: "cover" }}
                          className="leaderboard__crest"
                        />
                      ) : entry.team_crest_url ? (
                        <Image
                          src={entry.team_crest_url}
                          alt=""
                          width={20}
                          height={20}
                          className="leaderboard__crest"
                        />
                      ) : null}
                      <span>{entry.name}</span>
                    </div>
                  </td>
                  <td className="leaderboard__team">{entry.team_name}</td>
                  <td>{entry.position_group}</td>
                  <td className="leaderboard__elo">
                    {Math.round(entry.elo_rating)}
                  </td>
                  <td>{entry.wins}</td>
                  <td>{entry.losses}</td>
                  <td>
                    {entry.comparisons}
                    {entry.is_provisional && (
                      <span className="provisional-badge">Prov</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { LeaderboardEntry } from "@/lib/types";

interface LeaderboardProps {
  initialData: LeaderboardEntry[];
}

export function Leaderboard({ initialData }: LeaderboardProps) {
  const [data, setData] = useState<LeaderboardEntry[]>(initialData);
  const [showProvisional, setShowProvisional] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.visibilityState === "hidden") return;

      try {
        const res = await fetch(
          `/api/leaderboard?provisional=${showProvisional}`,
        );
        const json = await res.json();
        setData(json.leaderboard);
        setLastUpdated(new Date());
      } catch {
        // silently ignore refresh errors
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [showProvisional]);

  return (
    <div className="leaderboard">
      <div className="leaderboard__controls">
        <label className="leaderboard__toggle">
          <input
            type="checkbox"
            checked={showProvisional}
            onChange={(e) => setShowProvisional(e.target.checked)}
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
                      {entry.team_crest_url && (
                        <Image
                          src={entry.team_crest_url}
                          alt=""
                          width={20}
                          height={20}
                          className="leaderboard__crest"
                        />
                      )}
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

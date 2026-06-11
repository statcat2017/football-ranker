"use client";

import { useState, useCallback } from "react";
import { PlayerCard } from "./PlayerCard";
import type { Matchup, CastVoteResult } from "@/lib/types";

interface VotePanelProps {
  initialMatchup: Matchup;
}

type VoteStatus = "idle" | "voting" | "result";

export function VotePanel({ initialMatchup }: VotePanelProps) {
  const [matchup, setMatchup] = useState<Matchup>(initialMatchup);
  const [status, setStatus] = useState<VoteStatus>("idle");
  const [voteCount, setVoteCount] = useState(0);
  const [lastResult, setLastResult] = useState<CastVoteResult["vote"] | null>(null);

  const fetchNewMatchup = useCallback(async () => {
    try {
      const res = await fetch("/api/matchups/next");
      if (res.ok) {
        const newMatchup = await res.json();
        setMatchup(newMatchup);
      }
    } catch {
      // retry silently failed
    }
  }, []);

  const handleVote = useCallback(
    async (winnerId: number) => {
      if (status === "voting") return;
      setStatus("voting");

      try {
        const res = await fetch("/api/votes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchupToken: matchup.token,
            playerAId: matchup.playerA.id,
            playerBId: matchup.playerB.id,
            winnerId,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          console.error("Vote failed:", err);
          setStatus("idle");
          return;
        }

        const data: CastVoteResult = await res.json();
        setLastResult(data.vote);
        setStatus("result");

        setTimeout(() => {
          if (data.nextMatchup) {
            setMatchup(data.nextMatchup);
          }
          setLastResult(null);
          setStatus("idle");
          setVoteCount((prev) => prev + 1);
        }, 800);
      } catch (err) {
        console.error("Vote error:", err);
        setStatus("idle");
      }
    },
    [matchup, status],
  );

  const winnerId = lastResult?.winnerId;
  const loserId = lastResult?.loserId;

  return (
    <div className="vote-panel">
      <div className="matchup" role="group" aria-label="Choose the better player">
        <PlayerCard
          player={matchup.playerA}
          onSelect={() => handleVote(matchup.playerA.id)}
          disabled={status !== "idle"}
          isWinner={status === "result" && matchup.playerA.id === winnerId}
          isLoser={status === "result" && matchup.playerA.id === loserId}
        />
        <div className="matchup__vs" aria-hidden="true">
          <span>VS</span>
        </div>
        <PlayerCard
          player={matchup.playerB}
          onSelect={() => handleVote(matchup.playerB.id)}
          disabled={status !== "idle"}
          isWinner={status === "result" && matchup.playerB.id === winnerId}
          isLoser={status === "result" && matchup.playerB.id === loserId}
        />
      </div>
      {voteCount > 0 && (
        <p className="vote-panel__count">
          You&apos;ve voted {voteCount} time{voteCount !== 1 ? "s" : ""}
        </p>
      )}
      <button className="vote-panel__refresh" onClick={fetchNewMatchup}>
        Skip this matchup
      </button>
    </div>
  );
}

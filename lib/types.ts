export interface Team {
  id: number;
  external_id: string;
  name: string;
  short_name: string | null;
  crest_url: string | null;
  season_label: string;
}

export interface Player {
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
}

export interface PlayerSummary {
  id: number;
  name: string;
  position_group: string | null;
  nationality: string | null;
  shirt_number: number | null;
  team_name: string | null;
  team_crest_url: string | null;
  elo_rating: number;
  comparisons: number;
}

export interface Vote {
  id: number;
  player_a_id: number;
  player_b_id: number;
  winner_id: number;
  loser_id: number;
  player_a_elo_before: number;
  player_b_elo_before: number;
  player_a_elo_after: number;
  player_b_elo_after: number;
  k_factor: number;
  session_id: string | null;
  ip_hash: string | null;
  user_agent_hash: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  id: number;
  name: string;
  team_name: string | null;
  team_crest_url: string | null;
  position_group: string | null;
  elo_rating: number;
  wins: number;
  losses: number;
  comparisons: number;
  is_provisional: boolean;
}

export interface Matchup {
  playerA: PlayerSummary;
  playerB: PlayerSummary;
}

export interface CastVoteInput {
  playerAId: number;
  playerBId: number;
  winnerId: number;
  sessionId?: string;
  ipHash?: string;
  userAgentHash?: string;
}

export interface CastVoteResult {
  vote: {
    winnerId: number;
    loserId: number;
    winnerDelta: number;
    loserDelta: number;
  };
  nextMatchup: Matchup;
}

const POSITION_MAP: Record<string, string> = {
  Goalkeeper: "Goalkeeper",
  Defence: "Defender",
  Defender: "Defender",
  Midfield: "Midfielder",
  Midfielder: "Midfielder",
  Offence: "Attacker",
  Attacker: "Attacker",
};

export function normalizePosition(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return POSITION_MAP[trimmed] ?? trimmed;
}

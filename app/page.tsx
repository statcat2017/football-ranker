import Link from "next/link";

export default function Home() {
  return (
    <main style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "1.5rem", padding: "2rem", textAlign: "center" }}>
      <h1 style={{ fontSize: "3rem", fontWeight: 700 }}>Football Ranker</h1>
      <p style={{ color: "var(--text-muted)", maxWidth: "400px" }}>
        Who&apos;s better? Pick the stronger Premier League player. Live fan-powered rankings.
      </p>
      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        <Link href="/vote" style={{ padding: "0.75rem 2rem", background: "var(--accent)", color: "#fff", borderRadius: "0.5rem", fontWeight: 600, textDecoration: "none" }}>
          Start Voting
        </Link>
        <Link href="/leaderboard" style={{ padding: "0.75rem 2rem", background: "var(--surface)", color: "var(--text)", borderRadius: "0.5rem", fontWeight: 600, border: "1px solid var(--border)", textDecoration: "none" }}>
          Leaderboard
        </Link>
      </div>
    </main>
  );
}

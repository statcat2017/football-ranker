export const dynamic = "force-dynamic";

import { getDatabase } from "@/lib/db/client";
import { getLeaderboard } from "@/lib/leaderboard/queries";
import { Leaderboard } from "@/components/Leaderboard";
import Link from "next/link";

export default async function LeaderboardPage() {
  const db = await getDatabase();
  const leaderboard = await getLeaderboard(db, { limit: 100 });

  return (
    <main className="page">
      <nav className="nav">
        <Link href="/" className="nav__back">Home</Link>
        <Link href="/vote" className="nav__link">Vote</Link>
      </nav>
      <section className="leaderboard-section">
        <h1 className="leaderboard-section__title">Leaderboard</h1>
        <p className="leaderboard-section__subtitle">
          Top Premier League players ranked by fan votes
        </p>
        <Leaderboard initialData={leaderboard} />
      </section>
    </main>
  );
}

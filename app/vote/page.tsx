export const dynamic = "force-dynamic";

import { getDatabase } from "@/lib/db/client";
import { getRandomMatchup } from "@/lib/players/queries";
import { VotePanel } from "@/components/VotePanel";
import Link from "next/link";

export default async function VotePage() {
  const db = await getDatabase();
  let matchup;

  try {
    matchup = await getRandomMatchup(db);
  } catch {
    return (
      <main className="page">
        <nav className="nav">
          <Link href="/" className="nav__back">Home</Link>
          <Link href="/leaderboard" className="nav__link">Leaderboard</Link>
        </nav>
        <div className="empty-state">
          <h2>No Players Yet</h2>
          <p>Import Premier League players to start voting.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <nav className="nav">
        <Link href="/" className="nav__back">Home</Link>
        <Link href="/leaderboard" className="nav__link">Leaderboard</Link>
      </nav>
      <section className="vote-section">
        <h1 className="vote-section__title">Who&apos;s better?</h1>
        <p className="vote-section__subtitle">
          Pick the stronger Premier League player
        </p>
        <VotePanel initialMatchup={matchup} />
      </section>
    </main>
  );
}

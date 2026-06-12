import { VotePanel } from "@/components/VotePanel";
import Link from "next/link";

export default function VotePage() {
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
        <VotePanel />
      </section>
    </main>
  );
}

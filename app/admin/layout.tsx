import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page">
      <nav className="nav" style={{ borderBottom: "1px solid var(--border)" }}>
        <Link href="/admin/players" className="nav__back" style={{ marginRight: "auto" }}>
          Admin
        </Link>
        <Link href="/admin/players" className="nav__link">
          Players
        </Link>
        <Link href="/" className="nav__link">
          Public Site
        </Link>
      </nav>
      <main style={{ maxWidth: "1200px", margin: "2rem auto", padding: "0 1.5rem" }}>
        {children}
      </main>
    </div>
  );
}

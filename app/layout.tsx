import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Football Ranker",
  description: "Pick the stronger Premier League player. Live fan-powered rankings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

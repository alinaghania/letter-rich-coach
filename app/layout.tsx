import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Letter 💸 — ton coach pour devenir riche (sans pitié)",
  description: "Chat avec Letter, le coach financier rude et drôle. Vraie recherche web + graphiques, propulsé par Opus 4.8.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

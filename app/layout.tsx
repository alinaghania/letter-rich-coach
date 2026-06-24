import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Letter 💸 — your brutally honest money coach",
  description: "Chat with Letter, the savage money coach. Real web research + charts, zero mercy.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

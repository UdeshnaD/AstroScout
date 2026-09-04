import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AstroScout",
  description: "A night-sky trip planner for astronomy events, nearby viewing spots, and live sky conditions."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

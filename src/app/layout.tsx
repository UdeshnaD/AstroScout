import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AstroScout | MQ Astronomy Night",
  description:
    "Explore observing locations around Sydney, compare hourly forecasts and celestial positions, and personalize your night with an explainable learning model.",
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

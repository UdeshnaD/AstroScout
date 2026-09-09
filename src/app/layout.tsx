import type { Metadata } from "next";
import "./globals.css";
import { interfaceFont, editorialFont } from "@ui/fonts";

export const metadata: Metadata = {
  title: "AstroScout | MQ Astronomy Night",
  description:
    "Use real NASA/JPL positions and local weather to plan when and where to observe the Moon and visible planets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${interfaceFont.variable} ${editorialFont.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}

import localFont from "next/font/local";

export const interfaceFont = localFont({
  src: "../node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2",
  variable: "--font-interface",
  weight: "100 900",
  display: "swap",
  adjustFontFallback: "Arial",
});

export const editorialFont = localFont({
  src: "../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2",
  variable: "--font-editorial",
  weight: "200 800",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

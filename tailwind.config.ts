import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/data/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"]
      },
      colors: {
        night: {
          950: "#07111f",
          900: "#0b1626",
          800: "#102033"
        },
        aurora: "#4ade80",
        amberstar: "#f8c56b",
        comet: "#67e8f9",
        roseflare: "#fb7185"
      }
    }
  },
  plugins: []
};

export default config;

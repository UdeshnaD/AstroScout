import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AstroScout Astronomy Night",
    short_name: "AstroScout",
    description: "Use real JPL positions and local weather to explore tonight's sky.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f5f1",
    theme_color: "#111916",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/astroscout-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/astroscout-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Tonight",
        short_name: "Tonight",
        description: "Check tonight's sky and observing conditions.",
        url: "/",
      },
      {
        name: "Observation journal",
        short_name: "Journal",
        description: "Open saved observation notes and target lists.",
        url: "/journal",
      },
    ],
  };
}

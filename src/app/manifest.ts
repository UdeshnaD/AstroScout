import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Space Interpreter Astronomy Night",
    short_name: "Space Interpreter",
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
        src: "/space-interpreter-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/space-interpreter-icon.svg",
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

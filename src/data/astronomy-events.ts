import type { NightSkyHighlight } from "@/types/astronomy";

export const baseNightSkyHighlights: NightSkyHighlight[] = [
  {
    id: "moon-detail",
    name: "The Moon",
    type: "moon",
    bestTime: "Early evening",
    direction: "East to north depending on phase",
    equipment: "Eyes, binoculars, or telescope",
    confidence: "high",
    description:
      "The Moon is the easiest target to observe. Craters and mountain shadows are most dramatic near quarter phases."
  },
  {
    id: "saturn",
    name: "Saturn",
    type: "planet",
    bestTime: "Late evening",
    direction: "Northern sky from Sydney latitudes",
    equipment: "Telescope helpful",
    confidence: "medium",
    description:
      "Saturn is one of the most memorable telescope targets. A small telescope can show the ring system as a distinct oval shape."
  },
  {
    id: "jupiter",
    name: "Jupiter",
    type: "planet",
    bestTime: "Late evening to pre-dawn when above the horizon",
    direction: "East to north as it rises",
    equipment: "Binoculars helpful, telescope ideal",
    confidence: "medium",
    description:
      "Jupiter is bright enough to spot with the naked eye. Binoculars can reveal its four largest moons as tiny points of light."
  },
  {
    id: "milky-way",
    name: "Milky Way",
    type: "deep-sky",
    bestTime: "After astronomical twilight",
    direction: "South to southwest during suitable seasons",
    equipment: "Dark sky and naked eye",
    confidence: "medium",
    description:
      "The Milky Way becomes easier to see away from city light, especially when the Moon is dim or below the horizon."
  }
];

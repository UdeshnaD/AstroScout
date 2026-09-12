import type { EventTarget } from "./event-types";

export type ObjectGuidance = {
  starter: string;
  equipment: string;
  photography: string;
  sourceLabel: string;
  sourceUrl: string;
};

const guidance: Partial<Record<EventTarget, ObjectGuidance>> = {
  moon: {
    starter: "Bright, easy to locate and rewarding at any magnification.",
    equipment: "Start with your eyes or binoculars; a telescope reveals smaller surface detail.",
    photography: "Its brightness makes it a forgiving first phone or camera target.",
    sourceLabel: "NASA Moon viewing tips",
    sourceUrl: "https://science.nasa.gov/moon/viewing-tips/",
  },
  venus: {
    starter: "One of the easiest planets to locate when it is safely separated from the Sun.",
    equipment: "Visible to the unaided eye; a telescope is needed to see its phase clearly.",
    photography: "Its small, bright disc needs careful exposure and steady magnification.",
    sourceLabel: "NASA skywatching FAQ",
    sourceUrl: "https://science.nasa.gov/skywatching/faq/",
  },
  mars: {
    starter: "A bright, distinctive point when well placed; surface detail is more demanding.",
    equipment: "Use your eyes to locate it, then a telescope for any visible surface detail.",
    photography: "Its small apparent disc rewards steady air and high-resolution technique.",
    sourceLabel: "NASA skywatching FAQ",
    sourceUrl: "https://science.nasa.gov/skywatching/faq/",
  },
  jupiter: {
    starter: "Bright and easy to locate; its four large moons are a strong binocular target.",
    equipment: "Binoculars can reveal the moons; a telescope adds cloud bands when conditions allow.",
    photography: "Short, high-frame-rate captures suit its bright disc and moving moons.",
    sourceLabel: "NASA: Observe Jupiter",
    sourceUrl:
      "https://science.nasa.gov/solar-system/skywatching/night-sky-network/spot-the-king-of-planets-observe-jupiter/",
  },
  saturn: {
    starter: "Easy to identify once its position is known; the rings are the telescopic reward.",
    equipment: "Visible to the unaided eye, but use a telescope to distinguish the rings.",
    photography: "Its rings reward stable air, accurate focus and planetary imaging technique.",
    sourceLabel: "NASA skywatching FAQ",
    sourceUrl: "https://science.nasa.gov/skywatching/faq/",
  },
};

export function objectGuidance(target: EventTarget) {
  return guidance[target] ?? null;
}

export const smartphonePhotographyGuide =
  "https://science.nasa.gov/solar-system/skywatching/night-sky-network/astrophotography-with-your-smartphone/";

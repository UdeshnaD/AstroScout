import type { Equipment, TargetId } from "@/lib/observation-model";

export type ViewingDifficulty = "Easy" | "Moderate" | "Difficult" | "Not recommended";
type Profile = Record<Equipment["kind"], ViewingDifficulty> & { source: string; sourceUrl: string };

// These are conservative observing-method distinctions, not claims that a
// particular detail will be resolved. NASA's Night Sky Network explicitly
// supports binocular views of M31/M42/M45 and Jupiter's moons; the remaining
// deep-sky classifications retain a conservative optical recommendation.
const profiles: Record<TargetId, Profile> = {
  moon: { eye: "Easy", binoculars: "Easy", telescope: "Easy", source: "NASA Moon Viewing Tips", sourceUrl: "https://science.nasa.gov/moon/viewing-tips/" },
  venus: { eye: "Easy", binoculars: "Moderate", telescope: "Easy", source: "NASA Skywatching FAQ", sourceUrl: "https://science.nasa.gov/skywatching/faq/" },
  mars: { eye: "Easy", binoculars: "Difficult", telescope: "Moderate", source: "NASA Skywatching FAQ", sourceUrl: "https://science.nasa.gov/skywatching/faq/" },
  jupiter: { eye: "Easy", binoculars: "Easy", telescope: "Easy", source: "NASA: Observe Jupiter", sourceUrl: "https://science.nasa.gov/solar-system/skywatching/night-sky-network/spot-the-king-of-planets-observe-jupiter/" },
  saturn: { eye: "Moderate", binoculars: "Difficult", telescope: "Easy", source: "NASA Skywatching FAQ", sourceUrl: "https://science.nasa.gov/skywatching/faq/" },
  "milky-way-core": { eye: "Moderate", binoculars: "Easy", telescope: "Moderate", source: "NASA binocular observing guide", sourceUrl: "https://science.nasa.gov/solar-system/skywatching/night-sky-network/binoculars-a-great-first-telescope/" },
  andromeda: { eye: "Difficult", binoculars: "Moderate", telescope: "Moderate", source: "NASA binocular observing guide", sourceUrl: "https://science.nasa.gov/solar-system/skywatching/night-sky-network/binoculars-a-great-first-telescope/" },
  "large-magellanic-cloud": { eye: "Moderate", binoculars: "Easy", telescope: "Moderate", source: "NASA Skywatching FAQ", sourceUrl: "https://science.nasa.gov/skywatching/faq/" },
  "small-magellanic-cloud": { eye: "Moderate", binoculars: "Easy", telescope: "Moderate", source: "NASA Skywatching FAQ", sourceUrl: "https://science.nasa.gov/skywatching/faq/" },
  "orion-nebula": { eye: "Difficult", binoculars: "Moderate", telescope: "Easy", source: "NASA binocular observing guide", sourceUrl: "https://science.nasa.gov/solar-system/skywatching/night-sky-network/binoculars-a-great-first-telescope/" },
  "eta-carinae": { eye: "Moderate", binoculars: "Easy", telescope: "Moderate", source: "NASA Skywatching FAQ", sourceUrl: "https://science.nasa.gov/skywatching/faq/" },
  pleiades: { eye: "Easy", binoculars: "Easy", telescope: "Moderate", source: "NASA binocular observing guide", sourceUrl: "https://science.nasa.gov/solar-system/skywatching/night-sky-network/binoculars-a-great-first-telescope/" },
  "omega-centauri": { eye: "Difficult", binoculars: "Moderate", telescope: "Easy", source: "NASA Skywatching FAQ", sourceUrl: "https://science.nasa.gov/skywatching/faq/" },
  hyades: { eye: "Easy", binoculars: "Easy", telescope: "Moderate", source: "NASA binocular observing guide", sourceUrl: "https://science.nasa.gov/solar-system/skywatching/night-sky-network/binoculars-a-great-first-telescope/" },
  "hercules-cluster": { eye: "Not recommended", binoculars: "Difficult", telescope: "Moderate", source: "NASA Skywatching FAQ", sourceUrl: "https://science.nasa.gov/skywatching/faq/" },
};
const modifiers: Record<ViewingDifficulty, number> = { Easy: 0, Moderate: -8, Difficult: -20, "Not recommended": -35 };
export function viewingDifficulty(target: TargetId, equipment: Equipment["kind"]) { return profiles[target][equipment]; }
export function viewingReadinessModifier(target: TargetId, equipment: Equipment["kind"]) { return modifiers[viewingDifficulty(target, equipment)]; }
export function viewingProfile(target: TargetId) { return profiles[target]; }

import type { TargetId } from "@/lib/observation-model";

export type ObjectRecommendation = {
  beginner?: string;
  photography: "Great" | "Good" | "Challenging" | "Not recommended";
  photographyNote: string;
};

const recommendations: Record<TargetId, ObjectRecommendation> = {
  moon: { beginner: "Bright, easy to find, and rewarding at any magnification.", photography: "Great", photographyNote: "Bright detail makes it a forgiving first camera or phone target." },
  venus: { beginner: "One of the easiest planets to locate when safely away from the Sun.", photography: "Challenging", photographyNote: "Its small, bright disk needs careful exposure and steady magnification." },
  mars: { beginner: "A bright, distinctive point; surface detail is a later challenge.", photography: "Challenging", photographyNote: "Its small apparent disk rewards steady seeing and high-resolution technique." },
  jupiter: { beginner: "Bright and easy to locate; its moons make every session rewarding.", photography: "Good", photographyNote: "A bright disk and moving moons suit short, high-frame-rate captures." },
  saturn: { beginner: "Easy to identify once pointed out; a telescope reveals the payoff.", photography: "Good", photographyNote: "Its rings reward steady conditions and planetary imaging." },
  "milky-way-core": { beginner: "A dark-site naked-eye landmark with a broad, memorable view.", photography: "Great", photographyNote: "Its wide field is well suited to a tripod-mounted camera." },
  andromeda: { photography: "Good", photographyNote: "A bright, large galaxy for tracked or dark-site wide-field imaging." },
  "large-magellanic-cloud": { beginner: "A conspicuous southern-sky companion from a dark site.", photography: "Great", photographyNote: "Its large apparent size rewards wide-field imaging." },
  "small-magellanic-cloud": { photography: "Good", photographyNote: "A dark site and wide field help bring out its diffuse shape." },
  "orion-nebula": { beginner: "A bright nebula with a clear binocular and telescope payoff.", photography: "Great", photographyNote: "Bright nebulosity makes it a productive deep-sky imaging target." },
  "eta-carinae": { beginner: "A standout southern nebula in binoculars from a dark site.", photography: "Great", photographyNote: "Large, bright nebulosity suits wide-field or telescope imaging." },
  pleiades: { beginner: "A compact, unmistakable naked-eye cluster that shines in binoculars.", photography: "Good", photographyNote: "A wide field frames the cluster; long exposures can reveal faint dust." },
  "omega-centauri": { photography: "Good", photographyNote: "Its dense, bright core is rewarding once it is high in the sky." },
  hyades: { beginner: "A large V-shaped cluster, easy to find with unaided eyes.", photography: "Good", photographyNote: "Its broad field works well with a short focal length." },
  "hercules-cluster": { photography: "Challenging", photographyNote: "Low northern altitude from NSW makes both observing and imaging demanding." },
};
export function objectRecommendation(target: TargetId) { return recommendations[target]; }
export const astrophotographyGuide = "https://science.nasa.gov/solar-system/skywatching/night-sky-network/astrophotography-with-your-smartphone/";

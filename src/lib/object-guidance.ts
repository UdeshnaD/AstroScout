import type { EventTarget } from "./event-types";

export type ObjectGuidance = {
  beginner: "Beginner friendly" | "Some experience helpful" | "Advanced target";
  astrophotography: "Good" | "Moderate" | "Challenging";
  starter: string;
  equipment: string;
  photography: string;
  sourceLabel: string;
  sourceUrl: string;
};

const guidance: Partial<Record<EventTarget, ObjectGuidance>> = {
  moon: {
    beginner: "Beginner friendly", astrophotography: "Good",
    starter: "Bright, easy to locate and rewarding at any magnification.",
    equipment: "Start with your eyes or binoculars; a telescope reveals smaller surface detail.",
    photography: "Its brightness makes it a forgiving first phone or camera target.",
    sourceLabel: "NASA Moon viewing tips",
    sourceUrl: "https://science.nasa.gov/moon/viewing-tips/",
  },
  mercury: {
    beginner: "Some experience helpful", astrophotography: "Challenging",
    starter: "Mercury stays close to the Sun, so the useful viewing period is usually short and low in twilight.",
    equipment: "It can be visible without equipment, but binoculars may help after the Sun is safely below the horizon.",
    photography: "A clear horizon, careful timing and short exposures are more important than high magnification.",
    sourceLabel: "NASA: Mercury",
    sourceUrl: "https://science.nasa.gov/mercury/",
  },
  venus: {
    beginner: "Beginner friendly", astrophotography: "Moderate",
    starter: "One of the easiest planets to locate when it is safely separated from the Sun.",
    equipment: "Visible to the unaided eye; a telescope is needed to see its phase clearly.",
    photography: "Its small, bright disc needs careful exposure and steady magnification.",
    sourceLabel: "NASA skywatching FAQ",
    sourceUrl: "https://science.nasa.gov/skywatching/faq/",
  },
  mars: {
    beginner: "Some experience helpful", astrophotography: "Challenging",
    starter: "A bright, distinctive point when well placed; surface detail is more demanding.",
    equipment: "Use your eyes to locate it, then a telescope for any visible surface detail.",
    photography: "Its small apparent disc rewards steady air and high-resolution technique.",
    sourceLabel: "NASA skywatching FAQ",
    sourceUrl: "https://science.nasa.gov/skywatching/faq/",
  },
  jupiter: {
    beginner: "Beginner friendly", astrophotography: "Good",
    starter: "Bright and easy to locate; its four large moons are a strong binocular target.",
    equipment: "Binoculars can reveal the moons; a telescope adds cloud bands when conditions allow.",
    photography: "Short, high-frame-rate captures suit its bright disc and moving moons.",
    sourceLabel: "NASA: Observe Jupiter",
    sourceUrl:
      "https://science.nasa.gov/solar-system/skywatching/night-sky-network/spot-the-king-of-planets-observe-jupiter/",
  },
  saturn: {
    beginner: "Some experience helpful", astrophotography: "Good",
    starter: "Easy to identify once its position is known; the rings are the telescopic reward.",
    equipment: "Visible to the unaided eye, but use a telescope to distinguish the rings.",
    photography: "Its rings reward stable air, accurate focus and planetary imaging technique.",
    sourceLabel: "NASA skywatching FAQ",
    sourceUrl: "https://science.nasa.gov/skywatching/faq/",
  },
  uranus: {
    beginner: "Advanced target", astrophotography: "Challenging",
    starter: "Uranus looks like a very faint point unless the sky is dark and its position is known precisely.",
    equipment: "Binoculars may locate it from a dark site; a telescope helps separate its small disc from nearby stars.",
    photography: "Accurate tracking and a current position chart are needed for a useful image.",
    sourceLabel: "NASA: Uranus",
    sourceUrl: "https://science.nasa.gov/uranus/",
  },
  neptune: {
    beginner: "Advanced target", astrophotography: "Challenging",
    starter: "Neptune is too faint for unaided-eye viewing and resembles a dim star at low magnification.",
    equipment: "Use a telescope and a precise finder chart generated for the selected time and location.",
    photography: "Long focal length, accurate tracking and stable air are important.",
    sourceLabel: "NASA: Neptune",
    sourceUrl: "https://science.nasa.gov/neptune/",
  },
  pluto: {
    beginner: "Advanced target", astrophotography: "Challenging",
    starter: "Pluto is an extremely faint point that cannot be distinguished from nearby stars by appearance alone.",
    equipment: "A capable telescope, a dark site and a precise comparison chart are required.",
    photography: "Tracked images taken on different nights can show its movement against background stars.",
    sourceLabel: "NASA: Pluto",
    sourceUrl: "https://science.nasa.gov/dwarf-planets/pluto/",
  },
  "milky-way-core": { beginner: "Some experience helpful", astrophotography: "Good", starter: "A broad band of starlight rather than a compact object. A dark site and low Moon matter most.", equipment: "Use unaided eyes first; binoculars reveal richer star fields.", photography: "Use a stable wide-angle camera, long exposure and dark skies.", sourceLabel: "NASA: Exploring the Milky Way", sourceUrl: "https://science.nasa.gov/wp-content/uploads/2023/10/Exploring_the_Milky_Way.pdf" },
  andromeda: { beginner: "Some experience helpful", astrophotography: "Good", starter: "A faint oval glow, not a photograph-like spiral, especially from a bright site.", equipment: "Binoculars are often the easiest way to find M31; use a clear northern horizon.", photography: "A tracked camera and dark sky reveal far more structure than visual observing.", sourceLabel: "NASA: Andromeda Galaxy", sourceUrl: "https://science.nasa.gov/asset/hubble/andromeda-galaxy-m31-wide-field-image/" },
  "large-magellanic-cloud": { beginner: "Beginner friendly", astrophotography: "Good", starter: "A diffuse luminous patch in the southern sky from a genuinely dark site.", equipment: "Try unaided eyes, then binoculars for star fields and brighter knots.", photography: "A wide field and dark, transparent conditions work well.", sourceLabel: "NASA: Large Magellanic Cloud", sourceUrl: "https://science.nasa.gov/asset/hubble/ground-image-of-large-magellanic-cloud/" },
  "small-magellanic-cloud": { beginner: "Some experience helpful", astrophotography: "Good", starter: "A smaller diffuse companion galaxy near the south celestial pole.", equipment: "Binoculars help distinguish its shape from surrounding stars.", photography: "Dark skies and a wide field are more useful than extreme magnification.", sourceLabel: "NASA: Small Magellanic Cloud", sourceUrl: "https://science.nasa.gov/photojournal/small-magellanic-cloud-imaged-by-herschel-planck-iras-cobe/" },
  "orion-nebula": { beginner: "Beginner friendly", astrophotography: "Good", starter: "A bright stellar nursery whose glow is visible under good conditions.", equipment: "Binoculars show the region; a telescope reveals more structure.", photography: "Short tracked exposures can capture colour and detail.", sourceLabel: "NASA: Orion Nebula", sourceUrl: "https://science.nasa.gov/asset/hubble/close-up-images-of-the-orion-nebula/" },
  "eta-carinae": { beginner: "Some experience helpful", astrophotography: "Good", starter: "A large southern nebula that rewards dark, transparent skies.", equipment: "Binoculars provide a useful wide field; telescopes reveal complex structure.", photography: "Use a wide field and avoid bright moonlight.", sourceLabel: "NASA: Carina Nebula", sourceUrl: "https://science.nasa.gov/image-detail/24850463718-07b2a6473e-o-2/" },
  pleiades: { beginner: "Beginner friendly", astrophotography: "Good", starter: "A recognisable naked-eye cluster; binoculars show many more stars.", equipment: "Use eyes or low-power binoculars to keep the cluster in one field.", photography: "A wide field and careful exposure retain the bright blue stars.", sourceLabel: "NASA: The Seven Sisters", sourceUrl: "https://science.nasa.gov/photojournal/the-seven-sisters/" },
  "omega-centauri": { beginner: "Some experience helpful", astrophotography: "Good", starter: "A standout southern globular cluster once it is well above the horizon.", equipment: "Binoculars show it as a bright ball; a telescope begins to resolve stars.", photography: "Tracking and a darker site bring out the cluster's outer stars.", sourceLabel: "ESA/Hubble: Omega Centauri", sourceUrl: "https://www.esa.int/ESA_Multimedia/Images/2024/07/Hubble_s_view_of_Omega_Centauri" },
  hyades: { beginner: "Beginner friendly", astrophotography: "Moderate", starter: "A broad V-shaped cluster that is best appreciated as a naked-eye pattern.", equipment: "Use unaided eyes or low-power binoculars rather than a narrow telescope view.", photography: "A wide field preserves the cluster's characteristic shape.", sourceLabel: "NASA: Hyades star cluster", sourceUrl: "https://science.nasa.gov/universe/exoplanets/the-hyades-star-cluster/" },
  "hercules-cluster": { beginner: "Advanced target", astrophotography: "Good", starter: "A compact globular cluster that stays low in the northern sky from NSW.", equipment: "Use binoculars to locate it, then a telescope for a better view.", photography: "A clear northern horizon and tracking are important.", sourceLabel: "NASA: Globular cluster M13", sourceUrl: "https://science.nasa.gov/asset/hubble/hubble-acswfpc2-image-of-globular-cluster-m13/" },
  "eta-aquariids": { beginner: "Beginner friendly", astrophotography: "Challenging", starter: "A meteor shower is best watched as a wide-sky event, not by staring at its radiant.", equipment: "Use unaided eyes, a reclining chair and a dark, open view of the sky.", photography: "Use a fixed wide-angle camera and expect many empty frames.", sourceLabel: "NASA: Meteor shower guide", sourceUrl: "https://science.nasa.gov/solar-system/meteors-meteorites/" },
  vesta: { beginner: "Advanced target", astrophotography: "Challenging", starter: "A moving asteroid that can look like an ordinary star without a precise chart.", equipment: "Use binoculars or a telescope with a current finder chart.", photography: "A time series can demonstrate its motion against background stars.", sourceLabel: "NASA/JPL: Small Bodies", sourceUrl: "https://ssd.jpl.nasa.gov/sb/" },
  iss: { beginner: "Beginner friendly", astrophotography: "Challenging", starter: "The ISS is a fast-moving bright point; a pass must be timed precisely.", equipment: "Unaided eyes are best for following a pass across the sky.", photography: "Use a wide fixed camera; telescope tracking is not suitable for a first pass.", sourceLabel: "NASA: International Space Station", sourceUrl: "https://www.nasa.gov/international-space-station/" },
};

export function objectGuidance(target: EventTarget) {
  return guidance[target] ?? null;
}

export const smartphonePhotographyGuide =
  "https://science.nasa.gov/solar-system/skywatching/night-sky-network/astrophotography-with-your-smartphone/";

export const stellariumWeb = "https://stellarium-web.org/";

export function equipmentAssessment(target: EventTarget) {
  const guide = objectGuidance(target);
  const text = guide?.equipment ?? "Use a current finder chart and choose equipment suited to the target.";
  return [
    { equipment: "Unaided eye", suitability: target === "moon" || target === "venus" || target === "jupiter" || target === "eta-aquariids" || target === "milky-way-core" || target === "large-magellanic-cloud" || target === "pleiades" || target === "hyades" || target === "iss" ? "Suitable" : "Limited" },
    { equipment: "Binoculars", suitability: target === "eta-aquariids" || target === "iss" ? "Not needed" : "Suitable" },
    { equipment: "Telescope", suitability: target === "eta-aquariids" || target === "iss" || target === "milky-way-core" || target === "hyades" ? "Not needed" : "Suitable" },
  ].map((item) => ({ ...item, note: text }));
}

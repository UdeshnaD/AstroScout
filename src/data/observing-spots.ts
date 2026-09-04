import type { ObservingSpot } from "@/types/spot";

export const observingSpots: ObservingSpot[] = [
  {
    id: "observatory-hill",
    name: "Observatory Hill",
    region: "Millers Point",
    spotType: "observatory",
    latitude: -33.8599,
    longitude: 151.2042,
    bortleRating: 8,
    darknessLabel: "Urban sky",
    description:
      "A central Sydney astronomy landmark with open harbour views and easy access for short evening sessions.",
    accessNotes: "Public park setting with nearby transport and street access.",
    safetyNotes: "Urban lighting is high. Stay around well-lit paths and check park conditions before visiting late.",
    facilities: ["Public transport nearby", "Walking paths", "Harbour views"],
    horizonNotes: "Open views toward the harbour, with city glow across most horizons.",
    imageTheme: "harbour"
  },
  {
    id: "centennial-park",
    name: "Centennial Parklands",
    region: "Moore Park",
    spotType: "park",
    latitude: -33.8974,
    longitude: 151.233,
    bortleRating: 7,
    darknessLabel: "Bright suburban sky",
    description:
      "Large open parkland with broad sky views, useful for Moon, planet, and bright-object viewing close to the city.",
    accessNotes: "Check current gate and parking hours before planning a late visit.",
    safetyNotes: "Use open public areas and avoid isolated sections after dark.",
    facilities: ["Parking", "Open fields", "Walking paths"],
    horizonNotes: "Good open sky overhead, with city glow toward the north and west.",
    imageTheme: "park"
  },
  {
    id: "west-head-lookout",
    name: "West Head Lookout",
    region: "Ku-ring-gai Chase",
    spotType: "lookout",
    latitude: -33.5787,
    longitude: 151.2963,
    bortleRating: 5,
    darknessLabel: "Outer suburban sky",
    description:
      "A northern lookout with darker skies than central Sydney and wide views over Broken Bay.",
    accessNotes: "National park access and road hours can vary. Confirm current conditions before leaving.",
    safetyNotes: "Clifftop area. Keep clear of edges and bring a torch with a red-light mode.",
    facilities: ["Lookout", "Parking", "Bushland"],
    horizonNotes: "Strong northern and eastern views, with lower light pollution than inner Sydney.",
    imageTheme: "coast"
  },
  {
    id: "lincolns-rock",
    name: "Lincoln's Rock",
    region: "Wentworth Falls",
    spotType: "lookout",
    latitude: -33.7299,
    longitude: 150.3729,
    bortleRating: 4,
    darknessLabel: "Rural transition sky",
    description:
      "A Blue Mountains lookout with broad western sky views and stronger dark-sky potential than Sydney suburbs.",
    accessNotes: "Parking is nearby, but weather and road conditions should be checked before night travel.",
    safetyNotes: "Exposed cliff area. Stay behind safe viewing zones and avoid edges in darkness.",
    facilities: ["Parking", "Lookout", "Wide horizon"],
    horizonNotes: "Excellent western horizon and open sky, with some glow toward Sydney.",
    imageTheme: "mountain"
  },
  {
    id: "govetts-leap",
    name: "Govetts Leap Lookout",
    region: "Blackheath",
    spotType: "lookout",
    latitude: -33.6287,
    longitude: 150.3117,
    bortleRating: 4,
    darknessLabel: "Rural transition sky",
    description:
      "A dramatic Blue Mountains lookout with darker conditions, wide horizons, and strong potential for meteor viewing.",
    accessNotes: "Check road conditions, park notices, and weather before visiting at night.",
    safetyNotes: "Cliffs and low light make caution essential. Use marked areas only.",
    facilities: ["Parking", "Lookout", "Walking tracks"],
    horizonNotes: "Wide open sky over the Grose Valley with darker northern and western views.",
    imageTheme: "valley"
  },
  {
    id: "garie-beach",
    name: "Garie Beach",
    region: "Royal National Park",
    spotType: "beach",
    latitude: -34.1694,
    longitude: 151.0677,
    bortleRating: 5,
    darknessLabel: "Outer suburban sky",
    description:
      "A coastal viewing option with a clear ocean horizon and useful conditions for Moonrise, planets, and bright stars.",
    accessNotes: "National park access, road closures, and beach conditions should be checked before travel.",
    safetyNotes: "Avoid surf zones after dark and keep clear of unstable coastal edges.",
    facilities: ["Beach", "Parking", "Ocean horizon"],
    horizonNotes: "Excellent eastern horizon over the ocean, with city glow to the north.",
    imageTheme: "ocean"
  },
  {
    id: "barrenjoey-head",
    name: "Barrenjoey Headland",
    region: "Palm Beach",
    spotType: "lookout",
    latitude: -33.5791,
    longitude: 151.3294,
    bortleRating: 5,
    darknessLabel: "Outer suburban sky",
    description:
      "A northern beaches headland with strong coastal horizons and memorable Moon or planet viewing conditions.",
    accessNotes: "Walking access and track conditions should be checked before a night visit.",
    safetyNotes: "Bring a torch, stay on paths, and avoid exposed edges.",
    facilities: ["Coastal views", "Walking track", "Nearby parking"],
    horizonNotes: "Clear ocean horizon and open northern sky.",
    imageTheme: "headland"
  },
  {
    id: "cataract-dam",
    name: "Cataract Dam",
    region: "Wollondilly",
    spotType: "reserve",
    latitude: -34.2648,
    longitude: 150.8179,
    bortleRating: 4,
    darknessLabel: "Rural transition sky",
    description:
      "A quieter southwest option with darker skies than Sydney and useful open areas around the dam precinct.",
    accessNotes: "Opening hours and access rules can change. Confirm current public access before travel.",
    safetyNotes: "Stay in public areas and avoid water edges after dark.",
    facilities: ["Parking", "Picnic areas", "Open sky"],
    horizonNotes: "Good southern and western sky with less dense urban glow.",
    imageTheme: "dam"
  },
  {
    id: "kiama-blowhole-point",
    name: "Kiama Blowhole Point",
    region: "Kiama",
    spotType: "lookout",
    latitude: -34.6711,
    longitude: 150.8627,
    bortleRating: 5,
    darknessLabel: "Coastal town sky",
    description:
      "A coastal landmark with broad ocean views, useful for Moonrise, bright planets, and horizon-based events.",
    accessNotes: "Public access is generally straightforward, but weather and sea conditions matter.",
    safetyNotes: "Stay behind barriers and avoid wet rock platforms in low light.",
    facilities: ["Parking", "Coastal lookout", "Nearby town facilities"],
    horizonNotes: "Excellent eastern horizon with moderate town lighting nearby.",
    imageTheme: "coast"
  }
];

export function getSpotById(id: string) {
  return observingSpots.find((spot) => spot.id === id);
}

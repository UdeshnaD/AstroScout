export type PostcodeLocation = {
  postcode: string;
  label: string;
  latitude: number;
  longitude: number;
};

type NominatimPlace = {
  lat?: string;
  lon?: string;
  display_name?: string;
};

const cache = new Map<string, PostcodeLocation>();

// Keep common NSW searches available even when the public geocoder is slow or
// unavailable. These are origin points for ranking nearby catalogue sites, not
// a replacement for a full address geocoder.
const knownNswLocations: Array<PostcodeLocation & { aliases: string[] }> = [
  { postcode: "2780", label: "Katoomba NSW 2780", latitude: -33.7152, longitude: 150.3119, aliases: ["2780", "katoomba"] },
  { postcode: "2000", label: "Sydney CBD NSW 2000", latitude: -33.8688, longitude: 151.2093, aliases: ["2000", "sydney", "sydney cbd"] },
  { postcode: "2250", label: "Gosford NSW 2250", latitude: -33.4269, longitude: 151.3425, aliases: ["2250", "gosford", "central coast"] },
  { postcode: "2500", label: "Wollongong NSW 2500", latitude: -34.4278, longitude: 150.8931, aliases: ["2500", "wollongong"] },
  { postcode: "2300", label: "Newcastle NSW 2300", latitude: -32.9283, longitude: 151.7817, aliases: ["2300", "newcastle"] },
  { postcode: "2323", label: "Maitland NSW 2323", latitude: -32.7343, longitude: 151.557, aliases: ["2323", "maitland"] },
  { postcode: "2316", label: "Port Stephens NSW 2316", latitude: -32.726, longitude: 152.143, aliases: ["2316", "port stephens", "nelson bay"] },
  { postcode: "2428", label: "Forster NSW 2428", latitude: -32.1814, longitude: 152.511, aliases: ["2428", "forster"] },
  { postcode: "2444", label: "Port Macquarie NSW 2444", latitude: -31.4333, longitude: 152.908, aliases: ["2444", "port macquarie"] },
  { postcode: "2450", label: "Coffs Harbour NSW 2450", latitude: -30.2963, longitude: 153.115, aliases: ["2450", "coffs harbour"] },
  { postcode: "2480", label: "Lismore NSW 2480", latitude: -28.8135, longitude: 153.278, aliases: ["2480", "lismore"] },
  { postcode: "2481", label: "Byron Bay NSW 2481", latitude: -28.6474, longitude: 153.602, aliases: ["2481", "byron bay"] },
  { postcode: "2350", label: "Armidale NSW 2350", latitude: -30.5103, longitude: 151.667, aliases: ["2350", "armidale"] },
  { postcode: "2340", label: "Tamworth NSW 2340", latitude: -31.0927, longitude: 150.933, aliases: ["2340", "tamworth"] },
  { postcode: "2333", label: "Singleton NSW 2333", latitude: -32.567, longitude: 151.167, aliases: ["2333", "singleton", "hunter valley"] },
  { postcode: "2325", label: "Cessnock NSW 2325", latitude: -32.832, longitude: 151.357, aliases: ["2325", "cessnock"] },
  { postcode: "2324", label: "Raymond Terrace NSW 2324", latitude: -32.76, longitude: 151.75, aliases: ["2324", "raymond terrace"] },
  { postcode: "2800", label: "Orange NSW 2800", latitude: -33.283, longitude: 149.1, aliases: ["2800", "orange"] },
  { postcode: "2795", label: "Bathurst NSW 2795", latitude: -33.419, longitude: 149.577, aliases: ["2795", "bathurst"] },
  { postcode: "2790", label: "Lithgow NSW 2790", latitude: -33.484, longitude: 150.149, aliases: ["2790", "lithgow"] },
  { postcode: "2580", label: "Goulburn NSW 2580", latitude: -34.754, longitude: 149.72, aliases: ["2580", "goulburn"] },
  { postcode: "2620", label: "Queanbeyan NSW 2620", latitude: -35.354, longitude: 149.232, aliases: ["2620", "queanbeyan", "canberra"] },
  { postcode: "2627", label: "Jindabyne NSW 2627", latitude: -36.417, longitude: 148.623, aliases: ["2627", "jindabyne", "snowy mountains"] },
  { postcode: "2640", label: "Albury NSW 2640", latitude: -36.08, longitude: 146.916, aliases: ["2640", "albury"] },
  { postcode: "2710", label: "Deniliquin NSW 2710", latitude: -35.529, longitude: 144.958, aliases: ["2710", "deniliquin"] },
  { postcode: "2650", label: "Wagga Wagga NSW 2650", latitude: -35.108, longitude: 147.359, aliases: ["2650", "wagga wagga", "wagga"] },
  { postcode: "2680", label: "Griffith NSW 2680", latitude: -34.289, longitude: 146.063, aliases: ["2680", "griffith"] },
  { postcode: "2830", label: "Dubbo NSW 2830", latitude: -32.256, longitude: 148.602, aliases: ["2830", "dubbo"] },
  { postcode: "2820", label: "Wellington NSW 2820", latitude: -32.555, longitude: 148.945, aliases: ["2820", "wellington"] },
  { postcode: "2835", label: "Cobar NSW 2835", latitude: -31.499, longitude: 145.835, aliases: ["2835", "cobar"] },
  { postcode: "2357", label: "Coonabarabran NSW 2357", latitude: -31.278, longitude: 149.279, aliases: ["2357", "coonabarabran"] },
  { postcode: "2840", label: "Bourke NSW 2840", latitude: -30.09, longitude: 145.94, aliases: ["2840", "bourke"] },
  { postcode: "2400", label: "Moree NSW 2400", latitude: -29.462, longitude: 149.841, aliases: ["2400", "moree"] },
  { postcode: "2360", label: "Inverell NSW 2360", latitude: -29.775, longitude: 151.112, aliases: ["2360", "inverell"] },
  { postcode: "3000", label: "Melbourne VIC 3000", latitude: -37.8136, longitude: 144.9631, aliases: ["3000", "melbourne", "melbourne cbd"] },
];

export async function resolveNswLocation(value: string): Promise<PostcodeLocation | null> {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) return null;
  const known = knownNswLocations.find((location) =>
    location.aliases.includes(normalized),
  );
  if (known) {
    const { aliases: _aliases, ...location } = known;
    return location;
  }
  return /^\d{4}$/.test(normalized) ? resolveNswPostcode(normalized) : null;
}

export async function resolveNswPostcode(
  value: string,
): Promise<PostcodeLocation | null> {
  const postcode = value.trim();
  if (!/^\d{4}$/.test(postcode)) return null;

  const known = knownNswLocations.find((location) =>
    location.aliases.includes(postcode),
  );
  if (known) {
    const { aliases: _aliases, ...location } = known;
    return location;
  }

  const cached = cache.get(postcode);
  if (cached) return cached;

  const query = new URLSearchParams({
    q: `${postcode}, New South Wales, Australia`,
    format: "jsonv2",
    limit: "1",
    countrycodes: "au",
  });
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${query.toString()}`,
    {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-AU",
        "User-Agent": "AstroScout postcode lookup",
      },
      next: { revalidate: 60 * 60 * 24 * 30 },
    },
  );
  if (!response.ok) return null;

  const [place] = (await response.json()) as NominatimPlace[];
  const latitude = Number(place?.lat);
  const longitude = Number(place?.lon);
  const isNsw = /new south wales|\bnsw\b/i.test(place?.display_name ?? "");
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !isNsw)
    return null;

  const location = {
    postcode,
    label: `${postcode} NSW`,
    latitude,
    longitude,
  };
  cache.set(postcode, location);
  return location;
}

export type CuratedSpot = {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  bortle: number;
};

// A compact, hand-curated NSW catalogue. Confirm access, closures and safety
// conditions before travelling after dark.
export const curatedNswSpots: CuratedSpot[] = [
  ["observatory-hill", "Observatory Hill", "Millers Point", -33.8599, 151.2042, 8],
  ["centennial-park", "Centennial Parklands", "Moore Park", -33.8974, 151.233, 7],
  ["west-head", "West Head Lookout", "Ku-ring-gai Chase", -33.5787, 151.2963, 5],
  ["lincolns-rock", "Lincoln's Rock", "Wentworth Falls", -33.7299, 150.3729, 4],
  ["govetts-leap", "Govetts Leap Lookout", "Blackheath", -33.6287, 150.3117, 4],
  ["garie-beach", "Garie Beach", "Royal National Park", -34.1694, 151.0677, 5],
  ["barrenjoey", "Barrenjoey Headland", "Palm Beach", -33.5791, 151.3294, 5],
  ["cataract-dam", "Cataract Dam", "Wollondilly", -34.2648, 150.8179, 4],
  ["kiama", "Kiama Blowhole Point", "Kiama", -34.6711, 150.8627, 5],
  ["long-reef", "Long Reef Headland", "Collaroy", -33.7425, 151.3296, 6],
  ["cape-solander", "Cape Solander Lookout", "Kurnell", -34.0276, 151.2258, 6],
  ["lake-parramatta", "Lake Parramatta Reserve", "North Parramatta", -33.8084, 151.0102, 7],
  ["yellomundee", "Yellomundee Regional Park", "Hawkesbury", -33.6958, 150.6608, 5],
  ["cattai", "Cattai National Park", "Hawkesbury", -33.5609, 150.9227, 5],
  ["bouddi", "Bouddi Lookout", "Central Coast", -33.5257, 151.3599, 5],
  ["mount-keira", "Mount Keira Lookout", "Wollongong", -34.4049, 150.8599, 6],
  ["robertson", "Robertson Heritage Station", "Southern Highlands", -34.5898, 150.5958, 4],
  ["mount-banks", "Mount Banks Picnic Area", "Blue Mountains", -33.5558, 150.4404, 4],
  ["capertee", "Capertee Valley", "Capertee", -33.1542, 149.9846, 3],
  ["mount-panorama", "Mount Panorama", "Bathurst", -33.4282, 149.5573, 5],
  ["coonabarabran", "Coonabarabran Lookout", "Coonabarabran", -31.2787, 149.279, 3],
  ["mudgee", "Mudgee Scenic Lookout", "Mudgee", -32.594, 149.588, 4],
  ["wellington", "Wellington Caves Reserve", "Wellington", -32.558, 148.945, 3],
  ["port-stephens", "Tomaree Headland", "Port Stephens", -32.72, 152.169, 4],
].map(([id, name, region, latitude, longitude, bortle]) => ({
  id: id as string, name: name as string, region: region as string,
  latitude: latitude as number, longitude: longitude as number, bortle: bortle as number,
}));

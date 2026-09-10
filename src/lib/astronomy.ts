import {
  Body,
  Constellation,
  DefineStar,
  Equator,
  Horizon,
  Illumination,
  MoonPhase,
  Observer,
  SearchAltitude,
  SearchHourAngle,
  SearchRiseSet,
} from "astronomy-engine";
import type {
  AstronomySummary,
  AuroraOutlook,
  NightSkyHighlight,
} from "@/types/astronomy";

// J2000 coordinates are sufficiently fixed for nightly deep-sky planning.
// Planets continue to use astronomy-engine's ephemeris calculations below.
const deepSkyTargets = [
  ["milky-way-core", "Milky Way Core", 17.761, -29.007, -6, "Unaided eye from a dark site", "A broad, structured band of starlight toward Sagittarius. Dark skies and a low Moon matter more than magnification.", "NASA / Milky Way observing guide", "https://science.nasa.gov/wp-content/uploads/2023/10/Exploring_the_Milky_Way.pdf"],
  ["andromeda", "Andromeda Galaxy (M31)", 0.712, 41.269, 3.4, "Binoculars or telescope", "Our nearest large galactic neighbour. From NSW it stays low in the north, so a clear northern horizon is essential.", "NASA / Hubble ground-based M31 image", "https://science.nasa.gov/asset/hubble/andromeda-galaxy-m31-wide-field-image/"],
  ["large-magellanic-cloud", "Large Magellanic Cloud (LMC)", 5.385, -69.756, 0.9, "Unaided eye from a dark site", "A companion galaxy to the Milky Way, best as a luminous cloud from a dark southern horizon.", "NASA / ground image of the LMC", "https://science.nasa.gov/asset/hubble/ground-image-of-large-magellanic-cloud/"],
  ["small-magellanic-cloud", "Small Magellanic Cloud (SMC)", 0.883, -72.828, 2.7, "Unaided eye or binoculars from a dark site", "A small, diffuse companion galaxy near the south celestial pole; binoculars bring out its shape.", "NASA / Small Magellanic Cloud observation", "https://science.nasa.gov/photojournal/small-magellanic-cloud-imaged-by-herschel-planck-iras-cobe/"],
  ["orion-nebula", "Orion Nebula (M42)", 5.591, -5.45, 4, "Binoculars or telescope", "A bright stellar nursery in Orion. Binoculars show the glow; a telescope reveals structure when the sky is dark.", "NASA / Hubble and ESO observation of M42", "https://science.nasa.gov/asset/hubble/close-up-images-of-the-orion-nebula/"],
  ["eta-carinae", "Eta Carinae Nebula (NGC 3372)", 10.751, -59.685, 1, "Binoculars or telescope", "A vast southern emission nebula around Eta Carinae. It rewards a wide field and a dark, transparent night.", "NASA / Hubble view of the Carina Nebula", "https://science.nasa.gov/image-detail/24850463718-07b2a6473e-o-2/"],
  ["pleiades", "Pleiades Star Cluster (M45)", 3.792, 24.105, 1.6, "Unaided eye or binoculars", "The Seven Sisters are an easy naked-eye grouping; binoculars frame more of the cluster and its brightest stars.", "NASA / Cassini image of the Pleiades", "https://science.nasa.gov/photojournal/the-seven-sisters/"],
  ["omega-centauri", "Omega Centauri Cluster (NGC 5139)", 13.447, -47.479, 3.7, "Binoculars or telescope", "The sky's largest and brightest globular cluster. It is a standout southern target once it climbs high enough.", "ESA / Hubble view of Omega Centauri", "https://www.esa.int/ESA_Multimedia/Images/2024/07/Hubble_s_view_of_Omega_Centauri"],
  ["hyades", "Hyades Star Cluster", 4.45, 15.87, 0.5, "Unaided eye or binoculars", "A nearby V-shaped open cluster in Taurus. Its broad spread is best with unaided eyes or low-power binoculars.", "NASA / Hyades and Pleiades star clusters", "https://science.nasa.gov/universe/exoplanets/the-hyades-star-cluster/"],
  ["hercules-cluster", "Hercules Globular Cluster (M13)", 16.695, 36.461, 5.8, "Binoculars or telescope", "A compact globular cluster in Hercules. From NSW it remains low in the north, where steadiness and a clear horizon matter.", "NASA / ground-based and Hubble M13 observations", "https://science.nasa.gov/asset/hubble/hubble-acswfpc2-image-of-globular-cluster-m13/"],
] as const;

const bodies = [Body.Moon, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn];
const descriptions: Record<string, string> = {
  Moon: "Look along the boundary between light and shadow for craters and mountain relief. Binoculars reveal far more detail than the unaided eye.",
  Venus:
    "A brilliant planet that shows phases through a telescope. Observe only after the Sun is below the horizon; never point optics near the Sun.",
  Mars: "Its warm colour is visible to the unaided eye. Surface markings require a telescope and depend on distance and atmospheric steadiness.",
  Jupiter:
    "Binoculars can reveal the four bright Galilean moons. A telescope may resolve cloud bands when the atmosphere is steady.",
  Saturn:
    "A telescope reveals the rings, with their appearance changing as their tilt varies. A steady view and a higher altitude help resolve detail.",
};

export function getAstronomySummary(
  startTime: string,
  latitude = -33.7738,
  longitude = 151.1126,
): AstronomySummary {
  const date = new Date(startTime);
  const observer = new Observer(latitude, longitude, 0);
  const phase = MoonPhase(date);
  const moonIllumination = Math.round(
    Illumination(Body.Moon, date).phase_fraction * 100,
  );
  // Start at local solar noon to find evening events for the selected NSW night.
  const solarDate = new Date(
    date.getTime() + (longitude / 15) * 3600000 - 12 * 3600000,
  );
  const noon = new Date(
    Date.UTC(
      solarDate.getUTCFullYear(),
      solarDate.getUTCMonth(),
      solarDate.getUTCDate(),
      12,
    ) -
      (longitude / 15) * 3600000,
  );
  const sunset = SearchRiseSet(Body.Sun, observer, -1, noon, 1);
  const twilight = SearchAltitude(Body.Sun, observer, -1, noon, 1, -18);
  const moonset = SearchRiseSet(Body.Moon, observer, -1, noon, 1);
  const sun = Equator(Body.Sun, date, observer, true, true);
  const sunAltitude = Horizon(date, observer, sun.ra, sun.dec).altitude;
  const highlights: NightSkyHighlight[] = bodies.map((body) => {
    const equator = Equator(body, date, observer, true, true);
    const horizon = Horizon(date, observer, equator.ra, equator.dec, "normal");
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return {
      id: body.toLowerCase(),
      name: body,
      type: body === Body.Moon ? "moon" : "planet",
      bestTime: clock(date),
      direction: directions[Math.round(horizon.azimuth / 45) % 8],
      equipment:
        body === Body.Moon ? "Naked eye / binoculars" : "Telescope for detail",
      confidence:
        horizon.altitude > 25
          ? "high"
          : horizon.altitude > 10
            ? "medium"
            : "low",
      description: descriptions[body],
      altitude: Math.round(horizon.altitude * 100) / 100,
      azimuth: Math.round(horizon.azimuth),
      magnitude: Illumination(body, date).mag,
      technical: technicalDetails(body, date, observer, noon, sunAltitude),
    };
  });
  const deepSkyHighlights: NightSkyHighlight[] = deepSkyTargets.map(([id, name, ra, dec, magnitude, equipment, description, referenceLabel, referenceUrl]) => {
    const horizon = Horizon(date, observer, ra, dec, "normal");
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return {
      id,
      name,
      type: "deep-sky",
      bestTime: clock(date),
      direction: directions[Math.round(horizon.azimuth / 45) % 8],
      equipment,
      confidence: horizon.altitude > 25 ? "high" : horizon.altitude > 10 ? "medium" : "low",
      description,
      altitude: Math.round(horizon.altitude * 100) / 100,
      azimuth: Math.round(horizon.azimuth),
      magnitude,
      reference: { label: referenceLabel, url: referenceUrl },
      technical: technicalDetails(
        defineDeepSkyStar(ra, dec),
        date,
        observer,
        noon,
        sunAltitude,
      ),
    };
  });
  return {
    moonPhase: phaseLabel(phase),
    moonIllumination,
    sunset: sunset ? clock(sunset.date) : "No sunset",
    astronomicalTwilight: twilight ? clock(twilight.date) : "No full darkness",
    moonset: moonset ? clock(moonset.date) : "No moonset this evening",
    bestViewingWindow: twilight
      ? `Dark from ${clock(twilight.date)}`
      : "No full darkness",
    highlights: [...highlights, ...deepSkyHighlights],
    aurora: auroraOutlook(latitude, sunAltitude),
    sunAltitude: Math.round(sunAltitude),
    source: "astronomy-engine",
  };
}

// Astronomy Engine's defined star slot lets the same position, rise/set and
// coordinate calculations work for our fixed deep-sky catalogue as for planets.
function defineDeepSkyStar(ra: number, dec: number) {
  DefineStar(Body.Star1, ra, dec, 1_000_000);
  return Body.Star1;
}

function technicalDetails(
  body: Body,
  date: Date,
  observer: Observer,
  noon: Date,
  sunAltitude: number,
): NonNullable<NightSkyHighlight["technical"]> {
  const apparent = Equator(body, date, observer, true, true);
  const j2000 = Equator(body, date, observer, false, true);
  const horizon = Horizon(date, observer, apparent.ra, apparent.dec, "normal");
  const moon = Equator(Body.Moon, date, observer, true, true);
  const sun = Equator(Body.Sun, date, observer, true, true);
  const rise = SearchRiseSet(body, observer, 1, noon, 1);
  const set = SearchRiseSet(body, observer, -1, noon, 1);
  const transit = SearchHourAngle(body, observer, 0, noon, 1);
  const altitude = horizon.altitude;

  return {
    rightAscension: apparent.ra,
    declination: apparent.dec,
    constellation: Constellation(j2000.ra, j2000.dec).name,
    rise: rise ? clock(rise.date) : "No rise",
    transit: clock(transit.time.date),
    set: set ? clock(set.date) : "No set",
    airmass: airmass(altitude),
    sunSeparation: angularSeparation(apparent, sun),
    moonSeparation: angularSeparation(apparent, moon),
    visibility:
      altitude <= 0
        ? "Below horizon"
        : sunAltitude >= 0
          ? "Daylight"
          : sunAltitude >= -6
            ? "Civil twilight"
            : sunAltitude >= -18
              ? "Astronomical twilight"
              : "Dark sky",
  };
}

function angularSeparation(
  first: { ra: number; dec: number },
  second: { ra: number; dec: number },
) {
  const degrees = Math.PI / 180;
  const cosine =
    Math.sin(first.dec * degrees) * Math.sin(second.dec * degrees) +
    Math.cos(first.dec * degrees) *
      Math.cos(second.dec * degrees) *
      Math.cos((first.ra - second.ra) * 15 * degrees);
  return (Math.acos(Math.max(-1, Math.min(1, cosine))) / degrees);
}

function airmass(altitude: number) {
  if (altitude <= 0) return null;
  const zenithAngle = 90 - altitude;
  return 1 /
    (Math.cos(zenithAngle * (Math.PI / 180)) +
      0.50572 * Math.pow(96.07995 - zenithAngle, -1.6364));
}

function auroraOutlook(latitude: number, sunAltitude: number): AuroraOutlook {
  if (sunAltitude >= -6) {
    return {
      potential: "Not visible",
      visibility: "Daylight",
      direction: auroraDirection(latitude),
      description:
        "The sky is too bright at this time. Check again after evening twilight.",
    };
  }

  const visibility = sunAltitude >= -18 ? "Twilight" : "Dark sky";
  const absoluteLatitude = Math.abs(latitude);
  const potential =
    absoluteLatitude >= 55
      ? "Moderate"
      : absoluteLatitude >= 40
        ? "Low"
        : "Very low";
  const direction = auroraDirection(latitude);

  return {
    potential,
    visibility,
    direction,
    description:
      visibility === "Twilight"
        ? "Aurora contrast is limited by twilight. Wait for full darkness, then look toward the auroral horizon from a clear site."
        : `Aurora needs a geomagnetic storm at this latitude. Look ${direction === "Overhead" ? "overhead" : `low toward the ${direction.toLowerCase()}`} from a dark, clear site. This is a local sky outlook, not a live aurora alert.`,
  };
}

function auroraDirection(latitude: number): AuroraOutlook["direction"] {
  if (Math.abs(latitude) >= 70) return "Overhead";
  return latitude < 0 ? "Southern horizon" : "Northern horizon";
}

function clock(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
  }).format(date);
}
function phaseLabel(phase: number) {
  return [
    "New Moon",
    "Waxing Crescent",
    "First Quarter",
    "Waxing Gibbous",
    "Full Moon",
    "Waning Gibbous",
    "Last Quarter",
    "Waning Crescent",
  ][Math.floor((phase + 22.5) / 45) % 8];
}

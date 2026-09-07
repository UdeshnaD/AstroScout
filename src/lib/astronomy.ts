import {
  Body,
  Equator,
  Horizon,
  Illumination,
  MoonPhase,
  Observer,
  SearchAltitude,
  SearchRiseSet,
} from "astronomy-engine";
import type { AstronomySummary, NightSkyHighlight } from "@/types/astronomy";

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
      altitude: Math.round(horizon.altitude),
      azimuth: Math.round(horizon.azimuth),
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
    highlights,
    sunAltitude: Math.round(sunAltitude),
    source: "astronomy-engine",
  };
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

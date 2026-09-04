import { baseNightSkyHighlights } from "@/data/astronomy-events";
import type { AstronomySummary } from "@/types/astronomy";

const SYNODIC_MONTH_DAYS = 29.530588853;
const KNOWN_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14);

export function getAstronomySummary(startTime: string): AstronomySummary {
  const date = new Date(startTime);
  const moonAge = getMoonAge(date);
  const moonIllumination = Math.round(
    ((1 - Math.cos((2 * Math.PI * moonAge) / SYNODIC_MONTH_DAYS)) / 2) * 100
  );
  const moonPhase = getMoonPhaseLabel(moonAge);

  const sunset = withLocalTime(date, seasonalHour(date.getMonth(), 18, 20));
  const astronomicalTwilight = addMinutes(sunset, 85);
  const moonset = addMinutes(sunset, estimateMoonsetOffset(moonAge));
  const bestStart = addMinutes(astronomicalTwilight, moonIllumination > 65 ? 45 : 0);
  const bestEnd = addMinutes(bestStart, 150);

  return {
    moonPhase,
    moonIllumination,
    sunset: formatTime(sunset),
    astronomicalTwilight: formatTime(astronomicalTwilight),
    moonset: formatTime(moonset),
    bestViewingWindow: `${formatTime(bestStart)} - ${formatTime(bestEnd)}`,
    highlights: tuneHighlights(moonIllumination)
  };
}

function getMoonAge(date: Date) {
  const daysSinceKnownNewMoon = (date.getTime() - KNOWN_NEW_MOON_UTC) / 86400000;
  return ((daysSinceKnownNewMoon % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;
}

function getMoonPhaseLabel(age: number) {
  if (age < 1.85) return "New Moon";
  if (age < 5.54) return "Waxing Crescent";
  if (age < 9.23) return "First Quarter";
  if (age < 12.92) return "Waxing Gibbous";
  if (age < 16.61) return "Full Moon";
  if (age < 20.3) return "Waning Gibbous";
  if (age < 23.99) return "Last Quarter";
  if (age < 27.68) return "Waning Crescent";
  return "New Moon";
}

function seasonalHour(month: number, baseHour: number, summerHour: number) {
  if (month === 11 || month <= 1) return summerHour;
  if (month >= 4 && month <= 6) return 17;
  return baseHour;
}

function estimateMoonsetOffset(moonAge: number) {
  if (moonAge < 3) return 90;
  if (moonAge < 8) return 240;
  if (moonAge < 14) return 420;
  if (moonAge < 19) return 610;
  if (moonAge < 24) return 120;
  return 45;
}

function tuneHighlights(moonIllumination: number) {
  if (moonIllumination > 70) {
    return baseNightSkyHighlights.filter((highlight) => highlight.id !== "milky-way");
  }

  return baseNightSkyHighlights;
}

function withLocalTime(date: Date, hour: number) {
  const next = new Date(date);
  next.setHours(hour, 0, 0, 0);
  return next;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

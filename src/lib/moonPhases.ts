import { NextMoonQuarter, SearchMoonQuarter, Seasons } from "astronomy-engine";

export type MoonCalendarEvent = { time: string; title: string; kind: "moon" | "season" | "sky"; description: string };

const skyEvents2026: MoonCalendarEvent[] = [
  { time: "2026-01-10T12:00:00.000Z", title: "Jupiter at opposition", kind: "sky", description: "Jupiter is opposite the Sun in Earth's sky and is generally visible for most of the night." },
  { time: "2026-04-21T12:00:00.000Z", title: "Lyrids peak", kind: "sky", description: "Reference night for the 2026 Lyrid meteor-shower peak. Check local weather and moonlight before observing." },
  { time: "2026-05-05T12:00:00.000Z", title: "Eta Aquariids peak", kind: "sky", description: "Reference night for the 2026 Eta Aquariid peak, a useful southern-sky meteor shower." },
  { time: "2026-07-30T12:00:00.000Z", title: "Southern Delta Aquariids peak", kind: "sky", description: "Reference night for the 2026 Southern Delta Aquariid meteor-shower peak." },
  { time: "2026-08-12T12:00:00.000Z", title: "Perseids peak", kind: "sky", description: "Reference night for the 2026 Perseid peak. Visibility from Sydney differs from northern locations." },
  { time: "2026-09-25T12:00:00.000Z", title: "Neptune at opposition", kind: "sky", description: "Neptune is opposite the Sun in Earth's sky. A telescope and accurate finder chart are still required." },
  { time: "2026-10-04T12:00:00.000Z", title: "Saturn at opposition", kind: "sky", description: "Saturn is opposite the Sun in Earth's sky and is generally visible for most of the night." },
  { time: "2026-10-21T12:00:00.000Z", title: "Orionids peak", kind: "sky", description: "Reference night for the 2026 Orionid meteor-shower peak." },
  { time: "2026-11-17T12:00:00.000Z", title: "Leonids peak", kind: "sky", description: "Reference night for the 2026 Leonid meteor-shower peak." },
  { time: "2026-11-25T12:00:00.000Z", title: "Uranus at opposition", kind: "sky", description: "Uranus is opposite the Sun in Earth's sky. Binoculars or a telescope make it easier to identify." },
  { time: "2026-12-13T12:00:00.000Z", title: "Geminids peak", kind: "sky", description: "Reference night for the 2026 Geminid meteor-shower peak." },
];

export function moonCalendarEvents(year: number, month: number): MoonCalendarEvent[] {
  const start = new Date(Date.UTC(year, month, 1) - 12 * 60 * 60 * 1000);
  const end = new Date(Date.UTC(year, month + 1, 1) + 12 * 60 * 60 * 1000);
  const names = ["New Moon", "First quarter", "Full Moon", "Last quarter"];
  const events: MoonCalendarEvent[] = [];
  let quarter = SearchMoonQuarter(start);
  while (quarter.time.date < end) {
    events.push({ time: quarter.time.date.toISOString(), title: names[quarter.quarter], kind: "moon", description: quarter.quarter === 0 ? "Least moonlight for faint-object observing; weather and local light still matter." : "A calculated lunar-quarter instant for planning your observing night." });
    quarter = NextMoonQuarter(quarter);
  }
  const seasons = Seasons(year);
  for (const [instant, title] of [[seasons.mar_equinox, "March equinox"], [seasons.jun_solstice, "June solstice"], [seasons.sep_equinox, "September equinox"], [seasons.dec_solstice, "December solstice"]] as const)
    events.push({ time: instant.date.toISOString(), title, kind: "season", description: "A calculated seasonal milestone in Earth's orbit." });
  if (year === 2026) events.push(...skyEvents2026);
  return events.filter((event) => new Date(event.time).getUTCFullYear() === year && new Date(event.time).getUTCMonth() === month).sort((a, b) => a.time.localeCompare(b.time));
}

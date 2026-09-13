import { NextMoonQuarter, SearchMoonQuarter, Seasons } from "astronomy-engine";

export type MoonCalendarEvent = { time: string; title: string; kind: "moon" | "season"; description: string };

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
  return events.filter((event) => new Date(event.time).getUTCFullYear() === year && new Date(event.time).getUTCMonth() === month).sort((a, b) => a.time.localeCompare(b.time));
}

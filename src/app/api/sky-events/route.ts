import { NextRequest, NextResponse } from "next/server";
import { Equator, Horizon, Observer, Body } from "astronomy-engine";

type EphemerisPoint = { time: string; azimuth: number; altitude: number; magnitude?: number };
const targets = [
  { id: "DES=2P;CAP", kind: "comet", name: "2P/Encke" },
  { id: "DES=67P;CAP", kind: "comet", name: "67P/Churyumov–Gerasimenko" },
  { id: "1;", kind: "asteroid", name: "1 Ceres" },
  { id: "4;", kind: "asteroid", name: "4 Vesta" },
] as const;

export async function GET(request: NextRequest) {
  const latitude = Number(request.nextUrl.searchParams.get("lat"));
  const longitude = Number(request.nextUrl.searchParams.get("lon"));
  const date = new Date(request.nextUrl.searchParams.get("time") ?? "");
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(date.getTime()))
    return NextResponse.json({ error: "A valid location and time are required." }, { status: 400 });

  const [objects, iss] = await Promise.all([
    Promise.all(targets.map(async (target) => ({ ...target, points: await horizons(target.id, date, latitude, longitude, 12, 60) }))),
    horizons("-125544", date, latitude, longitude, 24, 1),
  ]);
  const observer = new Observer(latitude, longitude, 0);
  const meteorShowers = showers(date, observer).filter((shower) => shower.active || shower.altitude > 10);
  return NextResponse.json({
    meteorShowers,
    objects: objects.map(({ points, ...target }) => {
      const visible = points.filter((point) => point.altitude > 10 && sunAltitude(point.time, observer) < -6);
      const best = visible.sort((a, b) => b.altitude - a.altitude)[0] ?? points.sort((a, b) => b.altitude - a.altitude)[0];
      return { ...target, visible: Boolean(visible.length), best, bestTime: best?.time ?? null };
    }),
    issPasses: passes(iss, observer).slice(0, 3),
    source: "NASA/JPL Horizons",
  });
}

async function horizons(command: string, start: Date, latitude: number, longitude: number, hours: number, minutes: number) {
  const stop = new Date(start.getTime() + hours * 3600000);
  const params = new URLSearchParams({ format: "json", COMMAND: `'${command}'`, EPHEM_TYPE: "OBSERVER", CENTER: "'coord@399'", COORD_TYPE: "GEODETIC", SITE_COORD: `'${longitude},${latitude},0'`, START_TIME: `'${stamp(start)}'`, STOP_TIME: `'${stamp(stop)}'`, STEP_SIZE: `'${minutes} m'`, QUANTITIES: "'4,9'", CSV_FORMAT: "YES", OBJ_DATA: "NO" });
  const response = await fetch(`https://ssd.jpl.nasa.gov/api/horizons.api?${params}`, { next: { revalidate: 900 } });
  if (!response.ok) return [];
  const result = ((await response.json()) as { result?: string }).result ?? "";
  const table = result.match(/\$\$SOE([\s\S]*?)\$\$EOE/)?.[1] ?? "";
  return table.split("\n").flatMap((line) => {
    const fields = line.split(",").map((value) => value.trim());
    if (fields.length < 5 || !/\d{4}-[A-Za-z]{3}-\d{2}/.test(fields[0])) return [];
    const azimuth = Number(fields[3]), altitude = Number(fields[4]), magnitude = Number(fields[5]);
    return Number.isFinite(azimuth) && Number.isFinite(altitude)
      ? [{ time: parseHorizonsTime(fields[0]).toISOString(), azimuth, altitude, magnitude: Number.isFinite(magnitude) ? magnitude : undefined }]
      : [];
  });
}

function passes(points: EphemerisPoint[], observer: Observer) {
  const groups: EphemerisPoint[][] = [];
  for (const point of points) {
    if (point.altitude > 10 && sunAltitude(point.time, observer) < -6) groups.at(-1)?.push(point) ?? groups.push([point]);
    else if (groups.at(-1)?.length) groups.push([]);
  }
  return groups.filter(Boolean).filter((group) => group.length).map((group) => {
    const peak = [...group].sort((a, b) => b.altitude - a.altitude)[0];
    return { time: group[0].time, direction: compass(group[0].azimuth), durationMinutes: group.length, peakAltitude: peak.altitude };
  });
}

function showers(date: Date, observer: Observer) {
  const year = date.getUTCFullYear();
  return [
    { name: "Eta Aquariids", active: inRange(date, year, 4, 19, 5, 28), peak: `May 5–6, ${year}`, activity: "Up to 50 meteors/hour", radiantRa: 22.5, radiantDec: -1 },
    { name: "Perseids", active: inRange(date, year, 7, 17, 8, 24), peak: `Aug 12–13, ${year}`, activity: "Up to 100 meteors/hour", radiantRa: 3.1, radiantDec: 58 },
    { name: "Geminids", active: inRange(date, year, 12, 4, 12, 20), peak: `Dec 13–14, ${year}`, activity: "Up to 120 meteors/hour", radiantRa: 7.5, radiantDec: 33 },
  ].map((shower) => ({ ...shower, altitude: Horizon(date, observer, shower.radiantRa, shower.radiantDec).altitude, direction: compass(Horizon(date, observer, shower.radiantRa, shower.radiantDec).azimuth) }));
}
function sunAltitude(time: string, observer: Observer) { const eq = Equator(Body.Sun, new Date(time), observer, true, true); return Horizon(new Date(time), observer, eq.ra, eq.dec).altitude; }
function inRange(date: Date, year: number, startMonth: number, startDay: number, endMonth: number, endDay: number) { const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()); return day >= Date.UTC(year, startMonth - 1, startDay) && day <= Date.UTC(year, endMonth - 1, endDay); }
function compass(azimuth: number) { return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(azimuth / 45) % 8]; }
function stamp(date: Date) { return date.toISOString().slice(0, 16).replace("T", " "); }
function parseHorizonsTime(value: string) { return new Date(`${value.replace(/(\d{4})-([A-Za-z]{3})-(\d{2})/, "$1 $2 $3")} UTC`); }

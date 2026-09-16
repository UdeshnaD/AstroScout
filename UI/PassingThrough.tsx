"use client";

import type { HorizonsSnapshot, JplPosition } from "@/lib/event-types";

function clock(utc: string, timezone: string) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(utc));
}

function positionText(position?: JplPosition | null) {
  if (!position) return "Position unavailable from NASA/JPL right now";
  const altitude = Math.abs(position.altitude).toFixed(1);
  return position.altitude >= 0
    ? `${altitude}° above the ${position.compass} horizon`
    : `${altitude}° below the ${position.compass} horizon`;
}

export function PassingThrough({ snapshot, timezone }: { snapshot: HorizonsSnapshot; timezone: string }) {
  const iss = snapshot.series.iss ?? [];
  const sun = snapshot.series.sun ?? [];
  const passes = iss.reduce<Array<{ start: string; peak: number; direction: string }>>((groups, point, index) => {
    const dark = sun[index]?.altitude < -6;
    if (point.altitude > 10 && dark) {
      const last = groups.at(-1);
      if (!last || Date.parse(point.utc) - Date.parse(last.start) > 6 * 60 * 1000) {
        groups.push({ start: point.utc, peak: point.altitude, direction: point.compass });
      } else {
        last.peak = Math.max(last.peak, point.altitude);
      }
    }
    return groups;
  }, []).slice(0, 3);
  const movingObjects = (["encke", "ceres", "vesta"] as const).map((id) => ({
    id,
    position: snapshot.objects[id]?.data,
    name: { encke: "2P/Encke", ceres: "1 Ceres", vesta: "4 Vesta" }[id],
  }));

  return <section className="passing-through" id="passing-through">
    <p className="event-kicker">MOVING OBJECTS</p>
    <h2>Comet, asteroid and ISS checks</h2>
    <p className="passing-through__intro">A compact status check for the moving targets included in AstroScout&apos;s current 48-hour scan.</p>
    <ul className="passing-through__list">
      {movingObjects.map(({ id, position, name }) => <li key={id}><strong>{name}</strong><span>{positionText(position)}</span></li>)}
      <li><strong>International Space Station</strong><span>{passes.length ? passes.map((pass) => `${clock(pass.start, timezone)}, ${pass.direction}, peak ${Math.round(pass.peak)}°`).join(" · ") : "No dark-sky pass above 10° in this 48-hour scan"}</span></li>
    </ul>
  </section>;
}

"use client";
import type { HorizonsSnapshot } from "@/lib/event-types";

function clock(utc: string, timezone: string) {
  return new Intl.DateTimeFormat("en-AU", { timeZone: timezone, hour: "numeric", minute: "2-digit" }).format(new Date(utc));
}
export function PassingThrough({ snapshot, timezone }: { snapshot: HorizonsSnapshot; timezone: string }) {
  const iss = snapshot.series.iss ?? [];
  const sun = snapshot.series.sun ?? [];
  const passes = iss.reduce<Array<{ start: string; peak: number; direction: string }>>((groups, point, index) => {
    const dark = sun[index]?.altitude < -6;
    if (point.altitude > 10 && dark) {
      const last = groups.at(-1);
      if (!last || Date.parse(point.utc) - Date.parse(last.start) > 6 * 60 * 1000) groups.push({ start: point.utc, peak: point.altitude, direction: point.compass });
      else last.peak = Math.max(last.peak, point.altitude);
    }
    return groups;
  }, []).slice(0, 3);
  return <section className="passing-through"><p className="event-kicker">MOVING SKY</p><h2>What&apos;s passing through.</h2><div className="passing-through__grid"><article><strong>☄ Eta Aquariids</strong><p>Peak around 5–6 May. The radiant is in Aquarius; the best rates arrive after midnight before dawn.</p></article>{(["encke", "ceres", "vesta"] as const).map((id) => { const item = snapshot.objects[id]?.data; const name = { encke: "2P/Encke", ceres: "1 Ceres", vesta: "4 Vesta" }[id]; return <article key={id}><strong>{id === "encke" ? "☄" : "🪨"} {name}</strong><p>{item ? `${item.altitude.toFixed(1)}° above the ${item.compass} horizon now.` : "Current NASA/JPL position unavailable."}</p></article>; })}</div><div className="passing-through__iss"><strong>🛰 Dark-sky ISS passes</strong>{passes.length ? passes.map((pass) => <span key={pass.start}>{clock(pass.start, timezone)} · rises {pass.direction} · peaks {Math.round(pass.peak)}°</span>) : <span>No dark-sky ISS pass in this 48-hour JPL scan.</span>}</div></section>;
}

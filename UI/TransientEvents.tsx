"use client";

import { useEffect, useState } from "react";
import { formatClock } from "@/lib/format";

type EventData = {
  meteorShowers: Array<{ name: string; active: boolean; peak: string; activity: string; altitude: number; direction: string; radiantRa: number; radiantDec: number }>;
  objects: Array<{ id: string; kind: "comet" | "asteroid"; name: string; visible: boolean; best?: { altitude: number; azimuth: number; magnitude?: number }; bestTime?: string }>;
  issPasses: Array<{ time: string; direction: string; durationMinutes: number; peakAltitude: number }>;
};

export function TransientEvents({ time, latitude, longitude, mode }: { time: string; latitude: number; longitude: number; mode: "observer" | "astronomer" }) {
  const [data, setData] = useState<EventData>();
  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    fetch(`/api/sky-events?time=${encodeURIComponent(time)}&lat=${latitude}&lon=${longitude}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : undefined)
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch(() => {});
    return () => controller.abort();
  }, [time, latitude, longitude]);
  if (!data) return <section className="transient-events" aria-busy="true"><span className="kicker">MOVING SKY</span><p>Checking local transient events…</p></section>;
  const visibleObjects = data.objects.filter((object) => object.visible);
  return <section className="transient-events" aria-label="Transient sky events">
    <span className="kicker">MOVING SKY</span><h2>What&apos;s passing through.</h2>
    {data.meteorShowers.map((shower) => <article key={shower.name}><strong>☄ {shower.name}</strong><p>{shower.active ? `Active now · ${shower.activity}` : `Peak ${shower.peak}`}. Radiant: {Math.round(shower.altitude)}° {shower.direction}.</p>{mode === "astronomer" && <small>Radiant RA {shower.radiantRa.toFixed(1)}h · Dec {shower.radiantDec}° · Peak: {shower.peak}</small>}</article>)}
    {visibleObjects.map((object) => <article key={object.id}><strong>{object.kind === "comet" ? "☄" : "🪨"} {object.name}</strong><p>Visible at {Math.round(object.best?.altitude ?? 0)}° {compass(object.best?.azimuth)}; best near {object.bestTime ? formatClock(object.bestTime) : "—"}.</p>{mode === "astronomer" && <small>{object.kind} · magnitude {object.best?.magnitude?.toFixed(1) ?? "unavailable"} · azimuth {Math.round(object.best?.azimuth ?? 0)}°</small>}</article>)}
    {!visibleObjects.length && <p className="transient-empty">No listed comets or asteroids are suitably placed during this observing window.</p>}
    {data.issPasses.map((pass) => <article key={pass.time}><strong>🛰 ISS visible pass</strong><p>{formatClock(pass.time)} · rises {pass.direction} · about {pass.durationMinutes} min.</p>{mode === "astronomer" && <small>Peak altitude {Math.round(pass.peakAltitude)}°</small>}</article>)}
    {!data.issPasses.length && <p className="transient-empty">No dark-sky ISS pass in the next 24 hours.</p>}
  </section>;
}
function compass(azimuth?: number) { return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round((azimuth ?? 0) / 45) % 8]; }

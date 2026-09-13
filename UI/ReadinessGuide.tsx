"use client";
import { useState } from "react";
import { eventTargets, type EventTarget, type EventWeather, type JplPosition } from "@/lib/event-types";

const equipment = [{ id: "eye", label: "Naked eye", modifier: 0 }, { id: "binocs", label: "Binoculars", modifier: 7 }, { id: "scope", label: "Telescope", modifier: 12 }] as const;
export function ReadinessGuide({ target, position, sunAltitude, weather, onTarget }: { target: EventTarget; position?: JplPosition | null; sunAltitude?: number; weather?: EventWeather | null; onTarget: (target: EventTarget) => void }) {
  const [gear, setGear] = useState<(typeof equipment)[number]["id"]>("eye");
  const row = weather?.current;
  const score = position && row && sunAltitude !== undefined ? Math.max(0, Math.min(100, Math.round((Math.min(90, Math.max(0, position.altitude)) / 90) * 30 + Math.min(1, Math.max(0, (-sunAltitude - 6) / 12)) * 25 + Math.max(0, 100 - (row.cloudCover ?? 100)) * .22 + Math.max(0, 100 - (row.precipitation ?? 1) * 100) * .13 + equipment.find((item) => item.id === gear)!.modifier))) : null;
  return <section className="readiness-guide"><p className="event-kicker">CAN I SEE IT?</p><h2>Target readiness</h2><label className="readiness-guide__target">Target<select value={target} onChange={(event) => onTarget(event.target.value as EventTarget)}>{eventTargets.filter((item) => item.id !== "sun").map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><div role="group" aria-label="Equipment">{equipment.map((item) => <button key={item.id} aria-pressed={gear === item.id} onClick={() => setGear(item.id)}>{item.label}</button>)}</div><strong>{score === null ? "Checking…" : `${score}/100`}</strong><p>{score === null ? "A matching JPL position and weather sample are needed." : `${position?.name} is ${position!.altitude.toFixed(1)}° above the horizon. This guide combines altitude, darkness, cloud, precipitation and selected equipment; it is not a sighting guarantee.`}</p></section>;
}

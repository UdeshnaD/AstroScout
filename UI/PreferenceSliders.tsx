"use client";
import { useMemo, useState } from "react";
import { curatedNswSpots } from "@/data/spots";
const labels = ["Clear skies", "Darkness", "Travel", "Moonlight"] as const;
export function PreferenceSliders() {
  const [weights, setWeights] = useState([35, 35, 20, 10]);
  const ranked = useMemo(() => curatedNswSpots.map((spot) => ({ ...spot, score: Math.round((weights[0] * .75 + weights[1] * ((9 - spot.bortle) / 8) + weights[2] * (spot.bortle > 6 ? .9 : .55) + weights[3] * .7) * 100 / weights.reduce((a,b) => a+b, 1)) })).sort((a,b) => b.score - a.score).slice(0, 5), [weights]);
  return <section className="preference-sliders"><p className="event-kicker">YOUR PRIORITIES</p><h2>Rank a site your way</h2>{labels.map((label, index) => <label key={label}><span>{label}<b>{weights[index]}%</b></span><input type="range" min="0" max="100" step="5" value={weights[index]} onChange={(event) => setWeights(weights.map((value, i) => i === index ? Number(event.target.value) : value))}/></label>)}<ol>{ranked.map((spot) => <li key={spot.id}><span>{spot.name} · Bortle {spot.bortle}</span><strong>{spot.score}</strong></li>)}</ol><p className="event-footnote">0–100 is a transparent preference match, not a weather forecast or an access/safety assessment.</p></section>;
}

"use client";

import { useMemo, useState } from "react";
import { eventTargets } from "@/lib/event-types";
import { calculateTargetReadiness, type ObservingEquipment } from "@/lib/target-readiness";
import type { EventTarget, EventWeather, JplPosition } from "@/lib/event-types";

const equipment: Array<{ id: ObservingEquipment; label: string }> = [
  { id: "eye", label: "Naked eye" },
  { id: "binocs", label: "Binoculars" },
  { id: "scope", label: "Telescope" },
];

export function ReadinessGuide({
  target,
  position,
  sunAltitude,
  moon,
  weather,
  bortle,
  onTarget,
}: {
  target: EventTarget;
  position?: JplPosition | null;
  sunAltitude?: number;
  moon?: JplPosition | null;
  weather?: EventWeather | null;
  bortle?: number | null;
  onTarget: (target: EventTarget) => void;
}) {
  const [gear, setGear] = useState<ObservingEquipment>("eye");
  const assessment = useMemo(
    () => calculateTargetReadiness({
      target,
      position,
      sunAltitude,
      moon,
      weather: weather?.current,
      equipment: gear,
      bortle,
    }),
    [bortle, gear, moon, position, sunAltitude, target, weather?.current],
  );

  return (
    <section className="readiness-guide">
      <p className="event-kicker">CAN I SEE IT?</p>
      <h2>Viewing conditions score</h2>
      <p className="readiness-guide__intro">
        A target-specific comparison of the real sky position, forecast and selected equipment.
      </p>
      <label className="readiness-guide__target">
        Target
        <select value={target} onChange={(event) => onTarget(event.target.value as EventTarget)}>
          {eventTargets.filter((item) => item.id !== "sun").map((item) => (
            <option value={item.id} key={item.id}>{item.name}</option>
          ))}
        </select>
      </label>
      <div role="group" aria-label="Equipment">
        {equipment.map((item) => (
          <button key={item.id} type="button" aria-pressed={gear === item.id} onClick={() => setGear(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <strong>{assessment.score === null ? "Checking…" : `${assessment.score}/100`}</strong>
      <p>{assessment.summary}</p>
      {assessment.factors.length > 0 && (
        <div className="readiness-guide__factors" aria-label="Score factors">
          {assessment.factors.map((factor) => (
            <div key={factor.id}>
              <span>{factor.label}</span>
              <strong>{factor.score == null ? "Not included" : `${Math.round(factor.score)}/100`}</strong>
              <small>{factor.detail}</small>
            </div>
          ))}
        </div>
      )}
      {assessment.score !== null && (
        <p className="event-footnote">
          Data coverage: {assessment.coverage}%. Missing factors are excluded, not estimated. This score is not a probability or guarantee.
        </p>
      )}
    </section>
  );
}

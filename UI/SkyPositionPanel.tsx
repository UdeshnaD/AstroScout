"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { eventTargets } from "@/lib/event-types";
import type { EventTarget, HorizonsSnapshot, JplPosition } from "@/lib/event-types";

const visibleTargets = eventTargets.filter((item) => item.id !== "sun");
const playbackStep = 12; // Twelve five-minute JPL samples = one hour.

function localClock(utc: string, timezone: string) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(utc));
}

function localDateTime(utc: string, timezone: string) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: timezone,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(utc));
}

export function SkyPositionPanel({
  snapshot,
  target,
  locationName,
  timezone,
  onTarget,
  onEpoch,
}: {
  snapshot: HorizonsSnapshot;
  target: EventTarget;
  locationName: string;
  timezone: string;
  onTarget: (target: EventTarget) => void;
  onEpoch: (utc: string) => void;
}) {
  const samples = useMemo(() => {
    const available = eventTargets
      .map((item) => snapshot.series[item.id])
      .find((series) => series?.length);
    return available ?? [];
  }, [snapshot]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const exact = samples.findIndex((point) => point.utc === snapshot.utc);
    setIndex(exact >= 0 ? exact : Math.floor(samples.length / 2));
    setPlaying(false);
  }, [samples, snapshot.utc]);

  useEffect(() => {
    if (!playing || !samples.length) return;
    const timer = window.setInterval(() => {
      setIndex((current) => {
        const next = current + playbackStep;
        if (next >= samples.length) {
          setPlaying(false);
          return samples.length - 1;
        }
        return next;
      });
    }, 900);
    return () => window.clearInterval(timer);
  }, [playing, samples.length]);

  if (!samples.length) return null;
  const safeIndex = Math.min(index, samples.length - 1);
  const utc = samples[safeIndex].utc;
  const at = (id: EventTarget): JplPosition | undefined =>
    snapshot.series[id]?.[safeIndex];
  const positions = visibleTargets
    .map((item) => ({ item, position: at(item.id) }))
    .filter(
      (entry): entry is typeof entry & { position: JplPosition } =>
        Boolean(entry.position),
    );
  const sun = at("sun");
  const auroraDirection = snapshot.location.latitude < 0 ? "southern" : "northern";
  const skyIsDark = (sun?.altitude ?? 90) <= -18;
  const move = (amount: number) => {
    setPlaying(false);
    setIndex((current) =>
      Math.max(0, Math.min(samples.length - 1, current + amount)),
    );
  };

  return (
    <section className="sky-overview" id="where-to-look" aria-labelledby="sky-overview-heading">
      <div className="sky-overview-heading">
        <div>
          <p className="event-kicker">THE VIEW FROM {locationName.toUpperCase()}</p>
          <h2 id="sky-overview-heading">Where to look.</h2>
          <p className="sky-overview-intro">
            This is a snapshot of the whole sky. Move left or right for compass direction and look higher on the chart for objects higher above the horizon.
          </p>
        </div>
        <div className="sky-overview-time">
          <span>{timezone}</span>
          <strong>{localClock(utc, timezone)}</strong>
        </div>
      </div>

      <div className="sky-overview-card">
        <svg
          viewBox="0 0 800 350"
          role="img"
          aria-label={`Calculated positions of the Moon and planets above the horizon at ${localDateTime(utc, timezone)}`}
        >
          {[0, 30, 60, 90].map((altitude) => (
            <g key={altitude}>
              <line
                x1="45"
                x2="770"
                y1={300 - altitude * 2.8}
                y2={300 - altitude * 2.8}
                className={altitude === 0 ? "sky-horizon-line" : "sky-altitude-line"}
              />
              <text x="7" y={305 - altitude * 2.8}>{altitude}°</text>
            </g>
          ))}
          {(["N", "E", "S", "W", "N"] as const).map((direction, directionIndex) => (
            <text
              key={`${direction}-${directionIndex}`}
              x={45 + directionIndex * 181.25}
              y="333"
              textAnchor="middle"
            >
              {direction}
            </text>
          ))}
          {positions
            .filter(({ position }) => position.altitude > 0)
            .map(({ item, position }) => {
              const x = 45 + (position.azimuth / 360) * 725;
              const y = 300 - position.altitude * 2.8;
              const selected = target === item.id;
              return (
                <g
                  key={item.id}
                  className="sky-object-marker"
                  role="button"
                  tabIndex={0}
                  aria-label={`${item.name}, ${position.altitude.toFixed(1)} degrees above the ${position.compass} horizon`}
                  aria-pressed={selected}
                  onClick={() => onTarget(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onTarget(item.id);
                    }
                  }}
                >
                  <circle className="sky-marker-hit" cx={x} cy={y} r="22" />
                  <circle className="sky-marker-dot" cx={x} cy={y} r={selected ? 8 : 5} />
                  {selected && (
                    <text x={Math.max(80, Math.min(720, x))} y={y - 22} textAnchor="middle" className="sky-marker-label">
                      {item.name}
                    </text>
                  )}
                </g>
              );
            })}
        </svg>

        <div className="sky-overview-controls">
          <button
            type="button"
            aria-label={playing ? "Pause sky movement" : "Play sky movement"}
            aria-pressed={playing}
            onClick={() => setPlaying((value) => !value)}
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <input
            type="range"
            min={0}
            max={samples.length - 1}
            step={1}
            value={safeIndex}
            aria-label="Sky time"
            aria-valuetext={localDateTime(utc, timezone)}
            onChange={(event) => {
              setPlaying(false);
              setIndex(Number(event.target.value));
            }}
          />
          <button type="button" aria-label="One hour earlier" disabled={safeIndex === 0} onClick={() => move(-playbackStep)}>
            <ChevronLeft size={18} />
          </button>
          <output>{localClock(utc, timezone)}</output>
          <button type="button" aria-label="One hour later" disabled={safeIndex === samples.length - 1} onClick={() => move(playbackStep)}>
            <ChevronRight size={18} />
          </button>
        </div>
        <p className="sky-overview-source">Positions are calculated every five minutes using NASA/JPL data.</p>
        <div className="sky-obstruction" role="note">
          <strong>Horizon obstruction</strong>
          <span>Trees, hills and buildings near you may still hide an object shown above the horizon.</span>
        </div>
        <button className="sky-use-time" type="button" onClick={() => onEpoch(utc)}>
          Use {localDateTime(utc, timezone)} as the exact observing time
        </button>
      </div>

      <div className="aurora-readiness" role="note">
        <span>AURORA READINESS / {auroraDirection.toUpperCase()} HORIZON</span>
        <strong>{skyIsDark ? "The sky is dark enough" : "The sky is still too bright"}</strong>
        <p>
          {skyIsDark
            ? "Darkness is only one requirement for an aurora. Check a live aurora service for current solar activity."
            : "An aurora would be washed out by daylight or bright twilight. Check again when the sky is fully dark."}
        </p>
      </div>
    </section>
  );
}

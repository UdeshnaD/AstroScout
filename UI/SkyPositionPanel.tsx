"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { eventTargets } from "@/lib/event-types";
import { analyseNight, assessAurora, forecastAt } from "@/lib/horizons-analysis";
import { JplNightPanel } from "./JplNightPanel";
import type { EventTarget, EventWeather, HorizonsSnapshot, JplPosition } from "@/lib/event-types";

const visibleTargets = eventTargets.filter((item) => item.id !== "sun");
const MANUAL_STEP = 12; // Arrow buttons advance 12 samples (1 hour) per click

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
  weather,
  onTarget,
  onEpoch,
  previewUtc,
}: {
  snapshot: HorizonsSnapshot;
  target: EventTarget;
  locationName: string;
  timezone: string;
  weather?: EventWeather | null;
  onTarget: (target: EventTarget) => void;
  onEpoch: (utc: string) => void;
  previewUtc?: string;
}) {
  const samples = useMemo(() => {
    const night = analyseNight(snapshot, target, weather);
    if (night.points.length) return night.points;
    const available = eventTargets
      .map((item) => snapshot.series[item.id])
      .find((series) => series?.length);
    return available ?? [];
  }, [snapshot, target, weather]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [view, setView] = useState<"sky" | "night">("sky");
  const [compactSky, setCompactSky] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 650px)");
    const sync = () => setCompactSky(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element).closest("a");
      if (link?.getAttribute("href") === "#best-viewing-time") {
        setView("night");
        requestAnimationFrame(() => document.getElementById("where-to-look")?.scrollIntoView({ behavior: "smooth" }));
      } else if (link?.getAttribute("href") === "#where-to-look") setView("sky");
    };
    document.addEventListener("click", navigate);
    return () => document.removeEventListener("click", navigate);
  }, []);
  const drag = useRef<{ x: number; rotation: number } | null>(null);

  // Sync initial index when snapshot updates (KEEP THIS)
  useEffect(() => {
    const exact = samples.findIndex((point) => point.utc === snapshot.utc);
    setIndex(exact >= 0 ? exact : Math.floor(samples.length / 2));
    setPlaying(false);
  }, [snapshot.utc]);

  useEffect(() => {
    if (!previewUtc || !samples.length) return;
    const match = samples.findIndex((sample) => sample.utc === previewUtc);
    if (match >= 0) { setIndex(match); setPlaying(false); }
  }, [previewUtc, samples]);

  // Continuous fluid motion animation loop
// Continuous fluid motion animation loop
  useEffect(() => {
    if (!playing || !samples.length) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    const speed = 1.0; // Adjust speed: 1.5 = faster continuous drift

    const step = (now: number) => {
      const delta = now - lastTime;
      if (delta >= 60 / speed) {
        setIndex((current) => {
          // Wrap back to 0 seamlessly when reaching the end of the array
          return (current + 0.3) % samples.length;
        });
        lastTime = now;
      }
      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [playing, samples.length]);

  if (!samples.length) return null;

  // Safeguard array index lookup for fractional index values
  const safeIndex = Math.min(Math.floor(index), samples.length - 1);
  const utc = samples[safeIndex].utc;
  const at = (id: EventTarget): JplPosition | undefined =>
    snapshot.series[id]?.find((sample) => sample.utc === utc);
  const positions = visibleTargets
    .map((item) => ({ item, position: at(item.id) }))
    .filter(
      (entry): entry is typeof entry & { position: JplPosition } =>
        Boolean(entry.position),
    );
  const sun = at("sun");
  const aurora = assessAurora(
    sun?.altitude,
    snapshot.location.latitude,
    forecastAt(weather, utc),
  );
  const move = (amount: number) => {
    setPlaying(false);
    setIndex((current) =>
      Math.max(0, Math.min(samples.length - 1, current + amount)),
    );
  };
  const heading = ((Math.round(rotation) % 360) + 360) % 360;

  const timeControls = (
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
          <button type="button" aria-label="One hour earlier" disabled={safeIndex === 0} onClick={() => move(-MANUAL_STEP)}>
            <ChevronLeft size={18} />
          </button>
          <output>{localClock(utc, timezone)}</output>
          <button type="button" aria-label="One hour later" disabled={safeIndex === samples.length - 1} onClick={() => move(MANUAL_STEP)}>
            <ChevronRight size={18} />
          </button>
        </div>
  );
  return (
    <section className="sky-overview" id="where-to-look" aria-labelledby="sky-overview-heading">
      <div className="sky-overview-heading">
        <div>
          <p className="event-kicker">THE VIEW FROM {locationName.toUpperCase()}</p>
          <h2 id="sky-overview-heading">Explore tonight.</h2>
          <p className="sky-overview-intro">
            {view === "sky" ? "Drag to rotate the sky. Each dot is a tracked object above your horizon." : "Follow your selected object through the night and check the forecast at the same time."}
          </p>
        </div>
        <div className="sky-overview-time">
          <span>{timezone}</span>
          <strong>{localClock(utc, timezone)}</strong>
        </div>
      </div>

      <div className="sky-overview-card">
        <div className="sky-view-tabs" role="tablist" aria-label="Sky display">
          <button id="sky-view-tab" role="tab" aria-selected={view === "sky"} aria-controls="sky-view-panel" onClick={() => setView("sky")}>Sky view</button>
          <button id="night-view-tab" role="tab" aria-selected={view === "night"} aria-controls="night-view-panel" onClick={() => setView("night")}>Through the night</button>
        </div>
        <div id="sky-view-panel" role="tabpanel" aria-labelledby="sky-view-tab" hidden={view !== "sky"}>
        <svg
          viewBox={compactSky ? "200 0 400 390" : "0 0 800 390"}
          role="img"
          aria-label={`Interactive 360 degree sky view at ${localDateTime(utc, timezone)}`}
          onPointerDown={(event) => {
            if ((event.target as Element).closest(".sky-object-marker")) return;
            drag.current = { x: event.clientX, rotation };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            setRotation(drag.current.rotation + (event.clientX - drag.current.x) * .55);
          }}
          onPointerUp={(event) => {
            drag.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => { drag.current = null; }}
        >
          <circle cx="400" cy="184" r="158" className="sky-dome" />
          {[0, 30, 60].map((altitude) => (
            <g key={altitude}>
              <circle
                cx="400"
                cy="184"
                r={(90 - altitude) / 90 * 158}
                className={altitude === 0 ? "sky-horizon-line" : "sky-altitude-line"}
              />
              <text x="405" y={188 - ((90 - altitude) / 90 * 158)}>{altitude}°</text>
            </g>
          ))}
          <circle cx="400" cy="184" r="4" className="sky-zenith" />
          <text x="410" y="179" className="sky-zenith-label">ZENITH</text>
          {([{"label":"N","az":0},{"label":"E","az":90},{"label":"S","az":180},{"label":"W","az":270}]).map(({ label, az }) => {
            const angle = (az - rotation) * Math.PI / 180;
            return <text key={label} x={400 + Math.sin(angle) * 178} y={189 - Math.cos(angle) * 178} textAnchor="middle" className="sky-cardinal">{label}</text>;
          })}
          {positions
            .filter(({ position }) => position.altitude > 0)
            .map(({ item, position }) => {
              const angle = (position.azimuth - rotation) * Math.PI / 180;
              const radius = (90 - Math.min(90, position.altitude)) / 90 * 150;
              const x = 400 + Math.sin(angle) * radius;
              const y = 184 - Math.cos(angle) * radius;
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
                    <text x={x} y={y - 18} textAnchor="middle" className="sky-marker-label">
                      {item.name}
                    </text>
                  )}
                </g>
              );
            })}
          <text x="400" y="378" textAnchor="middle" className="sky-rotation-label">DRAG TO ROTATE · HEADING {heading}°</text>
        </svg>
        </div>
        <div id="night-view-panel" role="tabpanel" aria-labelledby="night-view-tab" hidden={view !== "night"}>
          <JplNightPanel snapshot={snapshot} target={target} weather={weather} timezone={timezone} onEpoch={onEpoch} previewUtc={utc} timeControls={timeControls} onPreviewTime={(time) => { setPlaying(false); const match = samples.findIndex((sample) => sample.utc === time); if (match >= 0) setIndex(match); }} />
        </div>

        {view === "sky" && timeControls}
        <p className="sky-overview-source">Positions are calculated every five minutes. Solar System objects use NASA/JPL data. Deep-sky objects use catalogue coordinates and local sidereal time.</p>
        <div className="sky-obstruction" role="note">
          <strong>Horizon obstruction</strong>
          <span>Trees, hills and buildings near you may still hide an object shown above the horizon.</span>
        </div>
        <button className="sky-use-time" type="button" onClick={() => onEpoch(utc)}>
          Use {localDateTime(utc, timezone)} as the exact observing time
        </button>
      </div>

      <div className="aurora-readiness" role="note">
        <span>AURORA READINESS / {aurora.direction.toUpperCase()}</span>
        <strong>{aurora.darkness}</strong>
        <p>{aurora.summary}</p>
        <ul>
          <li>{aurora.latitude}</li>
          <li>{aurora.horizon}</li>
          <li>{aurora.weather}</li>
          <li>{aurora.geomagnetic}</li>
          <li>{aurora.solar}</li>
        </ul>
      </div>
    </section>
  );
}

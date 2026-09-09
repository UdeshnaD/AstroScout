"use client";
import { useEffect, useMemo, useState } from "react";
import { Clock3, Moon, Sun, ArrowUpRight } from "lucide-react";
import {
  analyseNight,
  moonlightExplanation,
  skyState,
} from "@/lib/horizons-analysis";
import type {
  EventTarget,
  EventWeather,
  HorizonsSnapshot,
} from "@/lib/event-types";
const clock = (utc: string, timezone: string) =>
  new Date(utc).toLocaleTimeString("en-AU", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  });
const date = (utc: string, timezone: string) =>
  new Date(utc).toLocaleString("en-AU", {
    timeZone: timezone,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
export function JplNightPanel({
  snapshot,
  target,
  weather,
  locationName,
  timezone,
  onEpoch,
}: {
  snapshot?: HorizonsSnapshot;
  target: EventTarget;
  weather?: EventWeather | null;
  locationName: string;
  timezone: string;
  onEpoch: (utc: string) => void;
}) {
  const night = useMemo(
    () => analyseNight(snapshot, target, weather),
    [snapshot, target, weather],
  );
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(
      Math.max(
        0,
        night.points.findIndex((p) => p.utc === snapshot?.utc),
      ),
    );
  }, [night, snapshot?.utc]);
  if (!snapshot) return null;
  const exact = snapshot.objects[target]?.data,
    sun = snapshot.objects.sun?.data;
  const moon = snapshot.objects.moon?.data;
  const point = night.points[Math.min(index, night.points.length - 1)];
  const x = (i: number) =>
    night.points.length < 2 ? 0 : (i * 800) / (night.points.length - 1);
  const y = (alt: number) => 15 + ((90 - alt) / 180) * 180;
  const line = (body: "target" | "sun") =>
    night.points
      .map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p[body].altitude)}`)
      .join(" ");
  const source = snapshot.objects[target];
  return (
    <section
      className="jpl-night-panel"
      aria-label="JPL overnight observing analysis"
    >
      <div className="jpl-state">
        <span>At requested epoch: {night.status}</span>
        <span>
          <Sun size={15} />
          {skyState(sun?.altitude)}
          {sun ? ` / Sun ${sun.altitude.toFixed(1)}°` : ""}
        </span>
      </div>
      {exact && (
        <p className="jpl-narrative">
          NASA/JPL Horizons has calculated {exact.name}&apos;s apparent position
          from {locationName} for {date(exact.utc, timezone)} ({timezone}).{" "}
          {exact.name} is {Math.abs(exact.altitude).toFixed(2)}°{" "}
          {exact.altitude > 0 ? "above" : "below"} the {exact.compass} horizon.
        </p>
      )}
      <div className="jpl-window">
        <Clock3 size={21} />
        <div>
          <h3>
            {night.best
              ? `${date(night.best.start, timezone)} – ${date(night.best.end, timezone)}`
              : "No weather-qualified window"}
          </h3>
          <p>
            {night.best
              ? `Best sampled window / ${timezone}`
              : night.reason}
          </p>
          {night.best && (
            <p>
              Peak sampled altitude {night.best.peak.target.altitude.toFixed(1)}
              °; Sun {night.best.peak.sun.altitude.toFixed(1)}°. Higher target
              altitude, darkness and forecast conditions favour this interval.
            </p>
          )}
          {night.best &&
            Date.parse(night.best.end) < Date.parse(snapshot.utc) && (
              <p>
                This window is earlier than the selected epoch, not an upcoming
                recommendation.
              </p>
            )}
        </div>
      </div>
      {!night.best && night.geometryOnly && (
        <p className="event-footnote">
          Geometry-only interval: {date(night.geometryOnly.start, timezone)} –{" "}
          {date(night.geometryOnly.end, timezone)}. Weather suitability is not
          established for this interval.
        </p>
      )}
      {point && (
        <>
          <div className="jpl-chart-header">
            <h3>Altitude through the night</h3>
            <span>JPL samples / 5-minute spacing</span>
          </div>
          <div className="jpl-chart-legend" aria-label="Chart legend">
            <span><i className="target" />{exact?.name ?? "Target"}</span>
            <span><i className="sun" />Sun</span>
            <span><i className="darkness" />Astronomical darkness</span>
            <span><i className="horizon" />Horizon</span>
          </div>
          <div className="jpl-plot">
            <div className="jpl-axis">
              <span>90°</span>
              <span>0°</span>
              <span>-90°</span>
            </div>
            <svg
              viewBox="0 0 800 220"
              preserveAspectRatio="none"
              role="img"
              aria-label={`${exact?.name ?? target} and Sun altitude from NASA/JPL samples`}
              onPointerMove={(event) => {
                const box = event.currentTarget.getBoundingClientRect();
                setIndex(
                  Math.max(
                    0,
                    Math.min(
                      night.points.length - 1,
                      Math.round(
                        ((event.clientX - box.left) / box.width) *
                          (night.points.length - 1),
                      ),
                    ),
                  ),
                );
              }}
            >
              {night.points.map((p, i) =>
                i < night.points.length - 1 && p.sun.altitude <= -18 ? (
                  <rect
                    key={p.utc}
                    x={x(i)}
                    y="0"
                    width={x(i + 1) - x(i) + 0.5}
                    height="220"
                    fill="#173e30"
                  />
                ) : null,
              )}
              <line
                x1="0"
                y1={y(0)}
                x2="800"
                y2={y(0)}
                stroke="#a0b7a9"
                strokeDasharray="5 5"
              />
              <line
                x1="0"
                y1={y(20)}
                x2="800"
                y2={y(20)}
                stroke="#75a793"
                strokeDasharray="2 7"
              />
              <path
                d={line("target")}
                fill="none"
                stroke="#f2d59b"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={line("sun")}
                fill="none"
                stroke="#b79ec5"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={x(index)}
                y1="0"
                x2={x(index)}
                y2="220"
                stroke="#ffffff"
                strokeOpacity=".7"
              />
            </svg>
          </div>
          <div className="jpl-chart-times">
            <span>{clock(night.points[0].utc, timezone)}</span>
            <span>
              {clock(night.points[Math.floor(night.points.length / 2)].utc, timezone)}
            </span>
            <span>{clock(night.points[night.points.length - 1].utc, timezone)}</span>
          </div>
          <label className="jpl-scrubber">
            Selected JPL sample
            <input
              type="range"
              min="0"
              max={night.points.length - 1}
              step="1"
              value={Math.min(index, night.points.length - 1)}
              aria-label="Night timeline sample"
              aria-valuetext={`${date(point.utc, timezone)}, target ${point.target.altitude.toFixed(2)} degrees, Sun ${point.sun.altitude.toFixed(2)} degrees`}
              onChange={(e) => setIndex(Number(e.target.value))}
            />
          </label>
          <div className="jpl-sample-readout">
            <strong>{date(point.utc, timezone)} / {timezone}</strong>
            <span>Exact sample UTC: {point.utc}</span>
            <span>
              Target {point.target.altitude.toFixed(2)}° / Sun{" "}
              {point.sun.altitude.toFixed(2)}°
            </span>
            <span>
              Open-Meteo forecast:{" "}
              {point.weather?.cloudCover != null
                ? `${point.weather.cloudCover}% cloud, valid ${point.weather.time}`
                : "unavailable at this sample"}
            </span>
            <button onClick={() => onEpoch(point.utc)}>
              Use this exact epoch <ArrowUpRight size={16} />
            </button>
          </div>
          <p className="event-footnote">
            The dotted guide marks 20° altitude. Lines connect JPL samples; no
            intermediate positions are claimed.
          </p>
        </>
      )}
      <p className="jpl-moonlight">
        <Moon size={17} />
        {moonlightExplanation(moon)}
      </p>
      <p className="event-footnote">
        NASA/JPL Horizons API / exact requested epoch: {snapshot.utc}
        <br />
        Target response received: {source?.receivedAt ?? "unavailable"} / Sun:{" "}
        {snapshot.objects.sun?.receivedAt ?? "unavailable"} / Moon:{" "}
        {snapshot.objects.moon?.receivedAt ?? "unavailable"}
      </p>
      {night.incomplete && (
        <p className="event-warning">
          This night reaches the edge of the 48-hour scan. The displayed window
          is limited to that scan.
        </p>
      )}
      <details>
        <summary>Window method &amp; scientific limits</summary>
        <p className="event-footnote">
          The night containing the requested epoch is used when the Sun is below
          0°; otherwise the next such interval is selected. At least 15 minutes
          of consecutive samples must have Sun ≤ -18°, target ≥ 20°, cloud ≤
          50%, precipitation ≤ 0.1 mm, visibility ≥ 10 km and wind ≤ 25 km/h.
          Among eligible samples, altitude has weight 65%, clear-sky fraction
          25% and calmer wind 10%. The window extends around the best sample
          while the score stays within 0.1 of its peak. These explicit planning
          thresholds are not a probability model. Nearest hourly forecasts must
          be within 30 minutes. Boundaries have 5-minute sampling precision, not
          second-level accuracy. Bright planets and the Moon can be visible
          outside these preferred conditions. All Sun states use the airless
          centre altitude; this is not an upper-limb, refraction-corrected
          sunrise calculation.
        </p>
      </details>
    </section>
  );
}

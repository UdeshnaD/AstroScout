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
        <span>At your chosen time: {night.status}</span>
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
              ? `${date(night.best.start, timezone)} to ${date(night.best.end, timezone)}`
              : "No ideal viewing window found"}
          </h3>
          <p>
            {night.best
              ? `Best time to look / ${timezone}`
              : night.reason}
          </p>
          {night.best && (
            <p>
              The object reaches {night.best.peak.target.altitude.toFixed(1)}°
              while the Sun is at {night.best.peak.sun.altitude.toFixed(1)}°. This
              period offers the best balance of height, darkness and forecast weather.
            </p>
          )}
          {night.best &&
            Date.parse(night.best.end) < Date.parse(snapshot.utc) && (
              <p>
                This time has already passed. It is shown for the night you selected.
              </p>
            )}
        </div>
      </div>
      {!night.best && night.geometryOnly && (
        <p className="event-footnote">
          The object is in a promising position from {date(night.geometryOnly.start, timezone)} to{" "}
          {date(night.geometryOnly.end, timezone)}. Weather suitability is not
          confirmed for this time.
        </p>
      )}
      {point && (
        <>
          <div className="jpl-chart-header">
            <div>
              <h3>How the view changes tonight</h3>
              <p>This graph follows your selected object and the Sun over time. Higher on the chart means higher in the sky.</p>
            </div>
            <span>Calculated every 5 minutes</span>
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
            Choose a time on the graph
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
            <span>UTC time: {point.utc}</span>
            <span>
              Target {point.target.altitude.toFixed(2)}° / Sun{" "}
              {point.sun.altitude.toFixed(2)}°
            </span>
            <span>
              Weather forecast:{" "}
              {point.weather?.cloudCover != null
                ? `${point.weather.cloudCover}% cloud, valid ${point.weather.time}`
                : "not available for this time"}
            </span>
            <button onClick={() => onEpoch(point.utc)}>
              View this exact time <ArrowUpRight size={16} />
            </button>
          </div>
          <p className="event-footnote">
            The dotted guide marks 20° altitude. Each reading is calculated five
            minutes apart; the lines make the overall movement easier to follow.
          </p>
        </>
      )}
      <p className="jpl-moonlight">
        <Moon size={17} />
        {moonlightExplanation(moon)}
      </p>
      <p className="event-footnote">
        NASA/JPL Horizons calculation for: {snapshot.utc}
        <br />
        <br />Data received for target: {source?.receivedAt ?? "not available"} / Sun:{" "}
        {snapshot.objects.sun?.receivedAt ?? "not available"} / Moon:{" "}
        {snapshot.objects.moon?.receivedAt ?? "not available"}
      </p>
      {night.incomplete && (
        <p className="event-warning">
          This night reaches the edge of the 48-hour scan. The displayed window
          is limited to that scan.
        </p>
      )}
      <details>
        <summary>How this viewing time was chosen</summary>
        <p className="event-footnote">
          AstroScout checks every five-minute reading during the selected night.
          A promising period lasts at least 15 minutes, with the Sun at least 18°
          below the horizon, the object at least 20° high, cloud at 50% or less,
          almost no rain, visibility of at least 10 km and wind no stronger than
          25 km/h. Higher objects, clearer skies and calmer wind receive a better
          score. Weather forecasts are matched within 30 minutes. The result is
          practical guidance, not a guarantee. Bright planets and the Moon may
          still be visible outside these preferred conditions.
        </p>
      </details>
    </section>
  );
}

"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { Clock3, Moon } from "lucide-react";
import { analyseNight, moonlightExplanation, skyState } from "@/lib/horizons-analysis";
import type { EventTarget, EventWeather, HorizonsSnapshot } from "@/lib/event-types";

const clock = (utc: string, timezone: string) => new Date(utc).toLocaleTimeString("en-AU", { timeZone: timezone, hour: "numeric", minute: "2-digit" });
const date = (utc: string, timezone: string) => new Date(utc).toLocaleString("en-AU", { timeZone: timezone, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const reading = (value: number | null | undefined, unit: string) => value == null ? "Unavailable" : `${value.toFixed(1)}${unit}`;

export function JplNightPanel({ snapshot, target, weather, timezone, onEpoch, onPreviewTime, previewUtc, timeControls }: {
  snapshot?: HorizonsSnapshot; target: EventTarget; weather?: EventWeather | null;
  timezone: string; onEpoch: (utc: string) => void; onPreviewTime?: (utc: string) => void; previewUtc?: string; timeControls?: ReactNode;
}) {
  const night = useMemo(() => analyseNight(snapshot, target, weather), [snapshot, target, weather]);
  const index = Math.max(0, night.points.findIndex((sample) => sample.utc === (previewUtc ?? snapshot?.utc)));
  const point = night.points[index];
  if (!snapshot) return null;
  const name = snapshot.objects[target]?.data?.name ?? target;
  const tracks = [
    { title: name, describe: (sample: typeof point) => sample.target.altitude < 0 ? "Below horizon" : sample.target.altitude < 20 ? "Low · 0–20°" : "Above 20°" },
    { title: "Darkness", describe: (sample: typeof point) => sample.sun.altitude > 0 ? "Daylight" : sample.sun.altitude > -18 ? "Twilight" : "Dark sky" },
    { title: "Weather", describe: (sample: typeof point) => sample.suitable === null ? "Unconfirmed" : sample.suitable ? "Meets guide" : "Outside guide" },
  ];
  const segments = (describe: (sample: typeof point) => string) => {
    const result: { label: string; start: number; end: number }[] = [];
    night.points.forEach((sample, i) => {
      const label = describe(sample);
      const last = result[result.length - 1];
      if (last?.label === label) last.end = i;
      else result.push({ label, start: i, end: i });
    });
    return result;
  };
  return <section id="best-viewing-time" className="jpl-night-panel" aria-label="Overnight observing analysis">
    <div className="jpl-window"><Clock3 size={22} /><div>
      <p>Best time to look · {timezone}</p>
      <h3>{night.best ? `${date(night.best.start, timezone)} to ${date(night.best.end, timezone)}` : "No preferred viewing interval"}</h3>
      <p>{night.best ? "This interval meets the height, darkness and forecast conditions used by the observing guide." : night.reason}</p>
      {night.best && Date.parse(night.best.end) < Date.parse(snapshot.utc) && <p>This interval has already passed for the night you selected.</p>}
    </div></div>
    {!night.best && night.geometryOnly && <p className="event-footnote">Height and darkness support observing from {date(night.geometryOnly.start, timezone)} to {date(night.geometryOnly.end, timezone)}, but suitable weather is not confirmed.</p>}
    {point && <>
      <div className="night-scene-heading"><div><h3>Your night, at a glance</h3><p>Read left to right. Select a period to preview its midpoint, or use the slider for an exact time.</p></div></div>
      <div className="night-plan">
        <div className="night-plan-axis"><span>{date(night.points[0].utc, timezone)}</span><span>{clock(night.points[Math.floor(night.points.length / 2)].utc, timezone)}</span><span>{date(night.points[night.points.length - 1].utc, timezone)}</span></div>
        <div className="night-plan-tracks">
          {tracks.map((track) => <div className="night-plan-row" key={track.title}>
            <strong>{track.title}</strong>
            <div className="night-plan-periods">
              {segments(track.describe).map((segment) => <button type="button" key={segment.start} style={{ flexGrow: segment.end - segment.start + 1 }} data-state={segment.label} title={`${segment.label}: ${clock(night.points[segment.start].utc, timezone)} to ${clock(night.points[segment.end].utc, timezone)}`} aria-label={`${track.title}, ${segment.label}, ${date(night.points[segment.start].utc, timezone)} to ${date(night.points[segment.end].utc, timezone)}. Preview midpoint.`} onClick={() => onPreviewTime?.(night.points[Math.floor((segment.start + segment.end) / 2)].utc)}><span>{segment.label}</span></button>)}
            </div>
          </div>)}
          <div className="night-plan-cursor" style={{ left: `calc(120px + (100% - 120px) * ${index / Math.max(1, night.points.length - 1)})` }} />
        </div>
      </div>
      {timeControls}
      <p className="event-footnote">Height, darkness and weather are separate checks. Above 20° does not guarantee visibility. Weather gaps remain unconfirmed.</p>
      <p className="night-plan-reading"><strong>{date(point.utc, timezone)}</strong> · {name}: {point.target.altitude.toFixed(1)}° · {point.target.compass}</p>
      <dl className="night-conditions">
        <div><dt>Sky</dt><dd>{skyState(point.sun.altitude)}</dd></div>
        <div><dt>Cloud cover</dt><dd>{reading(point.weather?.cloudCover, "%")}</dd></div>
        <div><dt>Rain</dt><dd>{reading(point.weather?.precipitation, " mm")}</dd></div>
        <div><dt>Forecast valid</dt><dd>{point.weather ? clock(point.weather.time, timezone) : "Unavailable"}</dd></div>
      </dl>
      <div className="observing-decision">
        <strong>{point.geometric && point.suitable === true ? "Meets the observing criteria" : point.suitable === null ? "Weather suitability is unconfirmed" : "Outside the preferred observing conditions"}</strong>
        <p>{point.target.altitude < 20 ? "The object is below the 20° height guide. " : ""}{point.sun.altitude > -18 ? "The sky is not fully dark. " : ""}{point.weather?.cloudCover != null && point.weather.cloudCover > 50 ? "Cloud cover exceeds 50%. " : ""}{point.weather?.precipitation != null && point.weather.precipitation > .1 ? "Rain exceeds the guide’s limit. " : ""}{point.weather?.visibility != null && point.weather.visibility < 10000 ? "Visibility is below 10 km. " : ""}{point.weather?.wind != null && point.weather.wind > 25 ? "Wind exceeds 25 km/h. " : ""}These are planning criteria, not a sighting guarantee.</p>
        <div><span>Visibility: {reading(point.weather?.visibility == null ? null : point.weather.visibility / 1000, " km")}</span><span>Wind: {reading(point.weather?.wind, " km/h")}</span></div>
      </div>
      <details><summary>Exact sample and forecast time</summary><p className="event-footnote">UTC: {point.utc}<br />Sun altitude: {point.sun.altitude.toFixed(2)}°<br />Weather forecast valid: {point.weather?.time ?? "Unavailable"}. Sky positions are calculated every five minutes; weather is matched within 30 minutes, not recalculated every five minutes.</p></details>
    </>}
    <p className="jpl-moonlight"><Moon size={17} />{moonlightExplanation(point?.moon ?? snapshot.objects.moon?.data)}</p>
    {night.incomplete && <p className="event-warning">This night reaches the edge of the 48-hour scan. The displayed interval is limited to that scan.</p>}
    <details><summary>How this viewing time was chosen</summary><p className="event-footnote">A preferred interval lasts at least 15 minutes: Sun at least 18° below the horizon, target at least 20° high, cloud at 50% or less, rain no more than 0.1 mm, visibility at least 10 km and wind no stronger than 25 km/h. Higher objects, clearer skies and calmer wind improve the score. Bright planets and the Moon may still be visible outside these conditions.</p></details>
  </section>;
}

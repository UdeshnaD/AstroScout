"use client";

import { ArrowDown, ArrowUp, RotateCcw, Telescope } from "lucide-react";
import {
  factorNames,
  trainPreferenceModel,
  type Feedback,
  type Priorities,
  type RankedPlan,
} from "@/lib/recommender";
import { formatClock, formatMinutes } from "@/lib/format";
import type { AstronomySummary } from "@/types/astronomy";

export function ForecastTimeline({
  plan,
  hour,
  onHour,
}: {
  plan: RankedPlan;
  hour: number;
  onHour: (hour: number) => void;
}) {
  const point = plan.weather.hourly[hour] ?? plan.weather.hourly[0];
  if (!point) return null;
  return (
    <section className="forecast-section">
      <div className="section-heading">
        <h3>Through the night</h3>
        <span>
          Hourly forecast
        </span>
      </div>
      <div className="forecast-hours" role="group" aria-label="Forecast hour">
        {plan.weather.hourly.map((p, i) => (
          <button
            key={p.time}
            type="button"
            aria-pressed={hour === i}
            onClick={() => onHour(i)}
            className={`forecast-hour ${hour === i ? "active" : ""}`}
            title={`${formatClock(p.time)}: ${p.cloudCover}% cloud, ${p.precipitationChance}% rain`}
          >
            <span>{formatClock(p.time)}</span>
            <div className="forecast-bar">
              <i style={{ height: `${Math.max(3, 100 - p.cloudCover)}%` }} />
            </div>
            <strong>{100 - p.cloudCover}%</strong>
          </button>
        ))}
      </div>
      <div className="forecast-key">
        <span>
          <i />
          Clear-sky fraction
        </span>
        <span>
          {point.cloudCover}% cloud / {point.precipitationChance}% rain /{" "}
          {point.visibilityKm} km visibility
        </span>
      </div>
    </section>
  );
}

export function SkyTargets({ astronomy }: { astronomy: AstronomySummary }) {
  if (astronomy.sunAltitude == null || !astronomy.highlights.length) return <section className="targets-section"><h3>NASA/JPL data unavailable</h3><p>Open the JPL night planner for this location. No replacement positions are calculated.</p></section>;
  const visibleCount = astronomy.highlights.filter(
    (p) => (p.altitude ?? -90) > 10,
  ).length;
  const daylight = (astronomy.sunAltitude ?? -90) > -6;
  return (
    <section className="targets-section">
      <div className="section-heading">
        <h3>
          <Telescope size={17} /> In your sky
        </h3>
        <span>
          {daylight
            ? "Daylight / bright twilight"
            : `${visibleCount} targets above 10 degrees`}
        </span>
      </div>
      <div className="target-list">
        {astronomy.highlights.map((target) => (
          <details
            className={`target-row ${(target.altitude ?? -90) <= 0 ? "below-horizon" : ""}`}
            key={target.id}
          >
            <summary>
              <span className="target-symbol">
                <Telescope size={16} />
              </span>
              <strong>{target.name}</strong>
              <span>
                {target.direction} / {target.altitude}&deg;
              </span>
              <span className="target-state">
                {(target.altitude ?? -90) <= 0
                  ? "Below horizon"
                  : (target.altitude ?? 0) < 10
                    ? "Low horizon"
                    : daylight
                      ? "Sky too bright"
                      : "Above horizon"}
              </span>
            </summary>
            <div className="target-description">
              <p>{target.description}</p>
              <span>
                {target.equipment}. Local buildings, terrain and clouds may
                obstruct the view.
              </span>
            </div>
          </details>
        ))}
      </div>
      <p className="footnote">
        NASA/JPL Horizons API. Requested UTC: {astronomy.requestedUtc}. Response: {astronomy.receivedAt ?? "unavailable"}. Calculations, not telescope measurements.
      </p>
    </section>
  );
}

export function ModelLab({
  plans,
  priorities,
  onPriorities,
  feedback,
  learn,
  onLearn,
  onReset,
}: {
  plans: RankedPlan[];
  priorities: Priorities;
  onPriorities: (value: Priorities) => void;
  feedback: Feedback[];
  learn: boolean;
  onLearn: (value: boolean) => void;
  onReset: () => void;
}) {
  const model = trainPreferenceModel(feedback);
  const total = priorities.reduce((a, b) => a + b, 0) || 100;
  return (
    <div className="model-layout">
      <section className="model-controls">
        <span className="kicker">01 / Your priorities</span>
        <h2>What makes a good night?</h2>
        <div className="priority-sliders">
          {factorNames.map((name, i) => (
            <label className="priority-control" key={name}>
              <span>
                {name}
                <strong>{Math.round((priorities[i] / total) * 100)}%</strong>
              </span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={priorities[i]}
                onChange={(e) => {
                  const next = [...priorities] as Priorities;
                  next[i] = Number(e.target.value);
                  if (next.some(Boolean)) onPriorities(next);
                }}
              />
            </label>
          ))}
        </div>
        <div className="learning-setting">
          <label>
            <input
              type="checkbox"
              checked={learn}
              onChange={(e) => onLearn(e.target.checked)}
            />
            Learn from my ratings
          </label>
          <span>{feedback.length} rated locations on this device</span>
        </div>
        <button className="text-button" type="button" onClick={onReset}>
          <RotateCcw size={15} />
          Reset preferences and ratings
        </button>
      </section>
      <section className="model-explanation">
        <span className="kicker">02 / Explainable ranking</span>
        <h2>Every point has a reason.</h2>
        <div className="contribution-legend">
          {factorNames.map((name, i) => (
            <span key={name}>
              <i className={`factor-${i}`} />
              {name}
            </span>
          ))}
        </div>
        <div className="contribution-chart">
          {plans.map((plan) => (
            <div className="contribution-row" key={plan.id}>
              <span>{plan.name}</span>
              <div
                className="contribution-track"
                aria-label={`${plan.name}, baseline ${Math.round(plan.baseScore)} points`}
              >
                {plan.contributions.map((value, i) => (
                  <i
                    key={i}
                    className={`factor-${i}`}
                    style={{ width: `${value}%` }}
                    title={`${factorNames[i]}: ${value.toFixed(1)} points`}
                  />
                ))}
              </div>
              <strong>{Math.round(plan.baseScore)}</strong>
            </div>
          ))}
        </div>
        <details className="method-details">
          <summary>How the score is calculated</summary>
          <p>
            Four features are normalized to 0-1. Clear skies combines cloud
            cover (65%), rain chance (20%) and visibility (15%). Darkness uses
            the curated Bortle estimate. Travel favours shorter estimated
            journeys. Moonlight uses the illuminated fraction, without a
            moon-altitude correction.
          </p>
          <p>
            The baseline is the weighted sum, scaled to 100. A score is a
            preference match, not a probability of clear weather. Wind, access
            restrictions and astronomical darkness are shown separately and are
            not included in this score.
          </p>
        </details>
        <div className="learning-summary">
          <span className="kicker">03 / Preference learning</span>
          <h3>
            {feedback.length
              ? "Learning from your choices"
              : "Waiting for your first rating"}
          </h3>
          <p>
            A small logistic regression model learns from your helpful /
            not-for-me ratings. Its influence grows by 5% per rated location, up
            to 30%. It predicts preference, not observing success.
          </p>
          <div className="learned-factors">
            {factorNames.map((name, i) => (
              <span key={name}>
                {model.weights[i] >= 0 ? (
                  <ArrowUp size={14} />
                ) : (
                  <ArrowDown size={14} />
                )}
                {name}
                <strong>{model.weights[i].toFixed(2)}</strong>
              </span>
            ))}
          </div>
          <p className="footnote">
            {learn ? "Personalization is on." : "Personalization is off."}{" "}
            {feedback.length < 6
              ? "Early feedback: the learned model has limited evidence."
              : "Personal feedback only; no held-out accuracy evaluation."}{" "}
            Ratings stay in this browser.
          </p>
        </div>
      </section>
    </div>
  );
}

export function Comparison({
  plans,
  selected,
  onSelect,
  hour,
}: {
  plans: RankedPlan[];
  selected: string[];
  onSelect: (id: string) => void;
  hour: number;
}) {
  const comparison = plans.filter((p) => selected.includes(p.id));
  return (
    <section className="comparison-section">
      <div className="section-heading">
        <h2>Side by side</h2>
        <span>{comparison.length} of 3 locations</span>
      </div>
      <div className="comparison-picker">
        {plans.map((p) => (
          <label key={p.id}>
            <input
              type="checkbox"
              checked={selected.includes(p.id)}
              disabled={!selected.includes(p.id) && selected.length >= 3}
              onChange={() => onSelect(p.id)}
            />
            {p.name}
          </label>
        ))}
      </div>
      {!comparison.length ? (
        <p className="empty-state">
          Choose up to three locations to compare their conditions.
        </p>
      ) : (
        <div className="table-scroll">
          <table className="comparison-table">
            <caption className="sr-only">Observing location comparison</caption>
            <thead>
              <tr>
                <th scope="col">At the selected hour</th>
                {comparison.map((p) => (
                  <th key={p.id} scope="col">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Match score", (p: RankedPlan) => `${p.score} / 100`],
                [
                  "Cloud cover",
                  (p: RankedPlan) =>
                    `${(p.weather.hourly[hour] ?? p.weather).cloudCover}%`,
                ],
                [
                  "Rain chance",
                  (p: RankedPlan) =>
                    `${(p.weather.hourly[hour] ?? p.weather).precipitationChance}%`,
                ],
                [
                  "Travel estimate",
                  (p: RankedPlan) => formatMinutes(p.travelTimeMinutes),
                ],
                [
                  "Sky darkness (estimated)",
                  (p: RankedPlan) => `Bortle ${p.bortleRating} / 9`,
                ],
                [
                  "Weather source",
                  (p: RankedPlan) =>
                    "Open-Meteo forecast",
                ],
                ["Access", (p: RankedPlan) => p.accessNotes],
              ].map(([label, render]) => (
                <tr key={label as string}>
                  <th scope="row">{label as string}</th>
                  {comparison.map((p) => (
                    <td key={p.id}>
                      {(render as (p: RankedPlan) => string)(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

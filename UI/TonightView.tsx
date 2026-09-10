"use client";

import { useEffect, useMemo, useState } from "react";
import { m, useReducedMotion } from "motion/react";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { Hint } from "./Hint";
import { TransientEvents } from "./TransientEvents";
import { ObservingLists } from "./ObservingLists";
import { astrophotographyGuide, objectRecommendation } from "@/data/object-recommendations";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Moon,
  Telescope,
  Play,
  Pause,
} from "lucide-react";
import { getAstronomySummary } from "@/lib/astronomy";
import { formatClock } from "@/lib/format";
import type { RankedPlan } from "@/lib/recommender";
import type { TargetId } from "@/lib/observation-model";

// The next position arrives just before the prior interpolation completes, so
// playback is slower but the sky diagram never visibly settles between steps.
const skyTimelineStepMs = 900;
const skyMarkerTransitionSeconds = 1.1;

export function TonightView({
  time,
  latitude,
  longitude,
  location,
  plan,
  hour,
  onHour,
  onObserve,
}: {
  time: string;
  latitude: number;
  longitude: number;
  location: string;
  plan?: RankedPlan;
  hour: number;
  onHour: (value: number) => void;
  onObserve: (target: TargetId) => void;
}) {
  const [active, setActive] = useState("saturn");
  const [viewMode, setViewMode] = useState<"observer" | "astronomer">(
    "observer",
  );
  const [playing, setPlaying] = useState(false);
  const reducedMotion = useReducedMotion();
  const hourCount = plan?.weather.hourly.length ?? 0;
  const selectHour = (value: number) => {
    setPlaying(false);
    onHour(Math.max(0, Math.min(hourCount - 1, value)));
  };
  useEffect(() => {
    if (!playing) return;
    if (hour >= hourCount - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(
      () => onHour(hour + 1),
      skyTimelineStepMs,
    );
    return () => window.clearTimeout(timer);
  }, [playing, hour, hourCount, onHour]);
  useEffect(() => {
    setPlaying(false);
  }, [plan?.id, plan?.weather.hourly]);
  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () =>
      document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);
  const astronomy = useMemo(
    () => (time ? getAstronomySummary(time, latitude, longitude) : null),
    [time, latitude, longitude],
  );
  const saturn = astronomy?.highlights.find((target) => target.id === "saturn");
  const target = astronomy?.highlights.find((item) => item.id === active);
  const aurora = astronomy?.aurora;
  return (
    <div className="tonight-page">
      <section className="sky-feature">
        {/* A credited spacecraft image, separate from the calculated local sky diagram. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="saturn-photograph"
          src="https://science.nasa.gov/wp-content/uploads/2023/05/saturn-farewell-pia21345-sse-banner-1920x640-1.jpg?w=1536"
          alt="Saturn and its rings photographed by NASA's Cassini spacecraft"
          fetchPriority="high"
        />
        <div className="sky-feature-copy">
          <span className="feature-eyebrow">LOOK UP / NEW SOUTH WALES</span>
          <h1>Tonight's sky.</h1>
          <p className="feature-intro">
            The Moon and planets,
            <br />
            above {location}.
          </p>
          <div className="featured-object">
            <span>IN FOCUS</span>
            <h2>Saturn</h2>
            <p>
              {saturn
                ? `${Math.round(saturn.altitude ?? 0)}° altitude · ${saturn.direction} · ${(saturn.altitude ?? 0) <= 0 ? "Below the horizon at this hour" : (astronomy?.sunAltitude ?? 0) >= 0 ? "Daytime at this location" : "Above the horizon at this hour"}`
                : "Calculating your local sky..."}
            </p>
          </div>
          <button
            className="feature-cta"
            type="button"
            onClick={() => onObserve("saturn")}
          >
            Check my view <ArrowRight size={19} />
          </button>
        </div>
        <div className="feature-caption">
          <a
            href="https://science.nasa.gov/saturn/"
            target="_blank"
            rel="noreferrer"
          >
            Cassini image / NASA, JPL-Caltech, SSI
          </a>
          <span>Spacecraft view, not an eyepiece view</span>
        </div>
        <a className="sky-scroll" href="#sky-position">
          Your sky, at a glance <ArrowDown size={16} />
        </a>
      </section>

      <section className="sky-position-section" id="sky-position">
        <div className="section-intro">
          <div>
            <span className="kicker">
              THE VIEW FROM {location.toUpperCase()}
            </span>
            <h2>Where to look.</h2>
          </div>
          {plan && (
            <label className="sky-hour-label">
              Sydney time
              <select
                value={hour}
                onChange={(e) => {
                  selectHour(Number(e.target.value));
                }}
              >
                {plan.weather.hourly.map((point, index) => (
                  <option key={point.time} value={index}>
                    {formatClock(point.time)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="sky-position-layout">
          <div className="horizon-chart">
            <svg
              viewBox="0 0 800 350"
              role="group"
              aria-label="Calculated altitude and compass direction of the Moon and planets above the horizon"
            >
              {[0, 30, 60, 90].map((alt) => (
                <g key={alt}>
                  <line
                    x1="45"
                    x2="770"
                    y1={300 - alt * 2.8}
                    y2={300 - alt * 2.8}
                    stroke={alt === 0 ? "#91b1a0" : "#303c40"}
                    strokeDasharray={alt === 0 ? undefined : "3 7"}
                  />
                  <text x="6" y={305 - alt * 2.8} fill="#aab5b8" fontSize="13">
                    {alt}°
                  </text>
                </g>
              ))}
              {["N", "E", "S", "W", "N"].map((direction, i) => (
                <text
                  key={i}
                  x={45 + i * 181.25}
                  y="333"
                  textAnchor="middle"
                  fill="#aab5b8"
                  fontSize="14"
                >
                  {direction}
                </text>
              ))}
              {astronomy?.highlights
                .filter((item) => (item.altitude ?? -90) > 0)
                .map((item) => {
                  const x = 45 + ((item.azimuth ?? 0) / 360) * 725,
                    y = 300 - (item.altitude ?? 0) * 2.8;
                  return (
                    <m.g
                      key={item.id}
                      className="sky-chart-marker"
                      role="button"
                      tabIndex={0}
                      aria-label={`Select ${item.name}, ${Math.round(item.altitude ?? 0)} degrees above the horizon`}
                      aria-pressed={active === item.id}
                      onClick={() => setActive(item.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setActive(item.id);
                        }
                      }}
                      initial={false}
                      animate={{ x, y }}
                      transition={{
                        duration: reducedMotion ? 0 : skyMarkerTransitionSeconds,
                        ease: "linear",
                      }}
                    >
                      <circle
                        className="marker-hit"
                        r="22"
                        fill="transparent"
                      />
                      <circle
                        r={active === item.id ? 8 : 5}
                        fill={active === item.id ? "#eed8a0" : "#e2e9e6"}
                      />
                      {active === item.id && (
                        <text
                          x={Math.max(78, Math.min(725, x)) - x}
                          y={-26}
                          textAnchor="middle"
                          fill="#f5f7f6"
                          fontSize="15"
                        >
                          {item.name}
                        </text>
                      )}
                    </m.g>
                  );
                })}
            </svg>
            {hourCount > 1 && (
              <div className="sky-chart-controls">
                <Hint
                  label={playing ? "Pause sky timeline" : "Play sky timeline"}
                >
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={
                      playing ? "Pause sky timeline" : "Play sky timeline"
                    }
                    aria-pressed={playing}
                    onClick={() => {
                      if (!playing && hour >= hourCount - 1) onHour(0);
                      setPlaying((value) => !value);
                    }}
                  >
                    {playing ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                </Hint>
                <label>
                  <span className="sr-only">Observing hour</span>
                  <input
                    type="range"
                    min={0}
                    max={hourCount - 1}
                    step={1}
                    value={hour}
                    aria-valuetext={
                      plan ? formatClock(plan.weather.hourly[hour].time) : ""
                    }
                    onChange={(event) => selectHour(Number(event.target.value))}
                    onWheel={(event) => {
                      if (!event.deltaX && !event.deltaY) return;
                      event.preventDefault();
                      // A leftward horizontal gesture always moves to an
                      // earlier hour; vertical-wheel fallbacks retain that
                      // same, unsurprising direction.
                      const delta = event.deltaX || event.deltaY;
                      selectHour(hour + (delta > 0 ? 1 : -1));
                    }}
                  />
                </label>
                <div className="sky-time-navigation">
                  <Hint label="Show the previous hour">
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Show the previous hour"
                      disabled={hour === 0}
                      onClick={() => selectHour(hour - 1)}
                    >
                      <ChevronLeft size={18} />
                    </button>
                  </Hint>
                  <output className="sky-time-output">
                    {plan ? formatClock(plan.weather.hourly[hour].time) : ""}
                  </output>
                  <Hint label="Show the next hour">
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Show the next hour"
                      disabled={hour >= hourCount - 1}
                      onClick={() => selectHour(hour + 1)}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </Hint>
                </div>
              </div>
            )}
            <p>Calculated positions / flat horizon / Moon and planets only</p>
            <div className="horizon-obstruction" role="note">
              <strong>Horizon obstruction</strong>
              <span>
                Trees, hills, buildings, and other obstacles can hide an object
                even when it is technically above the horizon.
              </span>
            </div>
            {aurora && (
              <div className="aurora-outlook horizon-aurora">
                <span>Aurora outlook / {aurora.direction}</span>
                <strong>
                  {aurora.visibility} · {aurora.potential} potential
                </strong>
                <p>{aurora.description}</p>
              </div>
            )}
          </div>
          <div className="sky-target-detail">
            <ToggleGroup.Root
              type="single"
              value={viewMode}
              onValueChange={(value) => {
                if (value === "observer" || value === "astronomer") {
                  setViewMode(value);
                }
              }}
              className="view-mode-toggle"
              aria-label="Viewing mode"
            >
              <ToggleGroup.Item value="observer">Observer</ToggleGroup.Item>
              <ToggleGroup.Item value="astronomer">Astronomer</ToggleGroup.Item>
            </ToggleGroup.Root>
            <ToggleGroup.Root
              type="single"
              value={active}
              onValueChange={(value) => {
                if (value) setActive(value);
              }}
              className="sky-target-picker"
              aria-label="Choose a sky object"
            >
              {astronomy?.highlights.map((item) => (
                <ToggleGroup.Item key={item.id} type="button" value={item.id}>
                  {item.name}
                </ToggleGroup.Item>
              ))}
            </ToggleGroup.Root>
            <m.div
              className="sky-target-detail-inner"
              key={active}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reducedMotion ? 0 : 0.2 }}
            >
              <h3>{target?.name ?? "Your local sky"}</h3>
              <span className="target-altitude">
                {target
                  ? `${Math.round(target.altitude ?? 0)}° ${target.direction}`
                  : "Calculating..."}
              </span>
              <p>{target?.description}</p>
              {target && <ObjectRecommendations targetId={target.id as TargetId} />}
              {target && (
                <p className="sky-target-state">
                  {(target.altitude ?? 0) <= 0
                    ? "Below the horizon at the selected time."
                    : (astronomy?.sunAltitude ?? 0) >= 0
                      ? "The Sun is up. This planner supports nighttime observing."
                      : "Above the horizon. Clouds and local obstructions may affect the view."}
                </p>
              )}
              {viewMode === "astronomer" && target?.technical && (
                <TechnicalDetails target={target} />
              )}
              {target && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => onObserve(target.id as TargetId)}
                >
                  Check with my equipment <ArrowRight size={17} />
                </button>
              )}
            </m.div>
          </div>
        </div>
        {time && <TransientEvents time={time} latitude={latitude} longitude={longitude} mode={viewMode} />}
        <ObservingLists selectedTarget={active as TargetId} />
      </section>

      <section className="tonight-next">
        <div>
          <span className="kicker">MAKE A NIGHT OF IT</span>
          <h2>
            A good view starts
            <br />
            with a good place.
          </h2>
          <p>
            Find a nearby lookout, check its forecast, and leave room for the
            unexpected.
          </p>
          <Link href="/places" className="text-button">
            Find an observing spot <ArrowRight size={18} />
          </Link>
        </div>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://science.nasa.gov/wp-content/uploads/2023/07/star-trails-at-alabama-hills-credit-nasa-preston-dyches-cc-by-nc-2.0.jpg?w=768"
            alt="Star trails above the Alabama Hills, an illustration of long-exposure skywatching rather than a local NSW site"
            loading="lazy"
          />
          <figcaption>
            Alabama Hills / NASA, Preston Dyches / CC BY-NC 2.0
          </figcaption>
        </figure>
      </section>
      <section className="sky-reading">
        <div className="section-intro">
          <div>
            <span className="kicker">A LITTLE FIELD KNOWLEDGE</span>
            <h2>Before you head out.</h2>
          </div>
          <a
            href="https://science.nasa.gov/skywatching/"
            target="_blank"
            rel="noreferrer"
          >
            NASA skywatching <ExternalLink size={15} />
          </a>
        </div>
        <div className="reading-links">
          <a
            href="https://science.nasa.gov/moon/daily-moon-guide/"
            target="_blank"
            rel="noreferrer"
          >
            <Moon size={24} />
            <span>01 / THE MOON</span>
            <h3>Know the Moon.</h3>
            <p>Explore NASA's daily lunar guide.</p>
            <ArrowRight size={20} />
          </a>
          <a
            href="https://science.nasa.gov/skywatching/tips-guides/"
            target="_blank"
            rel="noreferrer"
          >
            <Telescope size={24} />
            <span>02 / GETTING STARTED</span>
            <h3>Find your first view.</h3>
            <p>Practical observing guides from NASA.</p>
            <ArrowRight size={20} />
          </a>
          <a
            href="https://stellarium-web.org/"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={24} />
            <span>03 / EXPLORE FURTHER</span>
            <h3>Go deeper into the sky.</h3>
            <p>Open Stellarium's interactive planetarium.</p>
            <ArrowRight size={20} />
          </a>
        </div>
      </section>
    </div>
  );
}

function TechnicalDetails({
  target,
}: {
  target: NonNullable<ReturnType<typeof getAstronomySummary>>["highlights"][number];
}) {
  const details = target.technical;
  if (!details) return null;
  return (
    <dl className="technical-details">
      <div><dt>Altitude</dt><dd>{formatDegrees(target.altitude)}</dd></div>
      <div><dt>Azimuth</dt><dd>{formatDegrees(target.azimuth)}</dd></div>
      <div><dt>RA / Dec</dt><dd>{formatRa(details.rightAscension)} / {formatSignedDegrees(details.declination)}</dd></div>
      <div><dt>Magnitude</dt><dd>{target.magnitude?.toFixed(1) ?? "—"}</dd></div>
      <div><dt>Angular separation (Sun)</dt><dd>{formatDegrees(details.sunSeparation)}</dd></div>
      <div><dt>Constellation</dt><dd>{details.constellation}</dd></div>
      <div><dt>Rise / transit / set</dt><dd>{details.rise} / {details.transit} / {details.set}</dd></div>
      <div><dt>Object type</dt><dd>{objectType(target.type)}</dd></div>
      <div><dt>Visibility</dt><dd>{details.visibility}</dd></div>
      <div><dt>Airmass</dt><dd>{details.airmass?.toFixed(2) ?? "Below horizon"}</dd></div>
      <div><dt>Moon separation</dt><dd>{formatDegrees(details.moonSeparation)}</dd></div>
    </dl>
  );
}

function formatDegrees(value: number | undefined) {
  return value === undefined ? "—" : `${Math.round(value)}°`;
}

function formatSignedDegrees(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}°`;
}

function formatRa(hours: number) {
  const roundedMinutes = Math.round(hours * 60);
  return `${Math.floor(roundedMinutes / 60) % 24}h ${roundedMinutes % 60}m`;
}

function objectType(type: string) {
  return type === "deep-sky" ? "Deep-sky object" : type[0].toUpperCase() + type.slice(1);
}

function ObjectRecommendations({ targetId }: { targetId: TargetId }) {
  const recommendation = objectRecommendation(targetId);
  return <div className="object-recommendations">
    {recommendation.beginner && <p><strong> Beginner friendly</strong> {recommendation.beginner}</p>}
    <p><strong> Astrophotography: {recommendation.photography}</strong> {recommendation.photographyNote} <a href={astrophotographyGuide} target="_blank" rel="noreferrer">NASA guide</a></p>
  </div>;
}

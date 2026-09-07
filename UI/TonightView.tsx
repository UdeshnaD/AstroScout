"use client";

import { useEffect, useMemo, useState } from "react";
import { m, useReducedMotion } from "motion/react";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { Hint } from "./Hint";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
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
  const [playing, setPlaying] = useState(false);
  const reducedMotion = useReducedMotion();
  const hourCount = plan?.weather.hourly.length ?? 0;
  useEffect(() => {
    if (!playing) return;
    if (hour >= hourCount - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => onHour(hour + 1), 1800);
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
                  setPlaying(false);
                  onHour(Number(e.target.value));
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
                        duration: reducedMotion ? 0 : 0.45,
                        ease: "easeInOut",
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
                    onChange={(event) => {
                      setPlaying(false);
                      onHour(Number(event.target.value));
                    }}
                  />
                </label>
                <output className="sky-time-output">
                  {plan ? formatClock(plan.weather.hourly[hour].time) : ""}
                </output>
              </div>
            )}
            <p>Calculated positions / flat horizon / Moon and planets only</p>
          </div>
          <div className="sky-target-detail">
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
              {target && (
                <p className="sky-target-state">
                  {(target.altitude ?? 0) <= 0
                    ? "Below the horizon at the selected time."
                    : (astronomy?.sunAltitude ?? 0) >= 0
                      ? "The Sun is up. This planner supports nighttime observing."
                      : "Above the horizon. Clouds and local obstructions may affect the view."}
                </p>
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

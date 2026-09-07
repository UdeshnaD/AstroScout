"use client";

import { useEffect, useMemo, useState } from "react";
import { m, useReducedMotion } from "motion/react";
import { Hint } from "./Hint";
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  ExternalLink,
  CalendarDays,
} from "lucide-react";
import { SearchMoonQuarter, NextMoonQuarter, Seasons } from "astronomy-engine";

type SkyEvent = {
  time: string;
  title: string;
  kind: "moon" | "season";
  description: string;
};
const keyFor = (time: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(time));

export function calendarEvents(year: number, month: number): SkyEvent[] {
  const start = new Date(Date.UTC(year, month, 1) - 12 * 3600000);
  const end = new Date(Date.UTC(year, month + 1, 1) + 12 * 3600000);
  let quarter = SearchMoonQuarter(start);
  const rows: SkyEvent[] = [];
  const names = ["New Moon", "First quarter", "Full Moon", "Last quarter"];
  while (quarter.time.date < end) {
    rows.push({
      time: quarter.time.date.toISOString(),
      title: names[quarter.quarter],
      kind: "moon",
      description:
        quarter.quarter === 0
          ? "The lunar phase associated with the least moonlight. Weather and darkness still determine your view."
          : quarter.quarter === 2
            ? "The Moon reaches its full phase. Bright moonlight can reduce contrast for faint objects."
            : "A half-lit Moon. The boundary between light and shadow highlights lunar relief.",
    });
    quarter = NextMoonQuarter(quarter);
  }
  const seasons = Seasons(year);
  [
    [seasons.mar_equinox, "March equinox"],
    [seasons.jun_solstice, "June solstice"],
    [seasons.sep_equinox, "September equinox"],
    [seasons.dec_solstice, "December solstice"],
  ].forEach(([instant, title]) => {
    rows.push({
      time: (instant as typeof seasons.mar_equinox).date.toISOString(),
      title: title as string,
      kind: "season",
      description:
        "A seasonal milestone in Earth's orbit. This is a calculated instant, not a local observing event.",
    });
  });
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  return rows
    .filter((event) => keyFor(event.time).startsWith(prefix))
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function CalendarView() {
  const [month, setMonth] = useState<{ year: number; month: number }>();
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [today, setToday] = useState("");
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const day = keyFor(new Date().toISOString());
    setToday(day);
    const parts = day.split("-").map(Number);
    setMonth({ year: parts[0], month: parts[1] - 1 });
  }, []);
  const events = useMemo(
    () => (month ? calendarEvents(month.year, month.month) : []),
    [month],
  );
  if (!month)
    return (
      <p className="calendar-loading">Calculating this month's sky events...</p>
    );
  const changeMonth = (delta: number) => {
    const date = new Date(Date.UTC(month.year, month.month + delta));
    setMonth({ year: date.getUTCFullYear(), month: date.getUTCMonth() });
    setSelected(null);
  };
  const count = new Date(Date.UTC(month.year, month.month + 1, 0)).getUTCDate();
  const offset =
    (new Date(Date.UTC(month.year, month.month, 1)).getUTCDay() + 6) % 7;
  const visible = events.filter(
    (event) =>
      (filter === "all" || event.kind === filter) &&
      (!selected || keyFor(event.time) === selected),
  );
  return (
    <section className="calendar-page">
      <div className="calendar-toolbar">
        <div className="month-navigation">
          <button
            type="button"
            className="icon-button"
            title="Previous month"
            aria-label="Previous month"
            disabled={month.year <= 1900 && month.month === 0}
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="calendar-month-title" aria-live="polite">
            {new Intl.DateTimeFormat("en-AU", {
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            }).format(new Date(Date.UTC(month.year, month.month)))}
          </h2>
          <button
            type="button"
            className="icon-button"
            title="Next month"
            aria-label="Next month"
            disabled={month.year >= 2100 && month.month === 11}
            onClick={() => changeMonth(1)}
          >
            <ChevronRight size={20} />
          </button>
          <Hint label="Return to the current month">
            <button
              className="calendar-today-button"
              type="button"
              onClick={() => {
                const day = keyFor(new Date().toISOString());
                const parts = day.split("-").map(Number);
                setToday(day);
                setMonth({ year: parts[0], month: parts[1] - 1 });
                setSelected(null);
              }}
            >
              <CalendarDays size={17} />
              <span>Today</span>
            </button>
          </Hint>
        </div>
        <label>
          Show
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setSelected(null);
            }}
          >
            <option value="all">All events</option>
            <option value="moon">Moon phases</option>
            <option value="season">Equinoxes & solstices</option>
          </select>
        </label>
      </div>
      <div className="calendar-layout">
        <div>
          <div className="calendar-grid calendar-weekdays">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <m.div
            key={`${month.year}-${month.month}`}
            className="calendar-grid"
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
          >
            {Array.from({ length: offset }, (_, i) => (
              <div key={`blank-${i}`} className="calendar-blank" />
            ))}
            {Array.from({ length: count }, (_, i) => {
              const key = `${month.year}-${String(month.month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
              const dayEvents = events.filter(
                (event) =>
                  keyFor(event.time) === key &&
                  (filter === "all" || event.kind === filter),
              );
              return (
                <button
                  className={`calendar-day ${dayEvents.length ? "has-event" : ""}`}
                  type="button"
                  key={key}
                  data-calendar-day={i + 1}
                  aria-current={today === key ? "date" : undefined}
                  aria-pressed={selected === key}
                  aria-label={`${key}${dayEvents.length ? `: ${dayEvents.map((event) => event.title).join(", ")}` : ": no listed events"}`}
                  onClick={() => setSelected(selected === key ? null : key)}
                  onKeyDown={(event) => {
                    const weekday = (i + offset) % 7;
                    const step = {
                      ArrowLeft: -1,
                      ArrowRight: 1,
                      ArrowUp: -7,
                      ArrowDown: 7,
                      Home: -weekday,
                      End: 6 - weekday,
                    }[event.key];
                    if (step === undefined) return;
                    event.preventDefault();
                    const next = Math.max(1, Math.min(count, i + 1 + step));
                    event.currentTarget.parentElement
                      ?.querySelector<HTMLButtonElement>(
                        `[data-calendar-day="${next}"]`,
                      )
                      ?.focus();
                  }}
                >
                  <span>{i + 1}</span>
                  {dayEvents.map((event) => (
                    <small key={event.title}>
                      {event.kind === "moon" ? (
                        <Moon size={14} />
                      ) : (
                        <Sun size={14} />
                      )}
                      <span>{event.title}</span>
                    </small>
                  ))}
                </button>
              );
            })}
          </m.div>
          <p className="footnote">
            Calculated with Astronomy Engine. Times in Australia/Sydney. No
            local event listings or meteor-shower feed.
          </p>
        </div>
        <aside className="calendar-agenda">
          <div className="section-heading">
            <h3>{selected ? "Selected date" : "This month"}</h3>
            {selected && (
              <button
                className="text-button"
                type="button"
                onClick={() => setSelected(null)}
              >
                Show all
              </button>
            )}
          </div>
          {!visible.length && (
            <p>
              No {filter === "all" ? "listed events" : "matching events"} for
              this selection.
            </p>
          )}
          {visible.map((event) => (
            <article key={event.time}>
              <time dateTime={event.time}>
                <strong>{keyFor(event.time).slice(-2)}</strong>
                <span>{event.kind === "moon" ? "MOON" : "SEASON"}</span>
              </time>
              <div>
                <h3>{event.title}</h3>
                <span>
                  {new Intl.DateTimeFormat("en-AU", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "Australia/Sydney",
                  }).format(new Date(event.time))}
                </span>
                <p>{event.description}</p>
              </div>
            </article>
          ))}
        </aside>
      </div>
      <div className="calendar-source">
        <p>For meteor showers and wider skywatching highlights</p>
        <a
          className="text-button"
          href="https://science.nasa.gov/skywatching/whats-up/"
          target="_blank"
          rel="noreferrer"
        >
          NASA's monthly guide <ExternalLink size={16} />
        </a>
      </div>
    </section>
  );
}

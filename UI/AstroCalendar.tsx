"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Moon, Sparkles, Sun } from "lucide-react";
import { moonCalendarEvents } from "@/lib/moonPhases";

const sydneyDay = (time: string) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date(time));

export function AstroCalendar({ onSelect }: { onSelect: (utc: string) => void }) {
  const now = new Date();
  const [cursor, setCursor] = useState(() => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
  const [selected, setSelected] = useState<string>();
  const events = useMemo(() => moonCalendarEvents(cursor.getUTCFullYear(), cursor.getUTCMonth()), [cursor]);
  const days = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)).getUTCDate();
  const offset = cursor.getUTCDay();

  return <section className="astro-calendar">
    <div className="event-section-heading">
      <div><p className="event-kicker">CHOOSE A NIGHT</p><h2>What’s coming up</h2><p>Pick a date to explore its Moon phase and listed sky events. All times below are Sydney time.</p></div>
      <div className="astro-calendar__nav">
        <button aria-label="Previous month" onClick={() => { setSelected(undefined); setCursor(new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - 1, 1))); }}><ChevronLeft size={18} /></button>
        <strong>{cursor.toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" })}</strong>
        <button aria-label="Next month" onClick={() => { setSelected(undefined); setCursor(new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))); }}><ChevronRight size={18} /></button>
      </div>
    </div>
    <div className="astro-calendar__layout">
      <div className="astro-calendar__grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <b key={day}>{day}</b>)}
        {Array.from({ length: offset }, (_, index) => <i key={`blank-${index}`} />)}
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1;
          const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const listed = events.filter((event) => sydneyDay(event.time) === key);
          return <button key={key} className={listed.length ? "has-event" : ""} aria-label={`${day} ${cursor.toLocaleDateString('en-AU', { month: 'long', timeZone: 'UTC' })}${listed.length ? ': ' + listed.map((event) => event.title).join(', ') : ', no listed events'}`} aria-current={key === sydneyDay(now.toISOString()) ? "date" : undefined} aria-pressed={selected === key} onClick={() => { setSelected(selected === key ? undefined : key); if (listed[0]) onSelect(listed[0].time); }}>
            <span>{day}</span>
            {listed.map((event) => <small key={event.title}>{event.kind === "moon" ? <Moon size={13} /> : event.kind === "season" ? <Sun size={13} /> : <Sparkles size={13} />}{event.title}</small>)}
          </button>;
        })}
      </div>
      <aside><div className="calendar-agenda-heading"><h3>{selected ? 'On this date' : 'This month'}</h3>{selected && <button type="button" onClick={() => setSelected(undefined)}>Show all events</button>}</div>{selected && !events.some((event) => sydneyDay(event.time) === selected) && <p className="calendar-empty">No special event is listed for this date. You can still plan a regular observing night from Tonight.</p>}{events.filter((event) => !selected || sydneyDay(event.time) === selected).map((event) => <article key={event.time}>
        <time>{new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(event.time))}</time>
        <h3>{event.title}</h3><p>{event.description}</p><button type="button" className="event-secondary" onClick={() => onSelect(event.time)}>Use this event time</button>
      </article>)}</aside>
    </div>
    <p className="event-footnote">Moon phases and seasons are calculated with Astronomy Engine. 2026 event dates are references from NASA and should be checked against local visibility. <a href="https://www.nasa.gov/blogs/watch-the-skies/2026/01/16/most-notable-2026-astronomical-events-a-year-of-watching-the-skies/" target="_blank" rel="noreferrer">NASA 2026 sky events <ExternalLink size={13} /></a></p>
  </section>;
}

"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Moon, Sun } from "lucide-react";
import { moonCalendarEvents } from "@/lib/moonPhases";

const sydneyDay = (time: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(time));

export function AstroCalendar({ onSelect }: { onSelect: (utc: string) => void }) {
  const now = new Date();
  const [cursor, setCursor] = useState(() => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
  const [selected, setSelected] = useState<string>();
  const events = useMemo(() => moonCalendarEvents(cursor.getUTCFullYear(), cursor.getUTCMonth()), [cursor]);
  const days = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)).getUTCDate();
  const offset = cursor.getUTCDay();
  return <section className="astro-calendar">
    <div className="event-section-heading"><div><p className="event-kicker">CALCULATED SKY EVENTS</p><h2>Moon phases and seasons</h2><p>Exact times are shown in Australia/Sydney time.</p></div><div className="astro-calendar__nav"><button aria-label="Previous month" onClick={() => setCursor(new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - 1, 1)))}><ChevronLeft size={18}/></button><strong>{cursor.toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" })}</strong><button aria-label="Next month" onClick={() => setCursor(new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1)))}><ChevronRight size={18}/></button></div></div>
    <div className="astro-calendar__layout"><div className="astro-calendar__grid">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <b key={d}>{d}</b>)}{Array.from({length: offset}, (_, i) => <i key={`blank-${i}`}/>) }{Array.from({length: days}, (_, i) => { const day = i + 1; const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth()+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`; const listed = events.filter((event) => sydneyDay(event.time) === key); return <button key={key} className={listed.length ? "has-event" : ""} aria-pressed={selected === key} onClick={() => { setSelected(selected === key ? undefined : key); if (listed[0]) onSelect(listed[0].time); }}><span>{day}</span>{listed.map((event) => <small key={event.title}>{event.kind === "moon" ? <Moon size={13}/> : <Sun size={13}/>} {event.title}</small>)}</button>; })}</div><aside>{events.filter((event) => !selected || sydneyDay(event.time) === selected).map((event) => <article key={event.time}><time>{new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(event.time))}</time><h3>{event.title}</h3><p>{event.description}</p></article>)}</aside></div>
    <p className="event-footnote">Calculated with Astronomy Engine. <a href="https://science.nasa.gov/skywatching/whats-up/" target="_blank" rel="noreferrer">NASA's monthly skywatching guide <ExternalLink size={13}/></a></p>
  </section>;
}

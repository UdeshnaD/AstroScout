"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
export function CalendarView({
  utc = new Date().toISOString(),
  onSelect,
}: {
  utc?: string;
  onSelect?: (utc: string) => void;
}) {
  const [offset, setOffset] = useState(0);
  const selected = new Date(utc || Date.now());
  const first = new Date(
    Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth() + offset, 1),
  );
  const days = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return (
    <section className="jpl-calendar">
      <div className="event-section-heading">
        <h2>Choose an observing date</h2>
        <div>
          <button
            aria-label="Previous month"
            onClick={() => setOffset(offset - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <strong>
            {first.toLocaleDateString("en-AU", {
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </strong>
          <button aria-label="Next month" onClick={() => setOffset(offset + 1)}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <p>UTC calendar dates / NASA/JPL night planning</p>
      <div className="jpl-date-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day}>{day}</span>
        ))}
        {Array.from({ length: first.getUTCDay() }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => (
          <button
            key={i}
            aria-pressed={offset === 0 && selected.getUTCDate() === i + 1}
            onClick={() => {
              const date = new Date(first);
              date.setUTCDate(i + 1);
              date.setUTCHours(
                selected.getUTCHours(),
                selected.getUTCMinutes(),
                selected.getUTCSeconds(),
                selected.getUTCMilliseconds(),
              );
              setOffset(0);
              onSelect?.(date.toISOString());
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </section>
  );
}

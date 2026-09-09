import { Moon, Telescope } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatPercent } from "@/lib/format";
import Link from "next/link";
import { skyState } from "@/lib/horizons-analysis";
import type { AstronomySummary } from "@/types/astronomy";
import type { ObservingSpot } from "@/types/spot";

type ViewingGuideProps = {
  astronomy: AstronomySummary;
  spot: ObservingSpot;
};

export function ViewingGuide({ astronomy, spot }: ViewingGuideProps) {
  return (
    <Card>
      <div className="section-title">
        <Telescope size={18} aria-hidden="true" />
        <h2>Viewing Guide</h2>
      </div>
      <p className="data-note">
        NASA/JPL Horizons API: calculated positions, not telescope measurements.
        Requested UTC: {astronomy.requestedUtc}. Response received: {astronomy.receivedAt ?? "NASA/JPL data unavailable"}.
        Observer: {spot.latitude}, {spot.longitude}; elevation 0 m (default).
      </p>
      <div className="fact-grid">
        <div>
          <Moon size={18} aria-hidden="true" />
          <span>{astronomy.moonPhase}</span>
          <strong>{formatPercent(astronomy.moonIllumination)} lit</strong>
        </div>
        <div>
          <Telescope size={18} aria-hidden="true" />
          <span>Calculated Sun state</span>
          <strong>{skyState(astronomy.sunAltitude)}</strong>
        </div>
      </div>

      <div className="guide-block">
        <h3>What to look for</h3>
        {!astronomy.highlights.length && <p>NASA/JPL data unavailable</p>}
        <ul>
          {astronomy.highlights.map((highlight) => (
            <li key={highlight.id}>
              <strong>{highlight.name}</strong>
              <span>
                {highlight.direction} / {highlight.altitude} degrees /{" "}
                {(highlight.altitude ?? -90) > 0
                  ? "Above horizon"
                  : "Below horizon"}
              </span>
              <span>{highlight.description}</span>
              <span>RA {highlight.rightAscension ?? "unavailable"}° / Dec {highlight.declination ?? "unavailable"}° / magnitude {highlight.magnitude ?? "unavailable"} / illumination {highlight.illumination ?? "unavailable"}%</span>
              <small>JPL response: {highlight.receivedAt ?? "unavailable"} / epoch {astronomy.requestedUtc}</small>
            </li>
          ))}
        </ul>
      </div>

      <Link href={`/planner?lat=${spot.latitude}&lon=${spot.longitude}&elevation=0&utc=${encodeURIComponent(astronomy.requestedUtc)}`}>Open this location in the JPL night planner</Link>
      <div className="guide-block">
        <h3>Site notes</h3>
        <p>{spot.horizonNotes}</p>
        <p>{spot.accessNotes}</p>
        <p>{spot.safetyNotes}</p>
      </div>
    </Card>
  );
}

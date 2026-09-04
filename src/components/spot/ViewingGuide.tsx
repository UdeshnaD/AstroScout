import { Moon, Telescope } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatPercent } from "@/lib/format";
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
      <div className="fact-grid">
        <div>
          <Moon size={18} aria-hidden="true" />
          <span>{astronomy.moonPhase}</span>
          <strong>{formatPercent(astronomy.moonIllumination)} lit</strong>
        </div>
        <div>
          <Telescope size={18} aria-hidden="true" />
          <span>Best window</span>
          <strong>{astronomy.bestViewingWindow}</strong>
        </div>
      </div>

      <div className="guide-block">
        <h3>What to look for</h3>
        <ul>
          {astronomy.highlights.map((highlight) => (
            <li key={highlight.id}>
              <strong>{highlight.name}</strong>
              <span>{highlight.description}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="guide-block">
        <h3>Site notes</h3>
        <p>{spot.horizonNotes}</p>
        <p>{spot.accessNotes}</p>
        <p>{spot.safetyNotes}</p>
      </div>
    </Card>
  );
}

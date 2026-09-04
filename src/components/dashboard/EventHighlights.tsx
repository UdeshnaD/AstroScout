import { Compass, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { NightSkyHighlight } from "@/types/astronomy";

type EventHighlightsProps = {
  highlights: NightSkyHighlight[];
};

export function EventHighlights({ highlights }: EventHighlightsProps) {
  return (
    <Card>
      <div className="section-title">
        <Sparkles size={18} aria-hidden="true" />
        <h2>Visible Tonight</h2>
      </div>
      <div className="highlight-list">
        {highlights.map((highlight) => (
          <article className="highlight-item" key={highlight.id}>
            <div>
              <h3>{highlight.name}</h3>
              <p>{highlight.description}</p>
            </div>
            <span>
              <Compass size={14} aria-hidden="true" />
              {highlight.direction}
            </span>
          </article>
        ))}
      </div>
    </Card>
  );
}

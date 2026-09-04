import Link from "next/link";
import { ArrowRight, Clock, Cloud, MapPin, Moon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDistance, formatMinutes, formatPercent } from "@/lib/format";
import type { SpotPlan } from "@/types/spot";

type SpotCardProps = {
  plan: SpotPlan;
  rank: number;
};

export function SpotCard({ plan, rank }: SpotCardProps) {
  return (
    <article className="spot-card">
      <div className="spot-card__rank">{rank}</div>
      <div className="spot-card__content">
        <div className="spot-card__top">
          <div>
            <h3>{plan.name}</h3>
            <p>{plan.region}</p>
          </div>
          <Badge tone={plan.condition}>{plan.score}</Badge>
        </div>

        <p className="spot-card__description">{plan.description}</p>

        <div className="spot-card__stats">
          <span>
            <MapPin size={14} aria-hidden="true" />
            {formatDistance(plan.distanceKm)}
          </span>
          <span>
            <Clock size={14} aria-hidden="true" />
            {formatMinutes(plan.travelTimeMinutes)}
          </span>
          <span>
            <Cloud size={14} aria-hidden="true" />
            {formatPercent(plan.weather.cloudCover)}
          </span>
          <span>
            <Moon size={14} aria-hidden="true" />
            {formatPercent(plan.astronomy.moonIllumination)}
          </span>
        </div>

        <div className="spot-card__footer">
          <span>{plan.visibleHighlights.slice(0, 3).join(" / ")}</span>
          <Link href={`/spot/${plan.id}`}>
            Details <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

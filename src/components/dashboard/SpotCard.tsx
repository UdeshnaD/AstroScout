import Link from "next/link";
import { ArrowRight, Clock, Cloud, Moon, Route, Telescope } from "lucide-react";
import { formatDistance, formatMinutes, formatPercent } from "@/lib/format";
import type { SpotPlan } from "@/types/spot";

type SpotCardProps = {
  plan: SpotPlan;
  rank: number;
};

export function SpotCard({ plan, rank }: SpotCardProps) {
  return (
    <article className="spot-card">
      <div className={`spot-card__rank spot-card__rank--${plan.condition}`}>
        <span>{rank}</span>
        <strong>{plan.score}</strong>
      </div>
      <div className="spot-card__content">
        <div className="spot-card__top">
          <div>
            <h3>{plan.name}</h3>
            <p>{plan.region} - {plan.darknessLabel}</p>
          </div>
          <span className={`condition-label condition-label--${plan.condition}`}>{conditionCopy(plan.condition)}</span>
        </div>

        <p className="spot-card__description">{plan.description}</p>

        <div className="spot-card__stats">
          <span>
            <Route size={14} aria-hidden="true" />
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

        <div className="reason-list">
          {plan.scoreReasons.slice(0, 2).map((reason) => (
            <span key={reason}>{reason}</span>
          ))}
        </div>

        <div className="spot-card__footer">
          <span>
            <Telescope size={14} aria-hidden="true" />
            {plan.visibleHighlights.slice(0, 3).join(" / ")}
          </span>
          <Link href={`/spot/${plan.id}`}>
            Details <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function conditionCopy(condition: SpotPlan["condition"]) {
  if (condition === "good") return "Strong";
  if (condition === "mixed") return "Check clouds";
  return "Limited";
}

import Link from "next/link";
import { ArrowRight, Car, CheckCircle2, Clock, Cloud, Compass, MapPin, Moon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { departureTimeFor, formatDistance, formatMinutes, formatPercent } from "@/lib/format";
import type { SpotPlan } from "@/types/spot";

type BestSpotPanelProps = {
  plan?: SpotPlan;
  startTime: string;
  locationLabel: string;
  lastUpdated?: string;
  isLoading: boolean;
  onRefresh: () => void;
};

export function BestSpotPanel({ plan, startTime, locationLabel, lastUpdated, isLoading, onRefresh }: BestSpotPanelProps) {
  if (!plan) {
    return (
      <Card className="best-panel best-panel--empty">
        <div>
          <span className="eyebrow">Field decision</span>
          <h2>Choose a location and search the night sky.</h2>
          <p>AstroScout will compare travel time, cloud cover, moon brightness, and visible targets.</p>
        </div>
        <Button disabled={isLoading} onClick={onRefresh} type="button">
          <RefreshCw size={17} aria-hidden="true" />
          Load Plan
        </Button>
      </Card>
    );
  }

  const departureTime = departureTimeFor(startTime, plan.travelTimeMinutes);
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${plan.latitude},${plan.longitude}`;

  return (
    <Card className="best-panel">
      <div className="best-panel__main">
        <span className="eyebrow">Best field plan from {locationLabel}</span>
        <div className="best-panel__title">
          <div>
            <h2>{plan.name}</h2>
            <p>{plan.region}</p>
          </div>
          <div className={`score-dial score-dial--${plan.condition}`} aria-label={`Plan score ${plan.score}`}>
            {plan.score}
          </div>
        </div>
        <p className="best-panel__copy">{plan.description}</p>

        <div className="decision-strip">
          <DecisionMetric icon={Clock} label="Leave around" value={departureTime} />
          <DecisionMetric icon={Car} label="Travel" value={formatMinutes(plan.travelTimeMinutes)} />
          <DecisionMetric icon={Cloud} label="Clouds" value={formatPercent(plan.weather.cloudCover)} />
          <DecisionMetric icon={Moon} label="Moon" value={`${formatPercent(plan.astronomy.moonIllumination)} lit`} />
        </div>
      </div>

      <aside className="best-panel__aside">
        <div className="field-card">
          <strong>Why this spot</strong>
          <ul>
            {plan.scoreReasons.slice(0, 3).map((reason) => (
              <li key={reason}>
                <CheckCircle2 size={15} aria-hidden="true" />
                {reason}
              </li>
            ))}
          </ul>
        </div>

        <div className="best-panel__actions">
          <Link className="button-link button-link--primary" href={`/spot/${plan.id}`}>
            Open Spot <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <a className="button-link button-link--secondary" href={mapsUrl} rel="noreferrer" target="_blank">
            Directions <MapPin size={16} aria-hidden="true" />
          </a>
        </div>

        <p className="data-note">
          <Compass size={14} aria-hidden="true" />
          Open-Meteo forecast - Updated {lastUpdated ?? "now"}
        </p>
      </aside>
    </Card>
  );
}

function DecisionMetric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div>
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

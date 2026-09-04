import { MapPin, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { ObservingSpot } from "@/types/spot";

type SpotHeaderProps = {
  spot: ObservingSpot;
};

export function SpotHeader({ spot }: SpotHeaderProps) {
  return (
    <section className={`spot-hero spot-hero--${spot.imageTheme}`}>
      <div>
        <span className="eyebrow">
          <MapPin size={16} aria-hidden="true" />
          {spot.region}
        </span>
        <h1>{spot.name}</h1>
        <p>{spot.description}</p>
      </div>
      <div className="spot-hero__meta">
        <Badge tone="neutral">Bortle {spot.bortleRating}</Badge>
        <span>{spot.darknessLabel}</span>
        <span>
          <ShieldAlert size={15} aria-hidden="true" />
          Check access before travel
        </span>
      </div>
    </section>
  );
}

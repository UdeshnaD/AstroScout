import Link from "next/link";
import { MapPinned } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { SpotPlan } from "@/types/spot";

type MapPreviewProps = {
  plans: SpotPlan[];
};

export function MapPreview({ plans }: MapPreviewProps) {
  const bounds = getBounds(plans);

  return (
    <Card className="map-panel">
      <div className="section-title">
        <MapPinned size={18} aria-hidden="true" />
        <h2>Nearby Spots</h2>
      </div>
      <div className="map-canvas" aria-label="Map preview of observing spots">
        {plans.slice(0, 7).map((plan) => {
          const left = scale(plan.longitude, bounds.minLon, bounds.maxLon);
          const top = 100 - scale(plan.latitude, bounds.minLat, bounds.maxLat);

          return (
            <Link
              className={`map-pin map-pin--${plan.condition}`}
              href={`/spot/${plan.id}`}
              key={plan.id}
              style={{ left: `${left}%`, top: `${top}%` }}
              title={plan.name}
            >
              <span>{plan.score}</span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

function getBounds(plans: SpotPlan[]) {
  const latitudes = plans.map((plan) => plan.latitude);
  const longitudes = plans.map((plan) => plan.longitude);

  return {
    minLat: Math.min(...latitudes, -34.7),
    maxLat: Math.max(...latitudes, -32.8),
    minLon: Math.min(...longitudes, 150.2),
    maxLon: Math.max(...longitudes, 151.9)
  };
}

function scale(value: number, min: number, max: number) {
  if (max === min) return 50;
  return Math.min(92, Math.max(8, ((value - min) / (max - min)) * 100));
}

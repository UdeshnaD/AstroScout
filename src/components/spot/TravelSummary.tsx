import { Clock, MapPinned, Navigation } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatDistance, formatMinutes } from "@/lib/format";
import type { TripSummary } from "@/types/trip";

type TravelSummaryProps = {
  trip: TripSummary;
};

export function TravelSummary({ trip }: TravelSummaryProps) {
  return (
    <Card>
      <div className="section-title">
        <Navigation size={18} aria-hidden="true" />
        <h2>Travel</h2>
      </div>
      <div className="fact-grid">
        <div>
          <MapPinned size={18} aria-hidden="true" />
          <span>Distance</span>
          <strong>{formatDistance(trip.distanceKm)}</strong>
        </div>
        <div>
          <Clock size={18} aria-hidden="true" />
          <span>Duration</span>
          <strong>{formatMinutes(trip.travelTimeMinutes)}</strong>
        </div>
      </div>
      <p className="muted">{trip.routeLabel}</p>
    </Card>
  );
}

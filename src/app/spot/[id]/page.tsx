import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SpotForecast } from "@/components/spot/SpotForecast";
import { SpotHeader } from "@/components/spot/SpotHeader";
import { TravelSummary } from "@/components/spot/TravelSummary";
import { ViewingGuide } from "@/components/spot/ViewingGuide";
import { getSpotById } from "@/data/observing-spots";
import { getAstronomySummary } from "@/lib/astronomy";
import { distanceKm, estimateTrip } from "@/lib/distance";
import { getWeatherForSpot } from "@/lib/weather";

type SpotPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    startTime?: string;
    lat?: string;
    lon?: string;
    mode?: string;
  }>;
};

const SYDNEY_CBD = {
  latitude: -33.8688,
  longitude: 151.2093,
};

export default async function SpotPage({
  params,
  searchParams,
}: SpotPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const spot = getSpotById(id);

  if (!spot) {
    notFound();
  }

  const startTime =
    query.startTime &&
    Number.isFinite(Date.parse(query.startTime))
      ? query.startTime
      : defaultViewingIso();
  const astronomy = await getAstronomySummary(
    startTime,
    spot.latitude,
    spot.longitude,
  );
  const weather = await getWeatherForSpot(spot, startTime);
  const latitude = Number(query.lat);
  const longitude = Number(query.lon);
  const origin =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
      ? { latitude, longitude }
      : SYDNEY_CBD;
  const mode =
    query.mode === "walking" || query.mode === "public_transport"
      ? query.mode
      : "driving";
  const trip = estimateTrip(distanceKm(origin, spot), mode);

  return (
    <main className="app-shell">
      <Link className="back-link" href="/">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to planner
      </Link>
      <SpotHeader
        spot={spot}
        directionsUrl={`https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}&origin=${origin.latitude},${origin.longitude}&travelmode=${mode === "public_transport" ? "transit" : mode}`}
      />
      <section className="detail-grid">
        <TravelSummary trip={trip} />
        <SpotForecast weather={weather} />
        <ViewingGuide astronomy={astronomy} spot={spot} />
      </section>
    </main>
  );
}

function defaultViewingIso() {
  const date = new Date();
  date.setHours(20, 0, 0, 0);

  if (date.getTime() < Date.now()) {
    date.setDate(date.getDate() + 1);
  }

  return date.toISOString();
}

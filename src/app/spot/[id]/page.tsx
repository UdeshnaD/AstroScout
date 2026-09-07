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
  params: {
    id: string;
  };
  searchParams: {
    startTime?: string;
    lat?: string;
    lon?: string;
    mode?: string;
  };
};

const SYDNEY_CBD = {
  latitude: -33.8688,
  longitude: 151.2093,
};

export default async function SpotPage({
  params,
  searchParams,
}: SpotPageProps) {
  const spot = getSpotById(params.id);

  if (!spot) {
    notFound();
  }

  const startTime =
    searchParams.startTime &&
    Number.isFinite(Date.parse(searchParams.startTime))
      ? searchParams.startTime
      : defaultViewingIso();
  const astronomy = getAstronomySummary(
    startTime,
    spot.latitude,
    spot.longitude,
  );
  const weather = await getWeatherForSpot(spot, startTime);
  const latitude = Number(searchParams.lat);
  const longitude = Number(searchParams.lon);
  const origin =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
      ? { latitude, longitude }
      : SYDNEY_CBD;
  const mode =
    searchParams.mode === "walking" || searchParams.mode === "public_transport"
      ? searchParams.mode
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

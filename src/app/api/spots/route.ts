import { NextResponse } from "next/server";
import { observingSpots } from "@/data/observing-spots";
import { distanceKm } from "@/lib/distance";
import { resolveNswPostcode } from "@/lib/nsw-postcode";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postcode = searchParams.get("postcode");
  const latitude = Number(searchParams.get("lat"));
  const longitude = Number(searchParams.get("lon"));
  const radiusKm = Number(searchParams.get("radiusKm") ?? 120);

  if (postcode) {
    try {
      const origin = await resolveNswPostcode(postcode);
      if (!origin) {
        return NextResponse.json(
          { error: "Enter a valid NSW postcode." },
          { status: 400 },
        );
      }
      const spots = observingSpots
        .map((spot) => ({
          ...spot,
          distanceKm: Number(distanceKm(origin, spot).toFixed(1)),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm);

      return NextResponse.json({
        origin,
        nearestSpot: spots[0],
        spots,
      });
    } catch {
      return NextResponse.json(
        { error: "Postcode lookup is unavailable. Try again shortly." },
        { status: 503 },
      );
    }
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ spots: observingSpots });
  }

  const spots = observingSpots
    .map((spot) => ({
      ...spot,
      distanceKm: Number(distanceKm({ latitude, longitude }, spot).toFixed(1))
    }))
    .filter((spot) => spot.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return NextResponse.json({ spots });
}

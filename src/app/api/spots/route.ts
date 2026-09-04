import { NextResponse } from "next/server";
import { observingSpots } from "@/data/observing-spots";
import { distanceKm } from "@/lib/distance";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = Number(searchParams.get("lat"));
  const longitude = Number(searchParams.get("lon"));
  const radiusKm = Number(searchParams.get("radiusKm") ?? 120);

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

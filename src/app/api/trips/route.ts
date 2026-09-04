import { NextResponse } from "next/server";
import { getSpotById } from "@/data/observing-spots";
import { distanceKm, estimateTrip } from "@/lib/distance";
import type { TravelMode } from "@/types/trip";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    origin?: { latitude?: number; longitude?: number };
    destinationSpotId?: string;
    travelMode?: TravelMode;
  };

  const latitude = Number(body.origin?.latitude);
  const longitude = Number(body.origin?.longitude);
  const travelMode = body.travelMode ?? "driving";

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !body.destinationSpotId) {
    return NextResponse.json({ error: "Origin and destinationSpotId are required." }, { status: 400 });
  }

  const spot = getSpotById(body.destinationSpotId);

  if (!spot) {
    return NextResponse.json({ error: "Spot not found." }, { status: 404 });
  }

  const distance = distanceKm({ latitude, longitude }, spot);
  return NextResponse.json({ trip: estimateTrip(distance, travelMode) });
}

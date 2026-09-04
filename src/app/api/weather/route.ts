import { NextResponse } from "next/server";
import { getSpotById } from "@/data/observing-spots";
import { getWeatherForSpot } from "@/lib/weather";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const spotId = searchParams.get("spotId");
  const startTime = searchParams.get("startTime") ?? new Date().toISOString();

  if (!spotId) {
    return NextResponse.json({ error: "spotId is required." }, { status: 400 });
  }

  const spot = getSpotById(spotId);

  if (!spot) {
    return NextResponse.json({ error: "Spot not found." }, { status: 404 });
  }

  const weather = await getWeatherForSpot(spot, startTime);
  return NextResponse.json({ weather });
}

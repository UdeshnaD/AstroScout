import { NextResponse } from "next/server";
import { getAstronomySummary } from "@/lib/astronomy";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startTime = searchParams.get("startTime") ?? new Date().toISOString();
  const latitude = Number(searchParams.get("lat") ?? -33.7738);
  const longitude = Number(searchParams.get("lon") ?? 151.1126);
  if (
    !Number.isFinite(Date.parse(startTime)) ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return NextResponse.json(
      { error: "Valid time and coordinates are required." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    astronomy: getAstronomySummary(startTime, latitude, longitude),
  });
}

import { NextResponse } from "next/server";
import { getHorizons, readLocation, readUtc } from "@/lib/event-providers";
import { summaryFromHorizons } from "@/lib/horizons-summary";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  let location, utc;
  try {
    location = readLocation(params);
    utc = readUtc(params.get("utc") ?? params.get("startTime"));
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
  try {
    const snapshot = await getHorizons(location, utc);
    const available = Object.values(snapshot.objects).some(
      (entry) => entry.status === "available",
    );
    return NextResponse.json(
      {
        source: "NASA/JPL Horizons API",
        astronomy: summaryFromHorizons(snapshot),
        snapshot,
        ...(!available && { error: "NASA/JPL data unavailable" }),
      },
      {
        status: available ? 200 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "NASA/JPL data unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

import { NextResponse } from "next/server";
import { getHorizons, readLocation, readUtc } from "@/lib/event-providers";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
export async function GET(request: Request) {
  let location, utc;
  try {
    const params = new URL(request.url).searchParams;
    location = readLocation(params);
    utc = readUtc(params.get("utc"));
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
  try {
    const snapshot = await getHorizons(location, utc);
    const available = Object.values(snapshot.objects).some(
      (object) => object.status === "available",
    );
    return NextResponse.json(snapshot, {
      status: available ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 503 },
    );
  }
}

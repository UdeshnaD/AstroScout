import { NextResponse } from "next/server";
import { getEventWeather, readLocation } from "@/lib/event-providers";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const result = await getEventWeather(
      readLocation(new URL(request.url).searchParams),
    );
    return NextResponse.json(result, {
      status: result.status === "available" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}

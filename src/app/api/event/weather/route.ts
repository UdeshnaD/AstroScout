import { NextResponse } from "next/server";
import { withPublicApi } from "@/lib/api-safety";
import { getEventWeather, readLocation, readUtc } from "@/lib/event-providers";
export const dynamic = "force-dynamic";
async function handleGet(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const result = await getEventWeather(
      readLocation(params),
      readUtc(params.get("utc")),
    );
    return NextResponse.json(result, {
      status: result.status === "available" ? 200 : 503,
      headers: result.status === "available"
        ? {
            "Cache-Control": "public, max-age=0, must-revalidate",
            "Vercel-CDN-Cache-Control": "public, s-maxage=300",
          }
        : { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
export const GET = withPublicApi(handleGet);

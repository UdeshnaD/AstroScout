import { NextResponse } from "next/server";
import { parseGeoapifyRoute } from "@/lib/nearby-places";

export const dynamic = "force-dynamic";

function coordinate(value: string | null, limit: number) {
  const number = Number(value);
  return value !== null && Number.isFinite(number) && Math.abs(number) <= limit
    ? number
    : null;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const fromLat = coordinate(params.get("fromLat"), 90);
  const fromLon = coordinate(params.get("fromLon"), 180);
  const toLat = coordinate(params.get("toLat"), 90);
  const toLon = coordinate(params.get("toLon"), 180);
  if ([fromLat, fromLon, toLat, toLon].some((value) => value === null)) {
    return NextResponse.json({ error: "Provide valid route coordinates." }, { status: 400 });
  }

  const apiKey = (process.env.GEOAPIFY_API_KEY || process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY)?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Travel-time estimates require GEOAPIFY_API_KEY." },
      { status: 503 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const url = new URL("https://api.geoapify.com/v1/routing");
    url.searchParams.set("waypoints", `${fromLat},${fromLon}|${toLat},${toLon}`);
    url.searchParams.set("mode", "drive");
    url.searchParams.set("apiKey", apiKey);
    const response = await fetch(url, {
      headers: { Accept: "application/geo+json, application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Geoapify Routing returned HTTP ${response.status}.`);
    const route = parseGeoapifyRoute(await response.json());
    if (!route) throw new Error("Geoapify returned an incomplete route estimate.");
    return NextResponse.json({ route, provider: "Geoapify" });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.name === "AbortError"
            ? "The route estimate timed out."
            : error instanceof Error
              ? error.message
              : "The route estimate is temporarily unavailable.",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

import { NextResponse } from "next/server";
import { parseNearbyPlaces, type NearbyPlace } from "@/lib/nearby-places";

export const dynamic = "force-dynamic";

const categories = [
  "tourism.attraction.viewpoint",
  "leisure.park.nature_reserve",
  "leisure.picnic.picnic_site",
  "natural.protected_area",
  "national_park",
  "beach",
  "natural.coastal",
  "natural.mountain",
].join(",");

type CachedPlaces = { expires: number; places: NearbyPlace[] };
const cache = new Map<string, CachedPlaces>();
const cacheLifetimeMs = 30 * 60 * 1000;

function coordinate(value: string | null, limit: number) {
  const number = Number(value);
  return value !== null && Number.isFinite(number) && Math.abs(number) <= limit
    ? number
    : null;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const latitude = coordinate(params.get("lat"), 90);
  const longitude = coordinate(params.get("lon"), 180);
  const requestedRadius = Number(params.get("radiusKm") ?? "25");
  if (
    latitude === null ||
    longitude === null ||
    !Number.isFinite(requestedRadius) ||
    requestedRadius < 5 ||
    requestedRadius > 100
  ) {
    return NextResponse.json(
      { error: "Provide valid coordinates and a radius from 5 to 100 km." },
      { status: 400 },
    );
  }

  const apiKey = (process.env.GEOAPIFY_API_KEY || process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY)?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Nearby place discovery requires GEOAPIFY_API_KEY." },
      { status: 503 },
    );
  }

  const radiusKm = Math.round(requestedRadius);
  const cacheKey = `${latitude.toFixed(4)}:${longitude.toFixed(4)}:${radiusKm}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json({ places: cached.places, provider: "Geoapify", cached: true });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const url = new URL("https://api.geoapify.com/v2/places");
    url.searchParams.set("categories", categories);
    url.searchParams.set(
      "filter",
      `circle:${longitude},${latitude},${radiusKm * 1000}`,
    );
    url.searchParams.set("bias", `proximity:${longitude},${latitude}`);
    url.searchParams.set("limit", "12");
    url.searchParams.set("lang", "en");
    url.searchParams.set("apiKey", apiKey);
    const response = await fetch(url, {
      headers: { Accept: "application/geo+json, application/json" },
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error(`Geoapify Places returned HTTP ${response.status}.`);
    const data = (await response.json()) as { features?: unknown };
    const places = parseNearbyPlaces(Array.isArray(data.features) ? data.features : []);
    if (cache.size >= 100) cache.delete(cache.keys().next().value as string);
    cache.set(cacheKey, { expires: Date.now() + cacheLifetimeMs, places });
    return NextResponse.json({
      places,
      provider: "Geoapify",
      cached: false,
      radiusKm,
      origin: { latitude, longitude },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.name === "AbortError"
            ? "Geoapify place discovery timed out. Try again."
            : error instanceof Error
              ? error.message
              : "Geoapify place discovery is temporarily unavailable.",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

import { NextResponse } from "next/server";
import {
  parseGeoapifyResults,
  parseOpenMeteoResults,
  type LocationSearchResult,
} from "@/lib/location-search";

export const dynamic = "force-dynamic";

type CachedSearch = {
  expires: number;
  locations: LocationSearchResult[];
  provider: "Geoapify" | "Open-Meteo";
  fullPlaceSearch: boolean;
};

const cache = new Map<string, CachedSearch>();
const cacheLifetimeMs = 24 * 60 * 60 * 1000;

async function requestJson(url: URL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error(`Location provider returned HTTP ${response.status}.`);
    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

async function searchOpenMeteo(query: string) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "8");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  const data = (await requestJson(url)) as { results?: unknown };
  return parseOpenMeteoResults(
    Array.isArray(data.results) ? data.results : [],
  );
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 120) {
    return NextResponse.json(
      { error: "Enter between 2 and 120 characters." },
      { status: 400 },
    );
  }

  const key = query.toLocaleLowerCase("en-AU");
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now())
    return NextResponse.json({ ...cached, cached: true });

  try {
    const geoapifyKey = (process.env.GEOAPIFY_API_KEY || process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY)?.trim();
    let locations: LocationSearchResult[];
    let provider: CachedSearch["provider"];
    let fullPlaceSearch: boolean;

    if (geoapifyKey) {
      try {
        const url = new URL("https://api.geoapify.com/v1/geocode/search");
        url.searchParams.set("text", query);
        url.searchParams.set("format", "json");
        url.searchParams.set("limit", "8");
        url.searchParams.set("apiKey", geoapifyKey);
        const data = (await requestJson(url)) as { results?: unknown };
        locations = parseGeoapifyResults(
          Array.isArray(data.results) ? data.results : [],
        );
        provider = "Geoapify";
        fullPlaceSearch = true;
      } catch {
        locations = await searchOpenMeteo(query);
        provider = "Open-Meteo";
        fullPlaceSearch = false;
      }
    } else {
      locations = await searchOpenMeteo(query);
      provider = "Open-Meteo";
      fullPlaceSearch = false;
    }

    const result: CachedSearch = {
      expires: Date.now() + cacheLifetimeMs,
      locations,
      provider,
      fullPlaceSearch,
    };
    if (cache.size >= 100)
      cache.delete(cache.keys().next().value as string);
    cache.set(key, result);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.name === "AbortError"
            ? "The location search timed out. Try again."
            : "The location search service is temporarily unavailable.",
      },
      { status: 502 },
    );
  }
}

import { NextResponse } from "next/server";
import { buildPlanResults } from "@/lib/scoring";
import type { PlanSearchRequest } from "@/types/spot";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<PlanSearchRequest>;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "A planning request object is required." },
        { status: 400 },
      );
    }
    const parsed = parsePlanRequest(body);

    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const result = await buildPlanResults(parsed.value);
    if (!result.locations.length && result.unavailableSites.length) {
      return NextResponse.json(
        {
          ...result,
          error:
            "Forecast unavailable for this time. Choose a time within the next seven days or retry shortly.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SyntaxError)
      return NextResponse.json(
        { error: "A valid JSON request is required." },
        { status: 400 },
      );
    return NextResponse.json(
      { error: "Unable to create an observing plan." },
      { status: 500 },
    );
  }
}

function parsePlanRequest(body: Partial<PlanSearchRequest>) {
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const radiusKm = Number(body.radiusKm ?? 80);
  const travelMode = body.travelMode ?? "driving";
  const startTime = body.startTime ?? new Date().toISOString();

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return {
      ok: false as const,
      error: "A valid latitude and longitude are required.",
    };
  }

  if (
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180 ||
    body.latitude == null ||
    body.longitude == null
  ) {
    return {
      ok: false as const,
      error: "Coordinates are outside the valid range.",
    };
  }
  if (!Number.isFinite(new Date(startTime).getTime())) {
    return {
      ok: false as const,
      error: "Choose a valid observing date and time.",
    };
  }
  if (!Number.isFinite(radiusKm) || radiusKm < 1 || radiusKm > 300) {
    return {
      ok: false as const,
      error: "Choose a radius between 1 and 300 km.",
    };
  }

  if (!["driving", "public_transport", "walking"].includes(travelMode)) {
    return { ok: false as const, error: "A valid travel mode is required." };
  }

  return {
    ok: true as const,
    value: {
      latitude,
      longitude,
      startTime,
      radiusKm: Number.isFinite(radiusKm) ? radiusKm : 80,
      travelMode,
    } satisfies PlanSearchRequest,
  };
}

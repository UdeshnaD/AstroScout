import { NextResponse } from "next/server";
import { buildPlanResults } from "@/lib/scoring";
import type { PlanSearchRequest } from "@/types/spot";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<PlanSearchRequest>;
    const parsed = parsePlanRequest(body);

    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const locations = await buildPlanResults(parsed.value);
    return NextResponse.json({ locations });
  } catch {
    return NextResponse.json({ error: "Unable to create an observing plan." }, { status: 500 });
  }
}

function parsePlanRequest(body: Partial<PlanSearchRequest>) {
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const radiusKm = Number(body.radiusKm ?? 80);
  const travelMode = body.travelMode ?? "driving";
  const startTime = body.startTime ?? new Date().toISOString();

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { ok: false as const, error: "A valid latitude and longitude are required." };
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
      travelMode
    } satisfies PlanSearchRequest
  };
}

import { NextResponse } from "next/server";
import { getAstronomySummary } from "@/lib/astronomy";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startTime = searchParams.get("startTime") ?? new Date().toISOString();

  return NextResponse.json({
    astronomy: getAstronomySummary(startTime)
  });
}

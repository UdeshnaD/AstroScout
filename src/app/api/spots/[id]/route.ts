import { NextResponse } from "next/server";
import { getSpotById } from "@/data/observing-spots";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const spot = getSpotById(id);

  if (!spot) {
    return NextResponse.json({ error: "Spot not found." }, { status: 404 });
  }

  return NextResponse.json({ spot });
}

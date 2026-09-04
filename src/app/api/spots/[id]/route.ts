import { NextResponse } from "next/server";
import { getSpotById } from "@/data/observing-spots";

type Params = {
  params: {
    id: string;
  };
};

export function GET(_request: Request, { params }: Params) {
  const spot = getSpotById(params.id);

  if (!spot) {
    return NextResponse.json({ error: "Spot not found." }, { status: 404 });
  }

  return NextResponse.json({ spot });
}

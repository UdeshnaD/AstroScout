import { observingSpots } from "@/data/observing-spots";
import { getAstronomySummary } from "@/lib/astronomy";
import { distanceKm, estimateTrip } from "@/lib/distance";
import { getWeatherForSpot } from "@/lib/weather";
import type { PlanSearchRequest, SpotPlan } from "@/types/spot";

export async function buildPlanResults(input: PlanSearchRequest): Promise<SpotPlan[]> {
  const origin = {
    latitude: input.latitude,
    longitude: input.longitude
  };
  const astronomy = getAstronomySummary(input.startTime);

  const nearby = observingSpots
    .map((spot) => {
      const distance = distanceKm(origin, spot);
      return { spot, distance };
    })
    .filter(({ distance }) => distance <= input.radiusKm)
    .sort((a, b) => a.distance - b.distance);

  const scored = await Promise.all(
    nearby.map(async ({ spot, distance }) => {
      const weather = await getWeatherForSpot(spot, input.startTime);
      const trip = estimateTrip(distance, input.travelMode);
      const score = calculateScore({
        cloudCover: weather.cloudCover,
        visibilityKm: weather.visibilityKm,
        precipitationChance: weather.precipitationChance,
        bortleRating: spot.bortleRating,
        travelTimeMinutes: trip.travelTimeMinutes,
        moonIllumination: astronomy.moonIllumination
      });

      const visibleHighlights = astronomy.highlights.map((highlight) => highlight.name);

      return {
        ...spot,
        distanceKm: trip.distanceKm,
        travelTimeMinutes: trip.travelTimeMinutes,
        score,
        condition: conditionFromScore(score),
        scoreReasons: buildReasons(score, weather.cloudCover, astronomy.moonIllumination, spot.bortleRating),
        visibleHighlights,
        trip,
        weather,
        astronomy
      } satisfies SpotPlan;
    })
  );

  return scored.sort((a, b) => b.score - a.score);
}

function calculateScore(input: {
  cloudCover: number;
  visibilityKm: number;
  precipitationChance: number;
  bortleRating: number;
  travelTimeMinutes: number;
  moonIllumination: number;
}) {
  const skyClarityScore = 100 - input.cloudCover;
  const visibilityScore = Math.min(100, input.visibilityKm * 4);
  const precipitationScore = 100 - input.precipitationChance;
  const darknessScore = Math.max(0, 110 - input.bortleRating * 12);
  const travelScore = Math.max(15, 100 - input.travelTimeMinutes * 0.45);
  const moonScore = 100 - input.moonIllumination * 0.75;

  return Math.round(
    skyClarityScore * 0.28 +
      visibilityScore * 0.18 +
      precipitationScore * 0.12 +
      darknessScore * 0.18 +
      travelScore * 0.14 +
      moonScore * 0.1
  );
}

function conditionFromScore(score: number): SpotPlan["condition"] {
  if (score >= 76) return "good";
  if (score >= 56) return "mixed";
  return "poor";
}

function buildReasons(score: number, cloudCover: number, moonIllumination: number, bortleRating: number) {
  const reasons: string[] = [];

  if (cloudCover <= 30) {
    reasons.push("Low cloud cover during the selected viewing window");
  } else if (cloudCover <= 60) {
    reasons.push("Mixed cloud cover, with some viewing gaps possible");
  } else {
    reasons.push("Cloud cover may limit faint-object visibility");
  }

  if (moonIllumination <= 35) {
    reasons.push("Low moon brightness supports darker-sky viewing");
  } else if (moonIllumination >= 70) {
    reasons.push("Bright moonlight favours Moon and planet viewing");
  } else {
    reasons.push("Moderate moonlight still allows brighter targets");
  }

  if (bortleRating <= 4) {
    reasons.push("Darker site conditions than inner Sydney");
  } else if (bortleRating <= 6) {
    reasons.push("Useful sky quality for planets and bright deep-sky targets");
  } else {
    reasons.push("Best suited to Moon, planets, and bright constellations");
  }

  if (score >= 76) {
    reasons.push("Strong overall balance of sky quality and travel effort");
  }

  return reasons;
}

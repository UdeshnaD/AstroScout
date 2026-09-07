import { observingSpots } from "@/data/observing-spots";
import { getAstronomySummary } from "@/lib/astronomy";
import { distanceKm, estimateTrip } from "@/lib/distance";
import { getWeatherForSpot } from "@/lib/weather";
import { defaultPriorities, factorNames, rankPlans } from "@/lib/recommender";
import type { PlanSearchRequest, SpotPlan } from "@/types/spot";

export async function buildPlanResults(
  input: PlanSearchRequest,
): Promise<SpotPlan[]> {
  const nearby = observingSpots
    .map((spot) => ({ spot, distance: distanceKm(input, spot) }))
    .filter(({ distance }) => distance <= input.radiusKm);
  const plans = await Promise.all(
    nearby.map(async ({ spot, distance }) => {
      const weather = await getWeatherForSpot(spot, input.startTime);
      const astronomy = getAstronomySummary(
        weather.hourly[0]?.time ?? input.startTime,
        spot.latitude,
        spot.longitude,
      );
      const trip = estimateTrip(distance, input.travelMode);
      return {
        ...spot,
        distanceKm: trip.distanceKm,
        travelTimeMinutes: trip.travelTimeMinutes,
        trip,
        weather,
        astronomy,
        score: 0,
        condition: "mixed" as const,
        scoreReasons: [],
        visibleHighlights: astronomy.highlights
          .filter(
            (target) =>
              (target.altitude ?? -90) > 10 &&
              (astronomy.sunAltitude ?? 0) < -6,
          )
          .map((target) => target.name),
      } satisfies SpotPlan;
    }),
  );
  // All sites must expose the same number of hours for a fair time comparison.
  const sharedHours = plans.reduce(
    (count, plan) => Math.min(count, plan.weather.hourly.length),
    8,
  );
  const aligned = plans.map((plan) => ({
    ...plan,
    weather: {
      ...plan.weather,
      hourly: plan.weather.hourly.slice(0, sharedHours),
    },
  }));
  return rankPlans(aligned, defaultPriorities, [], false).map((plan) => ({
    ...plan,
    scoreReasons: plan.contributions.map(
      (value, i) => `${factorNames[i]}: ${value.toFixed(1)} baseline points`,
    ),
  }));
}

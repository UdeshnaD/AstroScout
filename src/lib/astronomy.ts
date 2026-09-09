import { getHorizons } from "./event-providers";
import { summaryFromHorizons, unavailableAstronomy } from "./horizons-summary";
export async function getAstronomySummary(
  utc: string,
  latitude = -33.7738,
  longitude = 151.1126,
  elevation = 0,
) {
  try {
    const snapshot = await getHorizons(
      { latitude, longitude, elevation },
      new Date(utc).toISOString(),
    );
    return summaryFromHorizons(snapshot);
  } catch {
    return unavailableAstronomy(utc);
  }
}

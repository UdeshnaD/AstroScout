import { Cloud, Droplets, Eye, Wind } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatPercent } from "@/lib/format";
import type { WeatherSummary } from "@/types/weather";

type SpotForecastProps = {
  weather: WeatherSummary | null;
};

export function SpotForecast({ weather }: SpotForecastProps) {
  if (!weather)
    return (
      <Card>
        <h2>Sky Conditions</h2>
        <p>Forecast unavailable for this site and time.</p>
      </Card>
    );
  return (
    <Card>
      <div className="section-title">
        <Cloud size={18} aria-hidden="true" />
        <h2>Sky Conditions</h2>
      </div>
      <div className="fact-grid">
        <div>
          <Cloud size={18} aria-hidden="true" />
          <span>Clouds</span>
          <strong>{formatPercent(weather.cloudCover)}</strong>
        </div>
        <div>
          <Eye size={18} aria-hidden="true" />
          <span>Visibility</span>
          <strong>{weather.visibilityKm} km</strong>
        </div>
        <div>
          <Droplets size={18} aria-hidden="true" />
          <span>Rain chance</span>
          <strong>{formatPercent(weather.precipitationChance)}</strong>
        </div>
        <div>
          <Wind size={18} aria-hidden="true" />
          <span>Wind</span>
          <strong>{weather.windKph} km/h</strong>
        </div>
      </div>

      <div className="hourly-strip">
        {weather.hourly.map((point) => (
          <div key={point.time}>
            <span>{formatHour(point.time)}</span>
            <strong>{formatPercent(point.cloudCover)}</strong>
          </div>
        ))}
      </div>
      <p className="data-note">Weather source: Open-Meteo forecast</p>
    </Card>
  );
}

function formatHour(time: string) {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    timeZone: "Australia/Sydney",
  }).format(new Date(time));
}

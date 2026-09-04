"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Radar, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DateTimeSelector } from "@/components/dashboard/DateTimeSelector";
import { EventHighlights } from "@/components/dashboard/EventHighlights";
import { LocationSearch, locationPresets, type LocationPreset } from "@/components/dashboard/LocationSearch";
import { MapPreview } from "@/components/dashboard/MapPreview";
import { SkySummary } from "@/components/dashboard/SkySummary";
import { SpotList } from "@/components/dashboard/SpotList";
import { TravelModeSelector } from "@/components/dashboard/TravelModeSelector";
import { toDateTimeLocalValue } from "@/lib/format";
import type { SpotPlan } from "@/types/spot";
import type { TravelMode } from "@/types/trip";

type ApiResponse = {
  locations?: SpotPlan[];
  error?: string;
};

export function NightPlannerDashboard() {
  const [location, setLocation] = useState<LocationPreset>(locationPresets[0]);
  const [startTime, setStartTime] = useState(() => defaultViewingTime());
  const [travelMode, setTravelMode] = useState<TravelMode>("driving");
  const [radiusKm, setRadiusKm] = useState(120);
  const [plans, setPlans] = useState<SpotPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const topPlan = plans[0];
  const highlights = useMemo(() => topPlan?.astronomy.highlights ?? [], [topPlan]);

  async function searchPlans() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/plans/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          startTime: new Date(startTime).toISOString(),
          radiusKm,
          travelMode
        })
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Unable to load plans.");
      }

      setPlans(data.locations ?? []);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load plans.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void searchPlans();
  }, []);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">
            <Radar size={16} aria-hidden="true" />
            AstroScout
          </span>
          <h1>Night-sky trip planner</h1>
        </div>
        <div className="status-chip">Sydney + NSW MVP</div>
      </header>

      <section className="planner-grid">
        <Card className="planner-controls">
          <div className="section-title">
            <SlidersHorizontal size={18} aria-hidden="true" />
            <h2>Plan A Viewing Session</h2>
          </div>

          <div className="controls-grid">
            <LocationSearch value={location} onChange={setLocation} />
            <DateTimeSelector value={startTime} onChange={setStartTime} />

            <label className="control">
              <span className="control__label">Radius</span>
              <input
                aria-label="Search radius"
                className="range"
                max={220}
                min={20}
                onChange={(event) => setRadiusKm(Number(event.target.value))}
                step={10}
                type="range"
                value={radiusKm}
              />
              <strong>{radiusKm} km</strong>
            </label>

            <TravelModeSelector value={travelMode} onChange={setTravelMode} />
          </div>

          <Button disabled={isLoading} onClick={searchPlans} type="button">
            {isLoading ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <Search size={17} aria-hidden="true" />}
            Search Spots
          </Button>
        </Card>

        <SkySummary plan={topPlan} />
      </section>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="content-grid">
        <div>
          <div className="section-heading">
            <h2>Ranked Observing Spots</h2>
            <span>{plans.length} locations</span>
          </div>
          {isLoading && !plans.length ? <LoadingRows /> : <SpotList plans={plans} />}
        </div>

        <aside className="side-stack">
          <MapPreview plans={plans} />
          <EventHighlights highlights={highlights} />
        </aside>
      </section>
    </main>
  );
}

function defaultViewingTime() {
  const date = new Date();
  date.setHours(20, 0, 0, 0);

  if (date.getTime() < Date.now()) {
    date.setDate(date.getDate() + 1);
  }

  return toDateTimeLocalValue(date);
}

function LoadingRows() {
  return (
    <div className="loading-stack" aria-label="Loading observing spots">
      <div />
      <div />
      <div />
    </div>
  );
}

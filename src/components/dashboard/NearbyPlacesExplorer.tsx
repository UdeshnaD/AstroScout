"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Car,
  Cloud,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
} from "lucide-react";
import { NearbyPlacesMap } from "./NearbyPlacesMap";
import type { LocationPreset } from "./LocationSearch";
import type { EventWeather, SourceResult } from "@/lib/event-types";
import type { NearbyPlace, PlaceRoute } from "@/lib/nearby-places";

type PlacesResponse = {
  places?: NearbyPlace[];
  error?: string;
};

type RouteResponse = {
  route?: PlaceRoute;
  error?: string;
};

function distance(meters: number | null | undefined) {
  if (meters == null) return "Distance unavailable";
  return meters < 1000 ? `${Math.round(meters)} m away` : `${(meters / 1000).toFixed(1)} km away`;
}

function duration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min drive`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours} hr${remainder ? ` ${remainder} min` : ""} drive`;
}

export function NearbyPlacesExplorer({
  origin,
  weather,
  weatherLoading,
  onSelect,
}: {
  origin: LocationPreset;
  weather?: SourceResult<EventWeather>;
  weatherLoading: boolean;
  onSelect: (location: LocationPreset) => void;
}) {
  const [radiusKm, setRadiusKm] = useState(25);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [selected, setSelected] = useState<NearbyPlace>();
  const [route, setRoute] = useState<PlaceRoute>();
  const [loading, setLoading] = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      lat: String(origin.latitude),
      lon: String(origin.longitude),
      radiusKm: String(radiusKm),
    });
    setLoading(true);
    setError("");
    setSelected(undefined);
    setRoute(undefined);
    fetch(`/api/places/nearby?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as PlacesResponse;
        if (!response.ok) throw new Error(data.error || "Unable to discover nearby places.");
        setPlaces(data.places ?? []);
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        setPlaces([]);
        setError(failure instanceof Error ? failure.message : "Unable to discover nearby places.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [origin.latitude, origin.longitude, radiusKm, revision]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      fromLat: String(origin.latitude),
      fromLon: String(origin.longitude),
      toLat: String(selected.latitude),
      toLon: String(selected.longitude),
    });
    setRoute(undefined);
    setRouteLoading(true);
    fetch(`/api/places/route?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as RouteResponse;
        if (response.ok) setRoute(data.route);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setRouteLoading(false);
      });
    return () => controller.abort();
  }, [origin.latitude, origin.longitude, selected]);

  const directionsUrl = useMemo(() => {
    if (!selected) return "#";
    const params = new URLSearchParams({
      api: "1",
      origin: `${origin.latitude},${origin.longitude}`,
      destination: `${selected.latitude},${selected.longitude}`,
      travelmode: "driving",
    });
    return `https://www.google.com/maps/dir/?${params}`;
  }, [origin.latitude, origin.longitude, selected]);

  function selectPlace(place: NearbyPlace) {
    setSelected(place);
    onSelect({
      label: place.name,
      latitude: place.latitude,
      longitude: place.longitude,
      elevation: 0,
      timezone: origin.timezone,
    });
  }

  const currentWeather = selected ? weather?.data?.current : null;

  return (
    <section className="places-explorer" aria-labelledby="nearby-places-heading">
      <div className="places-explorer__toolbar">
        <div>
          <p className="event-kicker">LIVE GEOAPIFY PLACES</p>
          <h2 id="nearby-places-heading">Explore outdoor places near {origin.label}</h2>
          <p>Real map locations—not a curated or hardcoded list.</p>
        </div>
        <div className="places-explorer__filters">
          <label>
            Search radius
            <select value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))}>
              <option value={10}>10 km</option>
              <option value={25}>25 km</option>
              <option value={50}>50 km</option>
              <option value={100}>100 km</option>
            </select>
          </label>
          <button type="button" className="event-secondary" onClick={() => setRevision((value) => value + 1)} disabled={loading}>
            {loading ? <Loader2 className="spin" size={17} /> : <RefreshCw size={17} />}
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="event-error" role="alert">{error}</p>}
      {!error && loading && (
        <p className="places-explorer__loading"><Loader2 className="spin" size={18} /> Asking Geoapify for nearby viewpoints and outdoor places…</p>
      )}
      {!error && !loading && places.length === 0 && (
        <p className="places-explorer__empty">Geoapify did not return a matching outdoor place inside this radius. Try a larger radius or another search centre.</p>
      )}

      {places.length > 0 && (
        <div className="places-explorer__workspace">
          <ol className="places-explorer__list" aria-label="Nearby Geoapify places">
            {places.map((place, index) => (
              <li key={place.id}>
                <button
                  type="button"
                  className={place.id === selected?.id ? "is-selected" : undefined}
                  aria-pressed={place.id === selected?.id}
                  onClick={() => selectPlace(place)}
                >
                  <span className="places-explorer__number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="places-explorer__place">
                    <strong>{place.name}</strong>
                    <small>{place.kind}{place.city ? ` · ${place.city}` : ""}</small>
                    <span><MapPin size={13} /> {distance(place.distanceMeters)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <div className="places-explorer__map-panel">
            <NearbyPlacesMap
              origin={origin}
              places={places}
              selectedId={selected?.id}
              onSelect={selectPlace}
            />
            {selected ? (
              <article className="places-explorer__detail">
                <div>
                  <p className="event-kicker">SELECTED GEOAPIFY PLACE</p>
                  <h3>{selected.name}</h3>
                  <p>{selected.address}</p>
                </div>
                <div className="places-explorer__facts">
                  <span><MapPin size={16} /> {distance(selected.distanceMeters)}</span>
                  <span><Car size={16} /> {routeLoading ? "Calculating route…" : route ? `${duration(route.durationSeconds)} · ${(route.distanceMeters / 1000).toFixed(1)} km by road` : "Route estimate unavailable"}</span>
                  <span><Cloud size={16} /> {weatherLoading ? "Loading local weather…" : currentWeather?.cloudCover != null ? `${currentWeather.cloudCover}% cloud · ${currentWeather.wind ?? "—"} km/h wind` : "Weather unavailable"}</span>
                </div>
                <div className="places-explorer__actions">
                  <Link className="event-primary event-link-button" href="/">Use for tonight’s sky</Link>
                  <a className="event-secondary event-link-button" href={directionsUrl} target="_blank" rel="noreferrer">
                    <Navigation size={16} /> Directions <ExternalLink size={13} />
                  </a>
                </div>
                <p className="event-footnote">Place and straight-line distance: Geoapify / map: © OpenStreetMap contributors / weather: Open-Meteo. Access, opening hours, safety and darkness are not verified.</p>
              </article>
            ) : (
              <div className="places-explorer__prompt">
                <MapPin size={24} />
                <strong>Select a map marker or place</strong>
                <span>AstroScout will then request its route, weather and exact JPL sky calculation.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

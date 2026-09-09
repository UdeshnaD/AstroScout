"use client";

import { useId, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import type { LocationSearchResult } from "@/lib/location-search";

export type LocationPreset = {
  label: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  timezone?: string;
};

export const locationPresets: LocationPreset[] = [
  {
    label: "Macquarie University",
    latitude: -33.7738,
    longitude: 151.1126,
    elevation: 0,
    timezone: "Australia/Sydney",
  },
];

type LocationSearchProps = {
  value: LocationPreset;
  onChange: (location: LocationPreset) => void;
};

type SearchResponse = {
  locations?: LocationSearchResult[];
  provider?: "Geoapify" | "Open-Meteo";
  fullPlaceSearch?: boolean;
  error?: string;
};

export function LocationSearch({ value, onChange }: LocationSearchProps) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState<SearchResponse["provider"]>();
  const [fullPlaceSearch, setFullPlaceSearch] = useState(false);
  const controller = useRef<AbortController>();

  async function search() {
    const term = query.trim();
    if (term.length < 2) {
      setError("Enter at least two characters.");
      return;
    }
    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/locations/search?q=${encodeURIComponent(term)}`,
        { signal: nextController.signal },
      );
      const data = (await response.json()) as SearchResponse;
      if (!response.ok)
        throw new Error(data.error || "Unable to search locations.");
      setResults(data.locations ?? []);
      setProvider(data.provider);
      setFullPlaceSearch(Boolean(data.fullPlaceSearch));
      if (!data.locations?.length)
        setError("No matching location was found.");
    } catch (failure) {
      if (nextController.signal.aborted) return;
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to search locations.",
      );
    } finally {
      if (controller.current === nextController) setLoading(false);
    }
  }

  return (
    <div className="location-search">
      <label className="control" htmlFor={inputId}>
        <span className="control__label">
          <MapPin size={16} aria-hidden="true" />
          Search any observing location
        </span>
        <span className="location-search__input">
          <input
            id={inputId}
            className="field"
            type="search"
            value={query}
            placeholder="City, postcode, landmark or address"
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void search();
              }
            }}
          />
          <button
            type="button"
            onClick={() => void search()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="spin" size={17} />
            ) : (
              <Search size={17} />
            )}
            <span>Search</span>
          </button>
        </span>
      </label>

      {error && (
        <p className="location-search__message" role="alert">
          {error}
        </p>
      )}
      {results.length > 0 && (
        <div
          className="location-search__results"
          role="listbox"
          aria-label="Location results"
        >
          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              role="option"
              aria-selected={
                value.latitude === result.latitude &&
                value.longitude === result.longitude
              }
              onClick={() => {
                onChange({
                  label: result.label,
                  latitude: result.latitude,
                  longitude: result.longitude,
                  elevation: result.elevation,
                  timezone: result.timezone || undefined,
                });
                setQuery(result.label);
                setResults([]);
                setError("");
              }}
            >
              <strong>{result.label}</strong>
              <span>
                {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
              </span>
            </button>
          ))}
        </div>
      )}
      {provider && !error && (
        <small className="location-search__credit">
          Results:{" "}
          <a
            href={
              provider === "Geoapify"
                ? "https://www.geoapify.com/"
                : "https://open-meteo.com/en/docs/geocoding-api"
            }
            target="_blank"
            rel="noreferrer"
          >
            {provider}
          </a>
          {provider === "Geoapify" && (
            <>
              {" / "}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noreferrer"
              >
                © OpenStreetMap contributors
              </a>
            </>
          )}
          .
          {!fullPlaceSearch &&
            " City/postcode fallback active; add GEOAPIFY_API_KEY for addresses and landmarks."}
        </small>
      )}
    </div>
  );
}

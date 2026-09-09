"use client";

import { Loader2, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { Select } from "@/components/ui/Select";

export type LocationPreset = {
  label: string;
  latitude: number;
  longitude: number;
};

export const locationPresets: LocationPreset[] = [
  { label: "Macquarie University", latitude: -33.7738, longitude: 151.1126 },
  { label: "Sydney CBD", latitude: -33.8688, longitude: 151.2093 },
  { label: "Parramatta", latitude: -33.8136, longitude: 151.0034 },
  { label: "Penrith", latitude: -33.751, longitude: 150.6942 },
  { label: "Wollongong", latitude: -34.4278, longitude: 150.8931 },
  { label: "Newcastle", latitude: -32.9283, longitude: 151.7817 }
];

type LocationSearchProps = {
  value: LocationPreset;
  onChange: (location: LocationPreset) => void;
  /**
   * Applies a successful NSW postcode/place lookup. The parent owns this so
   * every place that renders the Date & location control uses its normal
   * session-update and plan-search flow.
   */
  onLocationResolved: (location: LocationLookup) => void | Promise<void>;
};

export type LocationLookup = {
  origin: LocationPreset;
  nearestSpot: { name: string };
};

// This is shared by the global planner control and the Places search so both
// accept exactly the same NSW postcode/place-name inputs.
export async function lookupNswLocation(query: string): Promise<LocationLookup> {
  const response = await fetch(`/api/spots?q=${encodeURIComponent(query.trim())}`);
  const data = (await response.json()) as {
    error?: string;
    origin?: LocationPreset;
    nearestSpot?: { name: string };
  };
  if (!response.ok || !data.origin || !data.nearestSpot)
    throw new Error(data.error ?? "Location lookup failed.");
  return { origin: data.origin, nearestSpot: data.nearestSpot };
}

export function LocationSearch({
  value,
  onChange,
  onLocationResolved,
}: LocationSearchProps) {
  const [locationQuery, setLocationQuery] = useState("");
  const [locationError, setLocationError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const options = locationPresets.some((location) => location.label === value.label)
    ? locationPresets
    : [value, ...locationPresets];

  async function findLocation() {
    const normalized = locationQuery.trim();
    if (!normalized) {
      setLocationError("Enter a NSW town, suburb or four-digit postcode.");
      return;
    }
    setLookingUp(true);
    setLocationError("");
    try {
      const location = await lookupNswLocation(normalized);
      await onLocationResolved(location);
      setLocationQuery("");
    } catch (error) {
      setLocationError(
        error instanceof Error ? error.message : "Location lookup failed.",
      );
    } finally {
      setLookingUp(false);
    }
  }

  return (
    <div className="control">
      <span className="control__label">
        <MapPin size={16} aria-hidden="true" />
        Location
      </span>
      <Select
        value={value.label}
        onChange={(event) => {
          const selected = options.find((location) => location.label === event.target.value);
          if (selected) onChange(selected);
        }}
      >
        {options.map((location) => (
          <option key={location.label} value={location.label}>
            {location.label}
          </option>
        ))}
      </Select>
      <div className="postcode-lookup">
        <label htmlFor="nsw-location">Search NSW</label>
        <small>Enter a postcode or place name.</small>
        <div>
          <input
            id="nsw-location"
            onChange={(event) => setLocationQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void findLocation();
              }
            }}
            placeholder="e.g. Katoomba or 2780"
            value={locationQuery}
          />
          <button
            type="button"
            onClick={() => void findLocation()}
            disabled={lookingUp}
          >
            {lookingUp ? <Loader2 className="spin" size={16} /> : <Search size={16} />}
            Find nearest
          </button>
        </div>
        {locationError && <span role="alert">{locationError}</span>}
      </div>
    </div>
  );
}

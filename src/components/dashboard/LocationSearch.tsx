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
  onPostcodeResolved: (location: LocationPreset, nearestSpotName: string) => void;
};

export function LocationSearch({
  value,
  onChange,
  onPostcodeResolved,
}: LocationSearchProps) {
  const [postcode, setPostcode] = useState("");
  const [postcodeError, setPostcodeError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const options = locationPresets.some((location) => location.label === value.label)
    ? locationPresets
    : [value, ...locationPresets];

  async function findPostcode() {
    const normalized = postcode.trim();
    if (!/^\d{4}$/.test(normalized)) {
      setPostcodeError("Enter a four-digit NSW postcode.");
      return;
    }
    setLookingUp(true);
    setPostcodeError("");
    try {
      const response = await fetch(`/api/spots?postcode=${encodeURIComponent(normalized)}`);
      const data = (await response.json()) as {
        error?: string;
        origin?: LocationPreset;
        nearestSpot?: { name: string };
      };
      if (!response.ok || !data.origin || !data.nearestSpot)
        throw new Error(data.error ?? "Postcode lookup failed.");
      onPostcodeResolved(data.origin, data.nearestSpot.name);
    } catch (error) {
      setPostcodeError(
        error instanceof Error ? error.message : "Postcode lookup failed.",
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
        <label htmlFor="nsw-postcode">NSW postcode</label>
        <div>
          <input
            id="nsw-postcode"
            inputMode="numeric"
            maxLength={4}
            onChange={(event) => setPostcode(event.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 2000"
            value={postcode}
          />
          <button
            type="button"
            onClick={() => void findPostcode()}
            disabled={lookingUp}
          >
            {lookingUp ? <Loader2 className="spin" size={16} /> : <Search size={16} />}
            Find nearest
          </button>
        </div>
        {postcodeError && <span role="alert">{postcodeError}</span>}
      </div>
    </div>
  );
}

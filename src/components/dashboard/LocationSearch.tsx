"use client";

import { MapPin } from "lucide-react";
import { Select } from "@/components/ui/Select";

export type LocationPreset = {
  label: string;
  latitude: number;
  longitude: number;
};

export const locationPresets: LocationPreset[] = [
  { label: "Sydney CBD", latitude: -33.8688, longitude: 151.2093 },
  { label: "Parramatta", latitude: -33.8136, longitude: 151.0034 },
  { label: "Penrith", latitude: -33.751, longitude: 150.6942 },
  { label: "Wollongong", latitude: -34.4278, longitude: 150.8931 },
  { label: "Newcastle", latitude: -32.9283, longitude: 151.7817 }
];

type LocationSearchProps = {
  value: LocationPreset;
  onChange: (location: LocationPreset) => void;
};

export function LocationSearch({ value, onChange }: LocationSearchProps) {
  return (
    <label className="control">
      <span className="control__label">
        <MapPin size={16} aria-hidden="true" />
        Location
      </span>
      <Select
        value={value.label}
        onChange={(event) => {
          const selected = locationPresets.find((location) => location.label === event.target.value);
          if (selected) onChange(selected);
        }}
      >
        {locationPresets.map((location) => (
          <option key={location.label} value={location.label}>
            {location.label}
          </option>
        ))}
      </Select>
    </label>
  );
}

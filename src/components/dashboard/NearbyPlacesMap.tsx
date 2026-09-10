"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { NearbyPlace } from "@/lib/nearby-places";

export function NearbyPlacesMap({
  origin,
  places,
  selectedId,
  onSelect,
}: {
  origin: { latitude: number; longitude: number };
  places: NearbyPlace[];
  selectedId?: string;
  onSelect: (place: NearbyPlace) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap>();
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    async function renderMap() {
      const L = await import("leaflet");
      if (cancelled || !element.current) return;
      map.current?.remove();
      const instance = L.map(element.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).setView([origin.latitude, origin.longitude], 10);
      map.current = instance;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(instance);

      const bounds: Array<[number, number]> = [[origin.latitude, origin.longitude]];
      L.marker([origin.latitude, origin.longitude], {
        icon: L.divIcon({
          className: "places-map-pin places-map-pin--origin",
          html: "<span>Start</span>",
          iconSize: [48, 32],
          iconAnchor: [24, 16],
        }),
        keyboard: true,
        title: "Search centre",
      }).addTo(instance);

      places.forEach((place, index) => {
        bounds.push([place.latitude, place.longitude]);
        const marker = L.marker([place.latitude, place.longitude], {
          icon: L.divIcon({
            className: `places-map-pin${place.id === selectedId ? " places-map-pin--selected" : ""}`,
            html: `<span>${index + 1}</span>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
          keyboard: true,
          title: place.name,
        }).addTo(instance);
        marker.on("click", () => onSelectRef.current(place));
      });

      if (bounds.length > 1) {
        instance.fitBounds(bounds, { padding: [32, 32], maxZoom: 12 });
      }
    }
    void renderMap();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = undefined;
    };
  }, [origin.latitude, origin.longitude, places, selectedId]);

  return (
    <div
      ref={element}
      className="places-map"
      role="region"
      aria-label="Interactive map of nearby places returned by Geoapify"
    />
  );
}

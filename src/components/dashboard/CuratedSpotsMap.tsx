"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import { curatedNswSpots, type CuratedSpot } from "@/data/spots";

const tiles =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";
const attribution =
  'Tiles &copy; <a href="https://www.esri.com/">Esri</a> and data providers';

export function CuratedSpotsMap({
  onSelect,
}: {
  onSelect: (spot: CuratedSpot) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap>();
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !element.current) return;
      const instance = L.map(element.current, { scrollWheelZoom: false }).setView(
        [-33.75, 150.85],
        7,
      );
      map.current = instance;
      L.tileLayer(tiles, { maxZoom: 19, attribution }).addTo(instance);
      curatedNswSpots.forEach((spot) => {
        const popup = document.createElement("div");
        const name = document.createElement("strong");
        const detail = document.createElement("div");
        const action = document.createElement("button");
        name.textContent = spot.name;
        detail.textContent = `${spot.region} · Estimated Bortle ${spot.bortle}`;
        action.type = "button";
        action.className = "curated-map-use";
        action.textContent = "View tonight from here";
        action.addEventListener("click", () => {
          instance.closePopup();
          onSelectRef.current(spot);
        });
        popup.append(name, detail, action);
        const marker = L.circleMarker([spot.latitude, spot.longitude], {
          radius: 6,
          color: "#174f3b",
          weight: 2,
          fillColor: spot.bortle <= 4 ? "#d3a65b" : "#fff",
          fillOpacity: 1,
        }).bindPopup(popup).addTo(instance);
        const markerElement = marker.getElement();
        markerElement?.setAttribute("role", "button");
        markerElement?.setAttribute("tabindex", "0");
        markerElement?.setAttribute("aria-label", `Select ${spot.name}`);
        markerElement?.addEventListener("keydown", (event) => {
          const keyboardEvent = event as KeyboardEvent;
          if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
            event.preventDefault();
            marker.openPopup();
          }
        });
      });
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = undefined;
    };
  }, []);

  return (
    <section className="curated-spots-map">
      <div>
        <p className="event-kicker">CURATED NSW SPOTS</p>
        <h2>24 places to start looking</h2>
        <p>Choose a marker, then view tonight&apos;s sky from its exact coordinates. Verify access, closures and safety before travelling.</p>
      </div>
      <div ref={element} className="places-map" role="region" aria-label="Map of 24 curated NSW observing spots" />
    </section>
  );
}

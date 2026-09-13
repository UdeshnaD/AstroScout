"use client";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import { curatedNswSpots } from "@/data/spots";

export function CuratedSpotsMap() {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap>();
  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !element.current) return;
      const instance = L.map(element.current, { scrollWheelZoom: false }).setView([-33.75, 150.85], 7);
      map.current = instance;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(instance);
      curatedNswSpots.forEach((spot) => L.circleMarker([spot.latitude, spot.longitude], { radius: 6, color: "#174f3b", weight: 2, fillColor: spot.bortle <= 4 ? "#d3a65b" : "#fff", fillOpacity: 1 }).bindPopup(`<strong>${spot.name}</strong><br>${spot.region} · Bortle ${spot.bortle}`).addTo(instance));
    });
    return () => { cancelled = true; map.current?.remove(); map.current = undefined; };
  }, []);
  return <section className="curated-spots-map"><div><p className="event-kicker">CURATED NSW SPOTS</p><h2>24 places to start looking</h2><p>Click a marker for its region and estimated Bortle class. Verify access, closures and safety before travelling.</p></div><div ref={element} className="places-map" role="region" aria-label="Map of 24 curated NSW observing spots" /></section>;
}

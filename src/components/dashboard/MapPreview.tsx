"use client";

import { useEffect, useRef, useState } from "react";
import { Expand, MapPin } from "lucide-react";
import type * as Leaflet from "leaflet";
import type { RankedPlan } from "@/lib/recommender";

type Props = {
  plans: RankedPlan[];
  selectedId: string;
  onSelect: (id: string) => void;
  origin: { latitude: number; longitude: number; label: string };
};

export function MapPreview({ plans, selectedId, onSelect, origin }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map>();
  const layer = useRef<Leaflet.LayerGroup>();
  const api = useRef<typeof Leaflet>();
  const boundsKey = useRef("");
  const select = useRef(onSelect);
  select.current = onSelect;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;
    import("leaflet")
      .then((L) => {
        if (disposed || !container.current) return;
        api.current = L;
        const instance = L.map(container.current, {
          scrollWheelZoom: false,
        }).setView([-33.7738, 151.1126], 9);
        map.current = instance;
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        })
          .on("tileerror", () => setError(true))
          .addTo(instance);
        layer.current = L.layerGroup().addTo(instance);
        observer = new ResizeObserver(() => instance.invalidateSize());
        observer.observe(container.current);
        setReady(true);
      })
      .catch(() => {
        if (!disposed) setError(true);
      });
    return () => {
      disposed = true;
      observer?.disconnect();
      map.current?.remove();
      map.current = undefined;
    };
  }, []);

  useEffect(() => {
    const L = api.current;
    if (!ready || !L || !layer.current || !map.current) return;
    layer.current.clearLayers();
    L.circleMarker([origin.latitude, origin.longitude], {
      radius: 7,
      color: "#ffffff",
      weight: 3,
      fillColor: "#253a61",
      fillOpacity: 1,
    })
      .bindTooltip(`Start: ${origin.label}`)
      .addTo(layer.current);
    plans.forEach((plan) => {
      const marker = L.marker([plan.latitude, plan.longitude], {
        icon: L.divIcon({
          className: "site-marker",
          html: `<span class="site-marker__dot ${plan.id === selectedId ? "is-selected" : ""}">${plan.rank}</span>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        }),
        title: `${plan.rank}. ${plan.name}, score ${plan.score}`,
        keyboard: true,
      });
      const label = document.createElement("span");
      label.textContent = `${plan.name} | ${plan.score}/100`;
      marker
        .bindTooltip(label)
        .on("click", () => select.current(plan.id))
        .addTo(layer.current!);
    });
    const key = `${origin.latitude},${origin.longitude}:${plans
      .map((p) => p.id)
      .sort()
      .join(",")}`;
    if (key !== boundsKey.current) {
      boundsKey.current = key;
      const bounds = L.latLngBounds([
        [origin.latitude, origin.longitude],
        ...plans.map((p): [number, number] => [p.latitude, p.longitude]),
      ]);
      map.current.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: 11,
        animate: false,
      });
    }
  }, [plans, selectedId, origin, ready]);

  function fitAll() {
    const L = api.current;
    if (!L || !map.current) return;
    map.current.fitBounds(
      L.latLngBounds([
        [origin.latitude, origin.longitude],
        ...plans.map((p): [number, number] => [p.latitude, p.longitude]),
      ]),
      { padding: [45, 45], maxZoom: 11 },
    );
  }

  return (
    <section className="explorer-map" aria-label="Observing locations map">
      <div ref={container} className="leaflet-surface" />
      <div className="map-caption">
        <MapPin size={14} />
        <span>Sydney & surrounds</span>
        <button
          type="button"
          className="icon-button"
          onClick={fitAll}
          aria-label="Fit all locations"
          title="Fit all locations"
        >
          <Expand size={16} />
        </button>
      </div>
      {!ready && (
        <div className="map-loading">
          {error
            ? "Map unavailable. Locations are available in the list."
            : "Loading map..."}
        </div>
      )}
      {error && ready && (
        <div className="map-error">
          Some map tiles are unavailable. The location list remains available.
        </div>
      )}
    </section>
  );
}

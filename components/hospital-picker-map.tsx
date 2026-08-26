"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { MapPin } from "lucide-react";

export type MapHospital = { id: string; name: string; latitude: number; longitude: number; address?: string | null; distance_km?: number; available_beds?: number };
type Props = { userLocation: { latitude: number; longitude: number }; hospitals: MapHospital[]; careLevel: string; selectedId?: string | null; onSelect: (hospital: MapHospital) => void; onRouteChange?: (route: { duration: string; distance: string } | null) => void };
declare global { interface Window { L?: any } }

export function HospitalPickerMap({ userLocation, hospitals, careLevel, selectedId, onSelect, onRouteChange }: Props) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready || !window.L || !elementRef.current) return;
    const L = window.L;
    if (!mapRef.current) mapRef.current = L.map(elementRef.current).setView([userLocation.latitude, userLocation.longitude], 12);
    if (!mapRef.current.__tiles) {
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(mapRef.current);
      mapRef.current.__tiles = true;
    }
    layersRef.current.forEach((layer) => layer.remove()); layersRef.current = [];
    layersRef.current.push(L.circleMarker([userLocation.latitude, userLocation.longitude], { radius: 8, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }).addTo(mapRef.current).bindPopup("Patient location"));
    const bounds = L.latLngBounds([[userLocation.latitude, userLocation.longitude]]);
    hospitals.forEach((hospital) => {
      const selected = hospital.id === selectedId;
      const marker = L.circleMarker([hospital.latitude, hospital.longitude], { radius: selected ? 11 : 8, color: "#fff", weight: 2, fillColor: selected ? "#0f8d8a" : "#e85d4c", fillOpacity: 1 }).addTo(mapRef.current).bindPopup(`<strong>${hospital.name}</strong><br>${careLevel}: ${hospital.available_beds ?? "?"} bed(s)`).on("click", () => onSelect(hospital));
      layersRef.current.push(marker); bounds.extend([hospital.latitude, hospital.longitude]);
    });
    const selected = hospitals.find((hospital) => hospital.id === selectedId);
    if (!selected) { mapRef.current.fitBounds(bounds, { padding: [42, 42], maxZoom: 13 }); onRouteChange?.(null); return; }
    const controller = new AbortController();
    fetch(`https://router.project-osrm.org/route/v1/driving/${userLocation.longitude},${userLocation.latitude};${selected.longitude},${selected.latitude}?overview=full&geometries=geojson`, { signal: controller.signal })
      .then((response) => response.json()).then((data) => {
        const route = data.routes?.[0]; if (!route) throw new Error("No route");
        const line = L.geoJSON(route.geometry, { style: { color: "#0f8d8a", weight: 5, opacity: 0.8 } }).addTo(mapRef.current);
        layersRef.current.push(line); mapRef.current.fitBounds(line.getBounds(), { padding: [42, 42] });
        onRouteChange?.({ distance: `${(route.distance / 1000).toFixed(1)} km`, duration: `${Math.round(route.duration / 60)} min` });
      }).catch(() => onRouteChange?.(null));
    return () => controller.abort();
  }, [ready, userLocation, hospitals, careLevel, selectedId, onSelect, onRouteChange]);

  return <><Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" strategy="afterInteractive" onLoad={() => setReady(true)} /><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><div className="hospital-map-wrap" ref={elementRef} role="img" aria-label="Map of available facilities and patient transport route" />{!ready && <div className="hospital-map-loading"><MapPin size={18} /> Loading map...</div>}</>;
}

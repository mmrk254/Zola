"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Crosshair, Hospital, Minus, Navigation, Plus } from "lucide-react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapHospital = { id: string; name: string; latitude: number; longitude: number; address?: string | null; distance_km?: number; available_beds?: number };
type Coordinates = { latitude: number; longitude: number };
type Props = { userLocation: Coordinates; hospitals: MapHospital[]; selectedId?: string | null; onSelect: (hospital: MapHospital) => void; careLevel: string; routeCoordinates?: Coordinates[]; pickupLabel?: string };
const EMPTY_ROUTE: Coordinates[] = [];
const valid = (point: Coordinates) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;

export function HospitalPickerMap({ userLocation, hospitals, selectedId, onSelect, careLevel, routeCoordinates = EMPTY_ROUTE, pickupLabel = "Patient location" }: Props) {
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const engine = useRef<typeof Leaflet | null>(null);
  const bounds = useRef<Leaflet.LatLngBounds | null>(null);
  const fitted = useRef("");
  const select = useRef(onSelect);
  select.current = onSelect;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const selected = hospitals.find((hospital) => hospital.id === selectedId);
  const hasRoute = routeCoordinates.filter(valid).length > 1;
  // Compare data, not array/callback identities: parent renders must not reset a user's zoom.
  const data = JSON.stringify({ userLocation, hospitals, selectedId, routeCoordinates });

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    import("leaflet").then((L) => {
      if (cancelled || !mapElement.current) return;
      engine.current = L;
      const instance = L.map(mapElement.current, { zoomControl: false, scrollWheelZoom: true, minZoom: 3, maxZoom: 19, attributionControl: true, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false });
      map.current = instance;
      instance.setView([0, 0], 3);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).on("tileerror", () => { if (!cancelled) setError(true); }).on("tileload", () => { if (!cancelled) setError(false); }).addTo(instance);
      observer = new ResizeObserver(() => instance.invalidateSize({ pan: false }));
      observer.observe(mapElement.current);
      setReady(true);
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; observer?.disconnect(); map.current?.stop(); map.current?.remove(); map.current = null; fitted.current = ""; };
  }, []);

  useEffect(() => {
    const L = engine.current;
    const instance = map.current;
    if (!ready || !L || !instance) return;
    const current: Pick<Props, "userLocation" | "hospitals" | "selectedId" | "routeCoordinates"> = JSON.parse(data);
    const layers = L.layerGroup().addTo(instance);
    const points: Leaflet.LatLngTuple[] = [];
    const route: Leaflet.LatLngTuple[] = (current.routeCoordinates ?? []).filter(valid).map((point) => [point.latitude, point.longitude]);
    if (route.length > 1) {
      // Both strokes live in the geographic map pane and retain their pixel width at every zoom.
      L.polyline(route, { color: "#ffffff", weight: 11, opacity: 1, smoothFactor: 0.5, interactive: false }).addTo(layers);
      L.polyline(route, { color: "#2769ed", weight: 6, opacity: 1, smoothFactor: 0.5, interactive: false, className: "transport-route" }).addTo(layers);
      points.push(...route);
    }
    if (valid(current.userLocation)) {
      const position: Leaflet.LatLngTuple = [current.userLocation.latitude, current.userLocation.longitude];
      points.push(position);
      L.marker(position, { icon: L.divIcon({ className: "transport-pickup", html: '<span></span>', iconSize: [26, 26], iconAnchor: [13, 13] }), title: "Patient pickup location", zIndexOffset: 1000 }).addTo(layers);
    }
    current.hospitals.filter(valid).forEach((hospital) => {
      const active = hospital.id === current.selectedId;
      const position: Leaflet.LatLngTuple = [hospital.latitude, hospital.longitude];
      if (!current.selectedId || active) points.push(position);
      const marker = L.marker(position, { icon: L.divIcon({ className: `transport-destination${active ? " is-selected" : ""}`, html: '<span aria-hidden="true">+</span>', iconSize: [34, 40], iconAnchor: [17, 40] }), title: hospital.name, zIndexOffset: active ? 900 : 100 }).addTo(layers);
      const label = document.createElement("span");
      label.textContent = hospital.name;
      marker.bindTooltip(label, { direction: "top", offset: [0, -40], className: "transport-marker-label" });
      marker.on("click", () => select.current(hospital));
    });
    if (points.length) {
      bounds.current = L.latLngBounds(points);
      const key = JSON.stringify(points);
      if (key !== fitted.current) {
        instance.fitBounds(bounds.current, { paddingTopLeft: [48, 76], paddingBottomRight: [64, 50], maxZoom: 15, animate: false });
        fitted.current = key;
      }
    }
    return () => { layers.remove(); };
  }, [ready, data]);

  return <section className="transport-map" aria-label="Patient transport map">
    <div className="transport-map-stage">
      <div ref={mapElement} className="transport-map-canvas" aria-label="Interactive map showing patient pickup and hospitals" />
      <div className="transport-map-heading"><span className="transport-map-symbol"><Navigation size={16} /></span><div><strong>{selected ? "Your transport route" : "Find the right care"}</strong><span>{selected ? hasRoute ? "Patient pickup to receiving hospital" : "Pickup and destination" : `${hospitals.length} nearby ${careLevel} facilities`}</span></div></div>
      {!ready && !error && <div className="transport-map-loading" role="status">Loading your map…</div>}
      {error && <div className="transport-map-error" role="status">Map tiles could not load. Check your connection.</div>}
      <div className="transport-map-controls">
        <button type="button" aria-label="Zoom in" disabled={!ready} onClick={() => map.current?.zoomIn()}><Plus size={19} /></button>
        <button type="button" aria-label="Zoom out" disabled={!ready} onClick={() => map.current?.zoomOut()}><Minus size={19} /></button>
        <button type="button" aria-label="Show entire route" title="Show entire route" disabled={!ready} onClick={() => { if (bounds.current) map.current?.fitBounds(bounds.current, { paddingTopLeft: [48, 76], paddingBottomRight: [64, 50], maxZoom: 15 }); }}><Crosshair size={19} /></button>
      </div>
      <div className="transport-map-key"><i /> Patient pickup <span /> <b>+</b> Hospital</div>
    </div>
    <div className="transport-map-details">
      <div className="transport-journey"><div className="transport-journey-track"><i /><span /><b /></div><div><div><small>PICKUP</small><strong>{pickupLabel}</strong></div><div><small>{selected ? "DESTINATION" : "DESTINATION · SELECT A HOSPITAL"}</small><strong>{selected?.name ?? "Where should the patient go?"}</strong>{selected?.address && <p>{selected.address}</p>}</div></div>{selected && <ArrowUpRight size={21} className="transport-journey-arrow" />}</div>
      {hospitals.length > 0 && <div className="transport-facilities" aria-label="Choose receiving hospital">{hospitals.map((hospital) => <button key={hospital.id} type="button" aria-pressed={hospital.id === selectedId} className={`transport-facility${hospital.id === selectedId ? " is-selected" : ""}`} onClick={() => onSelect(hospital)}><span className="transport-facility-icon"><Hospital size={20} /></span><span><strong>{hospital.name}</strong><small>{hospital.available_beds == null ? "Availability unknown" : `${hospital.available_beds} ${careLevel} bed${hospital.available_beds === 1 ? "" : "s"} available`}{hospital.distance_km != null ? ` · ${hospital.distance_km.toFixed(1)} km away` : ""}</small></span><span className="transport-facility-check">{hospital.id === selectedId && <Check size={13} />}</span></button>)}</div>}
    </div>
  </section>;
}

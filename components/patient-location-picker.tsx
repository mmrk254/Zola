"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Check, Crosshair, Loader2, MapPin, Minus, Plus, Search } from "lucide-react";
import type * as Leaflet from "leaflet";
import { getUserLocation } from "@/lib/geolocation";
import "leaflet/dist/leaflet.css";

export type PatientPlace = { name: string; latitude: number; longitude: number };
type Props = { initialCenter: PatientPlace | null; value: PatientPlace | null; onChange: (place: PatientPlace | null) => void };
const valid = (p: PatientPlace) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180;

export function PatientLocationPicker({ initialCenter, value, onChange }: Props) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const engine = useRef<typeof Leaflet | null>(null);
  const change = useRef(onChange); change.current = onChange;
  const center = useRef(initialCenter);
  const searchRequest = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<PatientPlace[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [tileError, setTileError] = useState(false);
  function choose(place: PatientPlace) {
    ++requestVersion.current; searchRequest.current?.abort(); setBusy(false);
    change.current(place); setQuery(place.name); setError(null);
  }
  const chooseRef = useRef(choose); chooseRef.current = choose;

  useEffect(() => {
    let cancelled = false; let observer: ResizeObserver | undefined;
    import("leaflet").then(L => {
      if (cancelled || !element.current) return;
      engine.current = L;
      const c = center.current;
      const instance = L.map(element.current, { zoomControl: false, minZoom: 3, maxZoom: 19, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false }).setView(c ? [c.latitude, c.longitude] : [-1.2864, 36.8172], 12);
      map.current = instance;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' })
        .on("tileerror", () => { if (!cancelled) setTileError(true); }).on("tileload", () => { if (!cancelled) setTileError(false); }).addTo(instance);
      instance.on("click", (event: Leaflet.LeafletMouseEvent) => chooseRef.current({ name: `Map pin (${event.latlng.lat.toFixed(5)}, ${event.latlng.lng.toFixed(5)})`, latitude: event.latlng.lat, longitude: event.latlng.lng }));
      observer = new ResizeObserver(() => instance.invalidateSize({ pan: false })); observer.observe(element.current);
      setReady(true);
    }).catch(() => { if (!cancelled) setError("The map could not load. You can still search and choose a result below."); });
    return () => { cancelled = true; ++requestVersion.current; searchRequest.current?.abort(); observer?.disconnect(); map.current?.stop(); map.current?.remove(); map.current = null; };
  }, []);

  const mapData = JSON.stringify({ results, value });
  useEffect(() => {
    const L = engine.current; const instance = map.current;
    if (!ready || !L || !instance) return;
    const current: { results: PatientPlace[]; value: PatientPlace | null } = JSON.parse(mapData);
    const layer = L.layerGroup().addTo(instance);
    current.results.filter(valid).forEach((place, index) => {
      const label = document.createElement("span"); label.textContent = place.name;
      L.marker([place.latitude, place.longitude], { title: `Result ${index + 1}: ${place.name}`, icon: L.divIcon({ className: "patient-search-pin", html: `<span>${index + 1}</span>`, iconSize: [32, 32], iconAnchor: [16, 16] }) })
        .bindTooltip(label).on("click", () => chooseRef.current(place)).addTo(layer);
    });
    if (current.value && valid(current.value)) {
      const p = current.value;
      L.marker([p.latitude, p.longitude], { title: "Selected patient pickup", zIndexOffset: 1000, draggable: true, icon: L.divIcon({ className: "transport-pickup", html: '<span></span>', iconSize: [26, 26], iconAnchor: [13, 13] }) })
        .on("dragend", event => { const point = event.target.getLatLng(); chooseRef.current({ name: `Map pin (${point.lat.toFixed(5)}, ${point.lng.toFixed(5)})`, latitude: point.lat, longitude: point.lng }); }).addTo(layer);
      instance.setView([p.latitude, p.longitude], Math.max(instance.getZoom(), 15), { animate: false });
    } else if (current.results.length) instance.fitBounds(L.latLngBounds(current.results.filter(valid).map(p => [p.latitude, p.longitude])), { padding: [45, 45], maxZoom: 15, animate: false });
    return () => { layer.remove(); };
  }, [ready, mapData]);

  async function search(event: FormEvent) {
    event.preventDefault(); if (query.trim().length < 3) return;
    searchRequest.current?.abort(); const controller = new AbortController(); searchRequest.current = controller;
    const version = ++requestVersion.current; setBusy(true); setError(null); setSearched(false); onChange(null);
    try {
      // Explicit searches rather than autocomplete requests on every keystroke.
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=ke&q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
      if (!response.ok) throw new Error("Location search is unavailable. Try again or tap the map to place a pickup pin.");
      const data = await response.json(); if (version !== requestVersion.current) return;
      setResults(data.map((p: { display_name: string; lat: string; lon: string }) => ({ name: p.display_name, latitude: Number(p.lat), longitude: Number(p.lon) })).filter(valid)); setSearched(true);
    } catch (err) { if (!controller.signal.aborted && version === requestVersion.current) setError(err instanceof Error ? err.message : "Could not search locations."); }
    finally { if (version === requestVersion.current) setBusy(false); }
  }
  async function locate() {
    ++requestVersion.current; searchRequest.current?.abort(); const version = requestVersion.current; setBusy(true); setError(null);
    try { const point = await getUserLocation(); if (version === requestVersion.current) choose({ ...point, name: "Current device location" }); }
    catch (err) { if (version === requestVersion.current) setError(err instanceof Error ? err.message : "Location permission is unavailable."); }
    finally { if (version === requestVersion.current) setBusy(false); }
  }
  return <section className="patient-picker" aria-label="Select patient pickup on the map">
    <form className="patient-map-search" onSubmit={search}><label htmlFor="patient-map-query"><Search size={18} /><span className="sr-only">Search patient location</span></label><input id="patient-map-query" value={query} placeholder="Road, estate, landmark or facility" onChange={event => { ++requestVersion.current; searchRequest.current?.abort(); setBusy(false); setQuery(event.target.value); onChange(null); setResults([]); setSearched(false); setError(null); }} /><button type="submit" disabled={busy || query.trim().length < 3}>{busy ? <Loader2 size={17} className="spin" /> : "Search"}</button></form>
    <div className="transport-map-stage patient-picker-stage"><div ref={element} className="transport-map-canvas" aria-label="Patient location map" />{tileError && <div className="transport-map-error" role="status">Map tiles unavailable. Search results can still be selected.</div>}<div className="patient-map-hint">Search above or tap the map to place a pin</div><div className="transport-map-controls"><button type="button" aria-label="Zoom in" disabled={!ready} onClick={() => map.current?.zoomIn()}><Plus size={19} /></button><button type="button" aria-label="Zoom out" disabled={!ready} onClick={() => map.current?.zoomOut()}><Minus size={19} /></button><button type="button" aria-label="Use my current location" title="Use my current location" disabled={busy} onClick={() => void locate()}><Crosshair size={19} /></button></div></div>
    <div className="patient-picker-results">
      {error && <p className="notice error" role="alert">{error}</p>}
      {busy && <p role="status">Finding location…</p>}
      {searched && !results.length && !busy && <p role="status">No matches found. Try a nearby landmark or tap the map.</p>}
      {results.map((place, index) => <button type="button" key={`${place.latitude}:${place.longitude}:${index}`} aria-pressed={value?.latitude === place.latitude && value?.longitude === place.longitude} onClick={() => choose(place)}><b>{index + 1}</b><span>{place.name}</span><MapPin size={16} /></button>)}
      {value && <div className="pickup-confirmation"><Check size={20} /><div><strong>Patient pickup selected</strong><small>{value.name}</small></div></div>}
    </div>
  </section>;
}

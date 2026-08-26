"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";

export type MapHospital = { id: string; name: string; latitude: number; longitude: number; address?: string | null; distance_km?: number; available_beds?: number };
type Coordinates = { latitude: number; longitude: number };
type Props = { userLocation: Coordinates; hospitals: MapHospital[]; selectedId?: string | null; onSelect: (hospital: MapHospital) => void; careLevel: string; routeCoordinates?: Coordinates[] };

export function HospitalPickerMap({ userLocation, hospitals, selectedId, onSelect, careLevel, routeCoordinates = [] }: Props) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const overlays = useRef<any[]>([]);
  const [mapsReady, setMapsReady] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const selected = hospitals.find((hospital) => hospital.id === selectedId);

  useEffect(() => {
    if (!mapsReady || !apiKey || !mapElement.current || !(window as any).google?.maps) return;
    const maps = (window as any).google.maps;
    if (!mapInstance.current) mapInstance.current = new maps.Map(mapElement.current, { center: { lat: userLocation.latitude, lng: userLocation.longitude }, zoom: 12, mapTypeControl: false, streetViewControl: false, fullscreenControl: false });
    overlays.current.forEach((overlay) => overlay.setMap?.(null)); overlays.current = [];
    const bounds = new maps.LatLngBounds();
    const patientMarker = new maps.Marker({ map: mapInstance.current, position: { lat: userLocation.latitude, lng: userLocation.longitude }, title: "Patient location", icon: { path: maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#2563eb", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 } });
    overlays.current.push(patientMarker); bounds.extend(patientMarker.getPosition());
    hospitals.forEach((hospital) => {
      const marker = new maps.Marker({ map: mapInstance.current, position: { lat: hospital.latitude, lng: hospital.longitude }, title: hospital.name, icon: { path: maps.SymbolPath.CIRCLE, scale: hospital.id === selectedId ? 11 : 8, fillColor: hospital.id === selectedId ? "#0f8d8a" : "#e85d4c", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 } });
      marker.addListener("click", () => onSelect(hospital)); overlays.current.push(marker); bounds.extend(marker.getPosition());
    });
    if (routeCoordinates.length > 1) {
      const line = new maps.Polyline({ map: mapInstance.current, path: routeCoordinates.map((point) => ({ lat: point.latitude, lng: point.longitude })), strokeColor: "#2563eb", strokeOpacity: 0.9, strokeWeight: 5 });
      overlays.current.push(line); routeCoordinates.forEach((point) => bounds.extend({ lat: point.latitude, lng: point.longitude }));
    }
    mapInstance.current.fitBounds(bounds, 42);
  }, [mapsReady, apiKey, userLocation, hospitals, selectedId, onSelect, routeCoordinates]);

  const fallbackUrl = useMemo(() => {
    const target = selected ?? hospitals[0]; const lat = target ? (target.latitude + userLocation.latitude) / 2 : userLocation.latitude; const lng = target ? (target.longitude + userLocation.longitude) / 2 : userLocation.longitude;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.04}%2C${lat - 0.04}%2C${lng + 0.04}%2C${lat + 0.04}&layer=mapnik&marker=${userLocation.latitude}%2C${userLocation.longitude}`;
  }, [userLocation, hospitals, selected]);

  return <div className="stable-map">
    {apiKey ? <><Script src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}`} strategy="afterInteractive" onLoad={() => setMapsReady(true)} /><div ref={mapElement} className="hospital-map-wrap" aria-label="Patient transport map" /></> : <iframe title="Patient and facility map" src={fallbackUrl} className="hospital-map-wrap" loading="lazy" />}
    <div className="stable-map-points"><span className="map-point patient">Patient location</span>{hospitals.map((hospital) => <button key={hospital.id} type="button" className={hospital.id === selectedId ? "selected" : ""} onClick={() => onSelect(hospital)}>{hospital.name} · {hospital.available_beds ?? 0} {careLevel} bed{hospital.available_beds === 1 ? "" : "s"}</button>)}</div>
  </div>;
}

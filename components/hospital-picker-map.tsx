"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { MapPin } from "lucide-react";

export type MapHospital = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  distance_km?: number;
  available_beds?: number;
};

type Props = {
  userLocation: { latitude: number; longitude: number };
  hospitals: MapHospital[];
  careLevel: string;
  selectedId?: string | null;
  onSelect: (hospital: MapHospital) => void;
  onRouteChange?: (route: { duration: string; distance: string } | null) => void;
};

const MAPS_CALLBACK = "__zolaMapsReady";

export function HospitalPickerMap({ userLocation, hospitals, careLevel, selectedId, onSelect, onRouteChange }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const directionsRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
  if (typeof window !== "undefined") {
      (window as unknown as Record<string, () => void>)[MAPS_CALLBACK] = () => setMapsReady(true);
    }
    if ((window as unknown as { google?: typeof google }).google?.maps) {
      setMapsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!mapsReady || !apiKey || !mapRef.current || !(window as unknown as { google?: typeof google }).google) return;

    const googleMaps = (window as unknown as { google: typeof google }).google;

    if (!mapInstance.current) {
      mapInstance.current = new googleMaps.maps.Map(mapRef.current, {
        center: { lat: userLocation.latitude, lng: userLocation.longitude },
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { featureType: "poi.medical", stylers: [{ visibility: "on" }] },
          { featureType: "transit", stylers: [{ visibility: "simplified" }] }
        ]
      });
    }

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    userMarkerRef.current?.setMap(null);

    userMarkerRef.current = new googleMaps.maps.Marker({
      map: mapInstance.current,
      position: { lat: userLocation.latitude, lng: userLocation.longitude },
      title: "Your location",
      icon: {
        path: googleMaps.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: "#2563eb",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 2
      },
      zIndex: 1000
    });

    const bounds = new googleMaps.maps.LatLngBounds();
    bounds.extend({ lat: userLocation.latitude, lng: userLocation.longitude });

    for (const hospital of hospitals) {
      const isSelected = hospital.id === selectedId;
      const marker = new googleMaps.maps.Marker({
        map: mapInstance.current,
        position: { lat: hospital.latitude, lng: hospital.longitude },
        title: hospital.name,
        icon: {
          path: googleMaps.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 11 : 8,
          fillColor: isSelected ? "#0f8d8a" : "#e85d4c",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2
        },
        zIndex: isSelected ? 500 : 100
      });

      marker.addListener("click", () => onSelect(hospital));

      const info = new googleMaps.maps.InfoWindow({
        content: `<div style="font-family:sans-serif;font-size:13px;max-width:200px">
          <strong>${hospital.name}</strong><br/>
          <span style="color:#666">${careLevel}: ${hospital.available_beds ?? "?"} bed(s)</span>
        </div>`
      });
      marker.addListener("mouseover", () => info.open({ map: mapInstance.current!, anchor: marker }));
      marker.addListener("mouseout", () => info.close());

      markersRef.current.push(marker);
      bounds.extend({ lat: hospital.latitude, lng: hospital.longitude });
    }

    const selected = hospitals.find((hospital) => hospital.id === selectedId);
    if (selected) {
      if (!directionsRef.current) directionsRef.current = new googleMaps.maps.DirectionsRenderer({ suppressMarkers: true, preserveViewport: false });
      directionsRef.current.setMap(mapInstance.current);
      new googleMaps.maps.DirectionsService().route({
        origin: { lat: userLocation.latitude, lng: userLocation.longitude },
        destination: { lat: selected.latitude, lng: selected.longitude },
        travelMode: googleMaps.maps.TravelMode.DRIVING
      }, (result, status) => {
        if (status === "OK" && result?.routes[0]?.legs[0]) {
          directionsRef.current?.setDirections(result);
          const leg = result.routes[0].legs[0];
          onRouteChange?.({ duration: leg.duration?.text ?? "", distance: leg.distance?.text ?? "" });
        } else onRouteChange?.(null);
      });
    } else {
      directionsRef.current?.setMap(null);
      onRouteChange?.(null);
    }

    if (hospitals.length > 0 && !selected) {
      mapInstance.current.fitBounds(bounds, 48);
    } else {
      mapInstance.current.setCenter({ lat: userLocation.latitude, lng: userLocation.longitude });
      mapInstance.current.setZoom(12);
    }
  }, [mapsReady, apiKey, userLocation, hospitals, careLevel, selectedId, onSelect, onRouteChange]);

  if (!apiKey) {
    return (
      <div className="hospital-map-fallback">
        <MapPin size={20} />
        <p>
          Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to show the map. Hospitals are still listed below.
        </p>
      </div>
    );
  }

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${MAPS_CALLBACK}`}
        strategy="afterInteractive"
        onLoad={() => setMapsReady(true)}
      />
      <div className="hospital-map-wrap" ref={mapRef} role="img" aria-label="Map of hospitals with available beds" />
      <p className="hospital-map-legend">
        <span><i className="legend-dot user" /> You</span>
        <span><i className="legend-dot hospital" /> {careLevel} available</span>
        <span><i className="legend-dot selected" /> Selected</span>
      </p>
    </>
  );
}

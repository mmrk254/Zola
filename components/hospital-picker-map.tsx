"use client";

import { useMemo } from "react";

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
  selectedId?: string | null;
  onSelect: (hospital: MapHospital) => void;
  careLevel: string;
  onRouteChange?: (route: { duration: string; distance: string } | null) => void;
};

export function HospitalPickerMap({ userLocation, hospitals, selectedId, onSelect, careLevel }: Props) {
  const selected = hospitals.find((hospital) => hospital.id === selectedId);
  const mapUrl = useMemo(() => {
    const target = selected ?? hospitals[0];
    const centerLat = target ? (userLocation.latitude + target.latitude) / 2 : userLocation.latitude;
    const centerLng = target ? (userLocation.longitude + target.longitude) / 2 : userLocation.longitude;
    const spread = target ? Math.max(Math.abs(userLocation.latitude - target.latitude), Math.abs(userLocation.longitude - target.longitude), 0.012) * 1.8 : 0.025;
    const bbox = `${centerLng - spread}%2C${centerLat - spread}%2C${centerLng + spread}%2C${centerLat + spread}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${userLocation.latitude}%2C${userLocation.longitude}`;
  }, [userLocation, hospitals, selected]);

  return (
    <div className="stable-map">
      <iframe title="Patient and facility map" src={mapUrl} className="hospital-map-wrap" loading="lazy" />
      <div className="stable-map-points">
        <span className="map-point patient">Patient location</span>
        {hospitals.map((hospital) => (
          <button key={hospital.id} type="button" className={hospital.id === selectedId ? "selected" : ""} onClick={() => onSelect(hospital)}>
            {hospital.name} · {hospital.available_beds ?? 0} {careLevel} bed{hospital.available_beds === 1 ? "" : "s"}
          </button>
        ))}
      </div>
    </div>
  );
}

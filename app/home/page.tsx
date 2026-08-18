"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BedDouble,
  Baby,
  HeartPulse,
  Loader2,
  MapPin,
  Navigation,
  Search
} from "lucide-react";
import { Shell } from "@/components/shell";
import { FacilityRequiredNotice } from "@/components/facility-selector";
import { formatDistance, getUserLocation } from "@/lib/geolocation";
import { CareLevel } from "@/lib/types";

type NearbyHospital = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  distance_km: number;
  available_beds: number;
  facility_status: string;
};

const BED_OPTIONS: {
  level: CareLevel;
  label: string;
  description: string;
  icon: typeof Activity;
}[] = [
  { level: "ICU", label: "ICU", description: "Intensive care unit", icon: Activity },
  { level: "HDU", label: "HDU", description: "High dependency unit", icon: HeartPulse },
  { level: "NICU", label: "NICU", description: "Neonatal intensive care", icon: Baby }
];

type Step = "bed" | "hospitals" | "location";

export default function HomePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("bed");
  const [selectedBed, setSelectedBed] = useState<CareLevel | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<NearbyHospital | null>(null);
  const [patientLocation, setPatientLocation] = useState("");
  const [hospitals, setHospitals] = useState<NearbyHospital[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  async function selectBed(level: CareLevel) {
    setSelectedBed(level);
    setGeoError(null);
    setLoadingHospitals(true);
    setStep("hospitals");

    try {
      const coords = await getUserLocation();
      setUserCoords(coords);
      const res = await fetch(
        `/api/hospitals/nearby?lat=${coords.latitude}&lng=${coords.longitude}&care_level=${level}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not find nearby hospitals");
      setHospitals(data.hospitals ?? []);
    } catch (err: any) {
      setGeoError(err.message ?? "Could not get your location");
      setHospitals([]);
    } finally {
      setLoadingHospitals(false);
    }
  }

  function selectHospital(hospital: NearbyHospital) {
    setSelectedHospital(hospital);
    setStep("location");
  }

  function continueToReferral() {
    if (!selectedBed || !selectedHospital || !patientLocation.trim()) return;
    const params = new URLSearchParams({
      care_level: selectedBed,
      hospital_id: selectedHospital.id,
      hospital_name: selectedHospital.name,
      patient_location: patientLocation.trim()
    });
    router.push(`/referrals/new?${params.toString()}`);
  }

  function goBack() {
    if (step === "location") {
      setStep("hospitals");
      setSelectedHospital(null);
    } else if (step === "hospitals") {
      setStep("bed");
      setSelectedBed(null);
      setHospitals([]);
    }
  }

  return (
    <Shell title="What do you want today?">
      <FacilityRequiredNotice />

      <div className="uber-flow">
        {step !== "bed" && (
          <button type="button" className="uber-back" onClick={goBack}>
            ← Back
          </button>
        )}

        {step === "bed" && (
          <section className="uber-step">
            <div className="uber-prompt">
              <Search size={22} />
              <h2>What do you want today?</h2>
              <p>Select the type of bed your patient needs.</p>
            </div>
            <div className="bed-options">
              {BED_OPTIONS.map((opt) => (
                <button
                  key={opt.level}
                  type="button"
                  className="bed-option"
                  onClick={() => void selectBed(opt.level)}
                >
                  <span className="bed-option-icon">
                    <opt.icon size={24} />
                  </span>
                  <div>
                    <strong>{opt.label}</strong>
                    <small>{opt.description}</small>
                  </div>
                  <ArrowRight size={18} className="bed-option-arrow" />
                </button>
              ))}
            </div>
          </section>
        )}

        {step === "hospitals" && (
          <section className="uber-step">
            <div className="uber-prompt">
              <Navigation size={22} />
              <h2>
                {selectedBed} beds near you
              </h2>
              <p>
                {userCoords
                  ? "Hospitals with available beds, sorted by distance."
                  : "Finding hospitals with available beds..."}
              </p>
            </div>

            {loadingHospitals && (
              <div className="uber-loading">
                <Loader2 size={24} className="spin" />
                <span>Locating nearby hospitals...</span>
              </div>
            )}

            {geoError && (
              <div className="notice error">
                <MapPin size={16} />
                <span>{geoError}</span>
              </div>
            )}

            {!loadingHospitals && hospitals.length === 0 && !geoError && (
              <div className="uber-empty">
                <BedDouble size={32} />
                <p>No hospitals with {selectedBed} beds available nearby.</p>
                <button type="button" className="button ghost" onClick={goBack}>
                  Try a different bed type
                </button>
              </div>
            )}

            <div className="hospital-list">
              {hospitals.map((h, i) => (
                <button
                  key={h.id}
                  type="button"
                  className={`hospital-card ${i === 0 ? "closest" : ""}`}
                  onClick={() => selectHospital(h)}
                >
                  {i === 0 && <span className="closest-badge">Closest</span>}
                  <div className="hospital-card-main">
                    <strong>{h.name}</strong>
                    {h.address && <small>{h.address}</small>}
                  </div>
                  <div className="hospital-card-meta">
                    <span className="hospital-distance">{formatDistance(h.distance_km)}</span>
                    <span className="hospital-beds">
                      {h.available_beds} {selectedBed} bed{h.available_beds !== 1 ? "s" : ""}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === "location" && selectedHospital && (
          <section className="uber-step">
            <div className="uber-prompt">
              <MapPin size={22} />
              <h2>Where is the patient?</h2>
              <p>
                Referring to <strong>{selectedHospital.name}</strong> for a{" "}
                <strong>{selectedBed}</strong> bed.
              </p>
            </div>

            <div className="selected-hospital-summary">
              <MapPin size={16} />
              <div>
                <strong>{selectedHospital.name}</strong>
                <small>
                  {selectedHospital.address} · {formatDistance(selectedHospital.distance_km)} away
                </small>
              </div>
            </div>

            <label className="uber-location-input">
              Patient&apos;s current location
              <input
                autoFocus
                placeholder="e.g. Ward 3B, Kijani County Hospital"
                value={patientLocation}
                onChange={(e) => setPatientLocation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && patientLocation.trim()) continueToReferral();
                }}
              />
            </label>

            <button
              type="button"
              className="button uber-continue"
              disabled={!patientLocation.trim()}
              onClick={continueToReferral}
            >
              Continue to referral <ArrowRight size={17} />
            </button>
          </section>
        )}
      </div>
    </Shell>
  );
}

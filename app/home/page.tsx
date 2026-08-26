"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Baby,
  BedDouble,
  Building2,
  HeartPulse,
  Loader2,
  MapPin,
  Navigation,
  RadioTower,
  Search
} from "lucide-react";
import { Shell } from "@/components/shell";
import { FacilityRequiredNotice } from "@/components/facility-selector";
import { HospitalPickerMap } from "@/components/hospital-picker-map";
import { formatDistance, getUserLocation, haversineKm } from "@/lib/geolocation";
import { CareLevel } from "@/lib/types";
import { useWorkspace } from "@/lib/use-workspace";

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
type LocationMatch = { display_name: string; lat: string; lon: string };
type Coordinates = { latitude: number; longitude: number };

export default function HomePage() {
  const router = useRouter();
  const { session, activeHospitalId } = useWorkspace();
  const [step, setStep] = useState<Step>("bed");
  const [selectedBed, setSelectedBed] = useState<CareLevel | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<NearbyHospital | null>(null);
  const [patientLocation, setPatientLocation] = useState("");
  const [hospitals, setHospitals] = useState<NearbyHospital[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [broadcastMode, setBroadcastMode] = useState(false);
  const [route, setRoute] = useState<{ duration: string; distance: string } | null>(null);
  const [locationMatches, setLocationMatches] = useState<LocationMatch[]>([]);
  const [patientCoords, setPatientCoords] = useState<Coordinates | null>(null);
  const [facilityCoords, setFacilityCoords] = useState<Coordinates | null>(null);
  const [facilityName, setFacilityName] = useState("");
  const [originType, setOriginType] = useState<"onsite" | "offsite" | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinates[]>([]);
  const [findingLocation, setFindingLocation] = useState(false);

  useEffect(() => {
    if (patientLocation.trim().length < 3 || patientCoords) { setLocationMatches([]); return; }
    const timer = window.setTimeout(async () => {
      setFindingLocation(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=ke&q=${encodeURIComponent(patientLocation)}`);
        setLocationMatches(response.ok ? await response.json() : []);
      } catch { setLocationMatches([]); } finally { setFindingLocation(false); }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [patientLocation, patientCoords]);

  useEffect(() => {
    if (!activeHospitalId) return;
    fetch(`/api/hospitals/${activeHospitalId}`)
      .then((response) => response.json())
      .then((data) => {
        if (!data.hospital) return;
        setFacilityName(data.hospital.name ?? "Your facility");
        if (data.hospital.latitude != null && data.hospital.longitude != null) {
          setFacilityCoords({ latitude: data.hospital.latitude, longitude: data.hospital.longitude });
        }
      })
      .catch(() => {});
  }, [activeHospitalId]);

  useEffect(() => {
    if (!patientCoords || !selectedHospital) return;
    setRouteCoordinates([]);
    const directDistance = haversineKm(patientCoords, {
      latitude: selectedHospital.latitude,
      longitude: selectedHospital.longitude
    });
    const estimatedDistance = Math.max(0.5, directDistance * 1.28);
    setRoute({
      distance: `${estimatedDistance.toFixed(1)} km`,
      duration: `${Math.max(3, Math.round((estimatedDistance / 28) * 60))} min`
    });
    const controller = new AbortController();
    fetch(
      `https://router.project-osrm.org/route/v1/driving/${patientCoords.longitude},${patientCoords.latitude};${selectedHospital.longitude},${selectedHospital.latitude}?overview=full&geometries=geojson`,
      { signal: controller.signal }
    )
      .then((response) => response.json())
      .then((data) => {
        const result = data.routes?.[0];
        if (!result) return;
        setRoute({
          distance: `${(result.distance / 1000).toFixed(1)} km`,
          duration: `${Math.max(1, Math.round(result.duration / 60))} min`
        });
        setRouteCoordinates((result.geometry?.coordinates ?? []).map(([longitude, latitude]: [number, number]) => ({ latitude, longitude })));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [patientCoords, selectedHospital]);

  async function selectBed(level: CareLevel) {
    setSelectedBed(level);
    setGeoError(null);
    setBroadcastMode(false);
    setSelectedHospital(null);
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

  const selectHospital = useCallback((hospital: { id: string }) => {
    const match = hospitals.find((h) => h.id === hospital.id);
    if (match) {
      setSelectedHospital(match);
      setBroadcastMode(false);
    }
  }, [hospitals]);

  function proceedWithHospital() {
    if (!selectedHospital) return;
    setOriginType(null);
    setPatientCoords(null);
    setPatientLocation("");
    setRoute(null);
    setStep("location");
  }

  function startBroadcast() {
    setBroadcastMode(true);
    setSelectedHospital(null);
    setStep("location");
  }

  function continueToReferral() {
    if (!selectedBed || !patientLocation.trim() || !patientCoords) return;

    const params = new URLSearchParams({
      care_level: selectedBed,
      patient_location: patientLocation.trim()
    });

    if (broadcastMode) {
      params.set("broadcast", "true");
    } else if (selectedHospital) {
      params.set("hospital_id", selectedHospital.id);
      params.set("hospital_name", selectedHospital.name);
    } else {
      return;
    }

    router.push(`/referrals/new?${params.toString()}`);
  }

  function goBack() {
    if (step === "location") {
      setStep(broadcastMode ? "hospitals" : "hospitals");
      if (!broadcastMode) setSelectedHospital(null);
      setBroadcastMode(false);
      setPatientLocation("");
      setPatientCoords(null);
      setOriginType(null);
      setRouteCoordinates([]);
    } else if (step === "hospitals") {
      setStep("bed");
      setSelectedBed(null);
      setHospitals([]);
      setSelectedHospital(null);
      setBroadcastMode(false);
    }
  }

  const firstName = session?.user.name?.trim().split(" ")[0];

  return (
    <Shell title={firstName ? `Hello, ${firstName}` : "New referral"}>
      <FacilityRequiredNotice />

      <div className={`uber-flow ${step === "hospitals" ? "uber-flow-wide" : ""}`}>
        {step !== "bed" && (
          <button type="button" className="uber-back" onClick={goBack}>
            ← Back
          </button>
        )}

        {step === "bed" && (
          <section className="uber-step">
            <div className="uber-prompt">
              <Search size={22} />
              <h2>{firstName ? `Hello, ${firstName}. What does the patient need?` : "What does the patient need?"}</h2>
              <p>Select the required care unit to find available facilities and plan patient transport.</p>
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

        {step === "hospitals" && selectedBed && (
          <section className="uber-step">
            <div className="uber-prompt">
              <Navigation size={22} />
              <h2>{selectedBed} beds near you</h2>
              <p>Only hospitals with open {selectedBed} capacity are shown.</p>
            </div>

            {loadingHospitals && (
              <div className="uber-loading">
                <Loader2 size={24} className="spin" />
                <span>Locating hospitals with {selectedBed} beds...</span>
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
                <p>No hospitals have {selectedBed} beds available right now.</p>
                <div className="uber-empty-actions">
                  <button type="button" className="button" onClick={startBroadcast}>
                    <RadioTower size={16} /> Broadcast to all hospitals
                  </button>
                  <button type="button" className="button ghost" onClick={goBack}>
                    Try a different bed type
                  </button>
                </div>
              </div>
            )}

            {!loadingHospitals && hospitals.length > 0 && userCoords && (
              <>
                <HospitalPickerMap
                  userLocation={userCoords}
                  hospitals={hospitals}
                  careLevel={selectedBed}
                  selectedId={selectedHospital?.id}
                  onSelect={selectHospital}
                />

                {route && selectedHospital && (
                  <div className="route-summary">
                    <Navigation size={18} />
                    <div>
                      <strong>Patient transport route</strong>
                      <small>{route ? `${route.distance} by road · estimated ${route.duration}` : "Calculating the fastest road route..."}</small>
                    </div>
                  </div>
                )}

                <div className="hospital-list">
                  {hospitals.map((h, i) => (
                    <button
                      key={h.id}
                      type="button"
                      className={`hospital-card ${selectedHospital?.id === h.id ? "selected" : ""} ${i === 0 && !selectedHospital ? "closest" : ""}`}
                      onClick={() => selectHospital(h)}
                    >
                      {(i === 0 || selectedHospital?.id === h.id) && (
                        <span className="closest-badge">
                          {selectedHospital?.id === h.id ? "Selected" : "Closest"}
                        </span>
                      )}
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

                <button
                  type="button"
                  className="button uber-continue"
                  disabled={!selectedHospital}
                  onClick={proceedWithHospital}
                >
                  {selectedHospital
                    ? `Continue with ${selectedHospital.name}`
                    : "Select a hospital to continue"}
                  <ArrowRight size={17} />
                </button>
              </>
            )}
          </section>
        )}

        {step === "location" && selectedBed && (
          <section className="uber-step">
            <div className="uber-prompt">
              <MapPin size={22} />
              <h2>Where is the patient?</h2>
              {broadcastMode ? (
                <p>
                  Broadcasting for a <strong>{selectedBed}</strong> bed. All network hospitals will be notified.
                </p>
              ) : selectedHospital ? (
                <p>
                  Directed referral to <strong>{selectedHospital.name}</strong> for a{" "}
                  <strong>{selectedBed}</strong> bed. Only this hospital will receive it.
                </p>
              ) : null}
            </div>

            {broadcastMode ? (
              <div className="selected-hospital-summary broadcast">
                <RadioTower size={16} />
                <div>
                  <strong>Network broadcast</strong>
                  <small>No {selectedBed} beds were available nearby. All hospitals will see this case.</small>
                </div>
              </div>
            ) : selectedHospital ? (
              <div className="selected-hospital-summary">
                <MapPin size={16} />
                <div>
                  <strong>{selectedHospital.name}</strong>
                  <small>
                    {selectedHospital.address} · {formatDistance(selectedHospital.distance_km)} away ·{" "}
                    {selectedHospital.available_beds} {selectedBed} bed
                    {selectedHospital.available_beds !== 1 ? "s" : ""}
                  </small>
                </div>
              </div>
            ) : null}

            {!broadcastMode && selectedHospital && !originType && (
              <div className="origin-options">
                <button type="button" onClick={() => {
                  const origin = facilityCoords ?? userCoords;
                  if (!origin) return;
                  setOriginType("onsite");
                  setPatientCoords(origin);
                  setPatientLocation(facilityName || "Referring facility");
                }}>
                  <Building2 size={19} />
                  <span><strong>Patient is on site</strong><small>Start from the referring facility.</small></span>
                </button>
                <button type="button" onClick={() => setOriginType("offsite")}>
                  <MapPin size={19} />
                  <span><strong>Patient is off site</strong><small>Search and select the patient&apos;s location.</small></span>
                </button>
              </div>
            )}

            {originType === "offsite" && <label className="uber-location-input">
              Patient&apos;s current location
              <input
                autoFocus
                placeholder="Search a road, estate, landmark, or facility"
                value={patientLocation}
                onChange={(e) => { setPatientLocation(e.target.value); setPatientCoords(null); }}
              />
            </label>}
            {originType === "offsite" && findingLocation && <p className="location-search-status">Finding locations...</p>}
            {originType === "offsite" && locationMatches.length > 0 && (
              <div className="location-results">
                {locationMatches.map((match) => <button type="button" key={`${match.lat}:${match.lon}`} onClick={() => { setPatientLocation(match.display_name); setPatientCoords({ latitude: Number(match.lat), longitude: Number(match.lon) }); setLocationMatches([]); }}><MapPin size={15} /><span>{match.display_name}</span></button>)}
              </div>
            )}
            {patientCoords && selectedHospital && (
              <div className="patient-location-map">
                <HospitalPickerMap userLocation={patientCoords} hospitals={[selectedHospital]} careLevel={selectedBed} selectedId={selectedHospital.id} onSelect={() => {}} routeCoordinates={routeCoordinates} />
                <div className="route-summary"><Navigation size={18} /><div><strong>Patient transport route</strong><small>{route ? `${route.distance} by road · estimated ${route.duration}` : "Preparing route..."}</small></div></div>
              </div>
            )}

            <button
              type="button"
              className="button uber-continue"
              disabled={!patientLocation.trim() || !patientCoords}
              onClick={continueToReferral}
            >
              {patientCoords ? "Continue to referral" : "Select the patient location"} <ArrowRight size={17} />
            </button>
          </section>
        )}
      </div>
    </Shell>
  );
}

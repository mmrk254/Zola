"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, Baby, Building2, HeartPulse, Loader2, MapPin, Navigation, RefreshCw, Search } from "lucide-react";
import { Shell } from "@/components/shell";
import { FacilityRequiredNotice } from "@/components/facility-selector";
import { HospitalPickerMap, MapHospital } from "@/components/hospital-picker-map";
import { PatientLocationPicker, PatientPlace } from "@/components/patient-location-picker";
import { CareLevel } from "@/lib/types";
import { useWorkspace } from "@/lib/use-workspace";

type Coordinates = { latitude: number; longitude: number };
type NearbyHospital = MapHospital & { available_beds: number; facility_status: string };
type Step = "bed" | "location" | "hospitals";
const BED_OPTIONS = [
  { level: "ICU" as CareLevel, description: "Intensive care unit", icon: Activity },
  { level: "HDU" as CareLevel, description: "High dependency unit", icon: HeartPulse },
  { level: "NICU" as CareLevel, description: "Neonatal intensive care", icon: Baby },
];

export default function HomePage() {
  const router = useRouter();
  const { session, activeHospitalId } = useWorkspace();
  const [step, setStep] = useState<Step>("bed");
  const [selectedBed, setSelectedBed] = useState<CareLevel | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [patient, setPatient] = useState<PatientPlace | null>(null);
  const [originType, setOriginType] = useState<"onsite" | "offsite" | null>(null);
  const [facility, setFacility] = useState<PatientPlace | null>(null);
  const [facilityLoading, setFacilityLoading] = useState(false);
  const [facilityError, setFacilityError] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<NearbyHospital[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [route, setRoute] = useState<{ distance: string; duration: string } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinates[]>([]);
  const hospitalRequest = useRef<AbortController | null>(null);
  const selectedHospital = hospitals.find(h => h.id === selectedId) ?? null;

  useEffect(() => {
    const controller = new AbortController();
    setFacility(null); setFacilityError(null); setPatient(null); setOriginType(null);
    setSelectedId(null); setHospitals([]); setCheckedAt(null);
    setStep(current => current === "bed" ? "bed" : "location");
    if (!activeHospitalId) { setFacilityLoading(false); return; }
    setFacilityLoading(true);
    fetch(`/api/hospitals/${activeHospitalId}`, { cache: "no-store", signal: controller.signal })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Could not load your hospital."); return data.hospital; })
      .then(h => {
        if (controller.signal.aborted) return;
        if (h?.latitude == null || h?.longitude == null) throw new Error("Your hospital has no saved map location. Update its location before choosing on site, or select the patient location on the off-site map.");
        setFacility({ latitude: h.latitude, longitude: h.longitude, name: h.name });
      })
      .catch(err => { if (!controller.signal.aborted) setFacilityError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setFacilityLoading(false); });
    return () => controller.abort();
  }, [activeHospitalId]);

  const loadHospitals = useCallback(async () => {
    if (!patient || !selectedBed) return null;
    hospitalRequest.current?.abort();
    const controller = new AbortController(); hospitalRequest.current = controller;
    setLoadingHospitals(true);
    try {
      const response = await fetch(`/api/hospitals/nearby?lat=${patient.latitude}&lng=${patient.longitude}&care_level=${selectedBed}`, { cache: "no-store", signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not refresh available beds.");
      if (controller.signal.aborted) return null;
      const rows: NearbyHospital[] = data.hospitals ?? [];
      setHospitals(rows); setError(null); setCheckedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setSelectedId(id => rows.some(h => h.id === id) ? id : null);
      return rows;
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Could not refresh available beds.");
      return null;
    } finally { if (!controller.signal.aborted) setLoadingHospitals(false); }
  }, [patient, selectedBed]);

  useEffect(() => {
    if (step !== "hospitals") return;
    void loadHospitals();
    const refresh = () => { if (document.visibilityState === "visible") void loadHospitals(); };
    const storage = (event: StorageEvent) => { if (event.key === "zola_capacity_updated") refresh(); };
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh); window.addEventListener("online", refresh);
    window.addEventListener("storage", storage); window.addEventListener("zola-capacity-updated", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer); hospitalRequest.current?.abort();
      window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh);
      window.removeEventListener("storage", storage); window.removeEventListener("zola-capacity-updated", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [step, loadHospitals]);

  const destinationLat = selectedHospital?.latitude;
  const destinationLng = selectedHospital?.longitude;
  useEffect(() => {
    setRoute(null); setRouteCoordinates([]);
    if (!patient || destinationLat == null || destinationLng == null) return;
    const controller = new AbortController();
    fetch(`https://router.project-osrm.org/route/v1/driving/${patient.longitude},${patient.latitude};${destinationLng},${destinationLat}?overview=full&geometries=geojson`, { signal: controller.signal })
      .then(response => response.json()).then(data => {
        if (controller.signal.aborted || !data.routes?.[0]) return;
        const result = data.routes[0];
        setRoute({ distance: `${(result.distance / 1000).toFixed(1)} km`, duration: `${Math.max(1, Math.round(result.duration / 60))} min` });
        setRouteCoordinates((result.geometry?.coordinates ?? []).map(([longitude, latitude]: [number, number]) => ({ latitude, longitude })));
      }).catch(() => {});
    return () => controller.abort();
  }, [patient, destinationLat, destinationLng]);

  function selectBed(level: CareLevel) {
    setSelectedBed(level); setSelectedId(null); setHospitals([]); setCheckedAt(null); setError(null);
    setPatient(null); setOriginType(null); setStep("location");
  }
  function chooseOrigin(type: "onsite" | "offsite") {
    setOriginType(type); setPatient(type === "onsite" ? facility : null); setSelectedId(null); setError(null);
  }
  async function continueToReferral(broadcast = false) {
    if (!patient || !selectedBed || continuing) return;
    const params = new URLSearchParams({ care_level: selectedBed, patient_location: patient.name });
    if (broadcast) params.set("broadcast", "true");
    else {
      if (!selectedId) return;
      setContinuing(true);
      const fresh = await loadHospitals();
      setContinuing(false);
      if (!fresh) return;
      const destination = fresh.find(h => h.id === selectedId);
      if (!destination) { setError("That hospital no longer has open beds for this care level. Please choose another hospital."); return; }
      params.set("hospital_id", destination.id); params.set("hospital_name", destination.name);
    }
    router.push(`/referrals/new?${params.toString()}`);
  }
  const firstName = session?.user.name?.trim().split(" ")[0];
  return <Shell title={firstName ? `Hello, ${firstName}` : "New referral"}>
    <FacilityRequiredNotice />
    <div className={`uber-flow ${step !== "bed" ? "uber-flow-wide" : ""}`}>
      {step !== "bed" && <><button type="button" className="uber-back" disabled={continuing} onClick={() => { setStep(step === "hospitals" ? "location" : "bed"); setSelectedId(null); setError(null); }}>← Back</button><div className="referral-progress" aria-label="Referral steps"><span>1 · {selectedBed}</span><span className={step === "location" ? "active" : ""}>2 · Patient location</span><span className={step === "hospitals" ? "active" : ""}>3 · Hospital</span></div></>}
      {step === "bed" && <section className="uber-step"><div className="uber-prompt"><Search size={22} /><h2>What does the patient need?</h2><p>Select the care level, confirm the patient location, then find a receiving hospital.</p></div><div className="bed-options">{BED_OPTIONS.map(opt => <button key={opt.level} type="button" className="bed-option" onClick={() => selectBed(opt.level)}><span className="bed-option-icon"><opt.icon size={24} /></span><div><strong>{opt.level}</strong><small>{opt.description}</small></div><ArrowRight size={18} className="bed-option-arrow" /></button>)}</div></section>}
      {step === "location" && <section className="uber-step"><div className="uber-prompt"><MapPin size={22} /><h2>Where is the patient?</h2><p>We’ll find {selectedBed} beds near the patient’s pickup location.</p></div>
        <div className="origin-options">
          <button type="button" aria-pressed={originType === "onsite"} disabled={!facility || facilityLoading} onClick={() => chooseOrigin("onsite")}><Building2 size={19} /><span><strong>Patient is on site</strong><small>{facilityLoading ? "Loading hospital location…" : facility?.name ?? "Hospital location unavailable"}</small></span></button>
          <button type="button" aria-pressed={originType === "offsite"} onClick={() => chooseOrigin("offsite")}><MapPin size={19} /><span><strong>Patient is off site</strong><small>Find the patient on the map.</small></span></button>
        </div>
        {!activeHospitalId && <p className="notice">Select your referring facility to use its on-site location.</p>}
        {facilityError && <p className="notice" role="status">{facilityError}</p>}
        {originType === "onsite" && patient && <div className="pickup-confirmation"><Building2 size={22} /><div><strong>{patient.name}</strong><small>Pickup is at your hospital’s saved location.</small></div></div>}
        {originType === "offsite" && <PatientLocationPicker initialCenter={facility} value={patient} onChange={setPatient} />}
        <button className="button uber-continue" type="button" disabled={!patient} onClick={() => { setHospitals([]); setCheckedAt(null); setStep("hospitals"); }}>Find {selectedBed} beds <ArrowRight size={17} /></button>
      </section>}
      {step === "hospitals" && patient && selectedBed && <section className="uber-step"><div className="uber-prompt"><Navigation size={22} /><h2>{selectedBed} beds near the patient</h2><p>Choose the receiving hospital. Distances start at the patient’s pickup.</p></div>
        <div className="availability-toolbar"><span role="status">{loadingHospitals ? "Checking availability…" : checkedAt ? `Checked ${checkedAt} · refreshes every 15 seconds` : "Checking available beds"}</span><button type="button" onClick={() => void loadHospitals()} disabled={loadingHospitals || continuing}><RefreshCw size={14} /> Refresh</button></div>
        {error && <div className="notice error" role="alert">{error}</div>}
        {!checkedAt && loadingHospitals && <div className="uber-loading"><Loader2 className="spin" size={22} /> Finding hospitals…</div>}
        {checkedAt && <HospitalPickerMap userLocation={patient} pickupLabel={patient.name} hospitals={hospitals} careLevel={selectedBed} selectedId={selectedId} onSelect={h => { if (!continuing) setSelectedId(h.id); }} routeCoordinates={routeCoordinates} />}
        {checkedAt && hospitals.length === 0 && <p className="notice">No open {selectedBed} beds are available right now. Refresh or use general broadcast.</p>}
        {selectedHospital && <div className="route-summary"><Navigation size={18} /><div><strong>Patient transport route</strong><small>{route ? `${route.distance} by road · estimated ${route.duration}` : "Road route is not available yet."}</small></div></div>}
        <button type="button" className="button uber-continue" disabled={!selectedHospital || continuing || loadingHospitals || !!error} onClick={() => void continueToReferral()}>{continuing ? "Checking beds…" : selectedHospital ? `Continue with ${selectedHospital.name}` : "Select a hospital to continue"}<ArrowRight size={17} /></button>
        <button type="button" className="general-broadcast-link" disabled={continuing} onClick={() => void continueToReferral(true)}>Use general broadcast instead</button>
      </section>}
    </div>
  </Shell>;
}

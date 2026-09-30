"use client";

import { FormEvent, useEffect, useState } from "react";
import { BedDouble, Save } from "lucide-react";
import { HospitalShell } from "@/components/hospital-shell";
import { FacilityRequiredNotice } from "@/components/facility-selector";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/use-workspace";
import { CapacitySnapshot, CareLevel, FacilityStatus } from "@/lib/types";

const CARE_LEVELS: CareLevel[] = ["ICU", "HDU", "NICU"];
const STATUS_OPTIONS: { value: FacilityStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "at_capacity", label: "At capacity" },
  { value: "closed", label: "Closed to referrals" }
];

function blankSnapshot(hospitalId: string, level: CareLevel): CapacitySnapshot {
  return { hospital_id: hospitalId, care_level: level, available_beds: 0, facility_status: "open", updated_at: "Never" };
}

export default function CapacityPage() {
  const { activeHospitalId } = useWorkspace();
  const [capacity, setCapacity] = useState<CapacitySnapshot[]>([]);
  const [loadedHospitalId, setLoadedHospitalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [unit, setUnit] = useState({ name: "", care_level: "ICU", unit_type: "ward", capacity: "", available_beds: "" });

  useEffect(() => {
    const controller = new AbortController();
    setCapacity([]); setUnits([]); setLoadedHospitalId(null); setSaved(false); setError(null);
    if (!isSupabaseConfigured || !activeHospitalId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/hospitals/${activeHospitalId}/capacity`, { cache: "no-store", signal: controller.signal })
      .then(async res => { const data = await res.json(); if (!res.ok) throw new Error(data.error ?? "Could not load capacity."); return data; })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data?.capacity?.length) {
          setCapacity(data.capacity);
        } else {
          setCapacity(CARE_LEVELS.map((level) => blankSnapshot(activeHospitalId, level)));
        }
        setLoadedHospitalId(activeHospitalId);
      })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    fetch(`/api/hospitals/${activeHospitalId}/units`, { cache: "no-store", signal: controller.signal }).then((res) => res.ok ? res.json() : null).then((data) => { if (!controller.signal.aborted) setUnits(data?.units ?? []); }).catch(() => {});
    return () => controller.abort();
  }, [activeHospitalId]);

  function updateField(level: CareLevel, field: "available_beds" | "facility_status", value: string) {
    setSaved(false);
    setCapacity((current) =>
      current.map((c) =>
        c.care_level === level
          ? {
              ...c,
              [field]: field === "available_beds" ? Math.max(0, Number(value) || 0) : (value as FacilityStatus)
            }
          : c
      )
    );
  }

  async function addUnit(event: FormEvent) {
    event.preventDefault(); if (!activeHospitalId) return; setError(null);
    const response = await fetch(`/api/hospitals/${activeHospitalId}/units`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(unit) });
    const data = await response.json(); if (!response.ok) { setError(data.error ?? "Could not add unit."); return; }
    setUnits((items) => [...items, data.unit]); setUnit({ name: "", care_level: "ICU", unit_type: "ward", capacity: "", available_beds: "" });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!isSupabaseConfigured) {
      setError("Connect Supabase to save real capacity updates.");
      return;
    }
    if (!activeHospitalId) {
      setError("Select which facility you are updating.");
      return;
    }
    if (loadedHospitalId !== activeHospitalId || capacity.some(row => row.hospital_id !== activeHospitalId)) {
      setError("Wait for this hospital's capacity to load before saving.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/hospitals/${activeHospitalId}/capacity`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capacity })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save capacity.");
      if (data.capacity) setCapacity(data.capacity);
      setSaved(true);
      window.dispatchEvent(new Event("zola-capacity-updated"));
      try { localStorage.setItem("zola_capacity_updated", `${activeHospitalId}:${Date.now()}`); } catch { /* Polling still refreshes other views. */ }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <HospitalShell title="Bed & capacity">
      <FacilityRequiredNotice />
      {error && <div className="notice error">{error}</div>}
      {saved && (
        <div className="notice">
          <BedDouble size={16} />
          <span>Capacity saved. Hospital maps refresh automatically within 15 seconds, or immediately when reopened.</span>
        </div>
      )}
      {!isSupabaseConfigured && (
        <div className="notice warn">Demo mode: changes here are local only until Supabase is connected.</div>
      )}

      <form onSubmit={submit}>
        <section className="panel form-card compact-card" style={{ maxWidth: 820 }}>
          <div className="panel-heading">
            <div>
              <h2>Available beds by care level</h2>
              <p>
                Charge staff should update this whenever capacity changes. It drives real-time matching for incoming
                referrals.
              </p>
            </div>
          </div>

          <div className="capacity-grid">
            {(loading ? CARE_LEVELS.map((level) => blankSnapshot(activeHospitalId ?? "", level)) : capacity).map((c, index) => (
              <div className="capacity-card" key={`${c.hospital_id}-${c.care_level}-${index}`}>
                <h3>{c.care_level}</h3>
                <label className="capacity-count" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="number"
                    aria-label={`${c.care_level} available beds`}
                    min={0}
                    step={1}
                    value={c.available_beds}
                    disabled={loading}
                    onChange={(e) => updateField(c.care_level, "available_beds", e.target.value)}
                  />
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>beds free</span>
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#57503f" }}>Facility status</span>
                  <select
                    value={c.facility_status}
                    disabled={loading}
                    onChange={(e) => updateField(c.care_level, "facility_status", e.target.value)}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="capacity-updated">Last updated {c.updated_at}</span>
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button className="button" type="submit" disabled={saving || loading || !activeHospitalId || loadedHospitalId !== activeHospitalId}>
              <Save size={16} /> {saving ? "Saving..." : "Save capacity"}
            </button>
          </div>
        </section>
      </form>
      <section className="panel form-card compact-card" style={{ maxWidth: 820, marginTop: 18 }}>
        <div className="panel-heading"><div><h2>Rooms and units</h2><p>Add wards, rooms, bays, or named units so your team can select the precise destination.</p></div></div>
        <form className="form-grid" onSubmit={addUnit}>
          <label>Unit or room name<input required value={unit.name} placeholder="e.g. ICU Bay 2" onChange={(e) => setUnit({ ...unit, name: e.target.value })} /></label>
          <label>Care level<select value={unit.care_level} onChange={(e) => setUnit({ ...unit, care_level: e.target.value })}><option>ICU</option><option>HDU</option><option>NICU</option></select></label>
          <label>Type<input value={unit.unit_type} placeholder="Ward, room, bay" onChange={(e) => setUnit({ ...unit, unit_type: e.target.value })} /></label>
          <label>Total beds<input type="number" min="0" value={unit.capacity} onChange={(e) => setUnit({ ...unit, capacity: e.target.value })} /></label>
          <label>Available beds<input type="number" min="0" value={unit.available_beds} onChange={(e) => setUnit({ ...unit, available_beds: e.target.value })} /></label>
          <div className="form-actions"><button className="button" type="submit">Add unit</button></div>
        </form>
        {units.length > 0 && <div className="unit-list">{units.map((item) => <div key={item.id}><strong>{item.name}</strong><span>{item.care_level} · {item.unit_type} · {item.available_beds}/{item.capacity} beds available</span></div>)}</div>}
      </section>
    </HospitalShell>
  );
}

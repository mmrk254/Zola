"use client";

import { FormEvent, useEffect, useState } from "react";
import { BedDouble, Save } from "lucide-react";
import { HospitalShell } from "@/components/hospital-shell";
import { FacilityRequiredNotice } from "@/components/facility-selector";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/use-workspace";
import { demoCapacity } from "@/lib/demo-data";
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
  const [capacity, setCapacity] = useState<CapacitySnapshot[]>(demoCapacity);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !activeHospitalId) {
      setLoading(false);
      return;
    }
    fetch(`/api/hospitals/${activeHospitalId}/capacity`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.capacity?.length) {
          setCapacity(data.capacity);
        } else {
          setCapacity(CARE_LEVELS.map((level) => blankSnapshot(activeHospitalId, level)));
        }
      })
      .catch(() => setCapacity(CARE_LEVELS.map((level) => blankSnapshot(activeHospitalId, level))))
      .finally(() => setLoading(false));
  }, [activeHospitalId]);

  function updateField(level: CareLevel, field: "available_beds" | "facility_status", value: string) {
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
          <span>Capacity updated. Hospitals matching new referrals will see this immediately.</span>
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
                Charge staff should update this whenever capacity changes — it drives real-time matching for incoming
                referrals.
              </p>
            </div>
          </div>

          <div className="capacity-grid">
            {(loading ? CARE_LEVELS.map((level) => blankSnapshot(activeHospitalId ?? "", level)) : capacity).map((c) => (
              <div className="capacity-card" key={c.care_level}>
                <h3>{c.care_level}</h3>
                <label className="capacity-count" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="number"
                    min={0}
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
            <button className="button" type="submit" disabled={saving || loading}>
              <Save size={16} /> {saving ? "Saving..." : "Save capacity"}
            </button>
          </div>
        </section>
      </form>
    </HospitalShell>
  );
}

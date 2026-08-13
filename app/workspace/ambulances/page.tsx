"use client";

import { FormEvent, useEffect, useState } from "react";
import { Ambulance, Pencil, Plus, Trash2 } from "lucide-react";
import { HospitalShell } from "@/components/hospital-shell";
import { FacilityRequiredNotice } from "@/components/facility-selector";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/use-workspace";
import { Ambulance as AmbulanceType } from "@/lib/types";

export default function AmbulancesPage() {
  const { activeHospitalId } = useWorkspace();
  const [ambulances, setAmbulances] = useState<AmbulanceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<AmbulanceType | null>(null);
  const [form, setForm] = useState({ plate_number: "", driver_name: "", driver_phone: "" });

  async function load() {
    if (!isSupabaseConfigured || !activeHospitalId) {
      setLoading(false);
      return;
    }
    const res = await fetch(`/api/hospitals/${activeHospitalId}/ambulances`);
    const data = await res.json();
    if (res.ok) setAmbulances(data.ambulances ?? []);
    else setError(data.error ?? "Could not load ambulances");
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHospitalId]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!activeHospitalId) return;
    setSubmitting(true);
    setError(null);
    try {
      const url = editing
        ? `/api/hospitals/${activeHospitalId}/ambulances/${editing.id}`
        : `/api/hospitals/${activeHospitalId}/ambulances`;
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save ambulance");
      setForm({ plate_number: "", driver_name: "", driver_phone: "" });
      setEditing(null);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    if (!activeHospitalId) return;
    setError(null);
    const res = await fetch(`/api/hospitals/${activeHospitalId}/ambulances/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not remove ambulance");
      return;
    }
    await load();
  }

  return (
    <HospitalShell title="Ambulance fleet">
      <FacilityRequiredNotice />
      {error && <div className="notice error">{error}</div>}

      <div className="dash-split">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Registered ambulances</h2>
              <p>Dispatched units stay locked until the patient is received. Edit details anytime they are available.</p>
            </div>
          </div>
          {loading ? (
            <p className="empty-state">Loading...</p>
          ) : ambulances.length === 0 ? (
            <p className="empty-state">No ambulances registered yet.</p>
          ) : (
            <div className="staff-list">
              {ambulances.map((a) => (
                <article key={a.id} className="staff-row">
                  <div>
                    <strong>{a.plate_number}</strong>
                    <small>
                      {a.driver_name}
                      {a.driver_phone ? ` · ${a.driver_phone}` : ""}
                    </small>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={`role-pill ${a.status === "dispatched" ? "warn" : ""}`}>{a.status}</span>
                    <button
                      className="button ghost compact"
                      type="button"
                      disabled={a.status === "dispatched"}
                      onClick={() => {
                        setEditing(a);
                        setForm({
                          plate_number: a.plate_number,
                          driver_name: a.driver_name,
                          driver_phone: a.driver_phone ?? ""
                        });
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="button ghost compact"
                      type="button"
                      disabled={a.status === "dispatched"}
                      onClick={() => remove(a.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel form-card compact-card">
          <div className="panel-heading">
            <div>
              <h2>{editing ? "Edit ambulance" : "Register ambulance"}</h2>
              <p>Plate and driver details auto-fill when dispatching a referral.</p>
            </div>
          </div>
          <form onSubmit={save} className="auth-form">
            <label className="auth-field">
              <span>Plate number</span>
              <input
                required
                value={form.plate_number}
                onChange={(e) => setForm((f) => ({ ...f, plate_number: e.target.value }))}
              />
            </label>
            <label className="auth-field">
              <span>Driver name</span>
              <input
                required
                value={form.driver_name}
                onChange={(e) => setForm((f) => ({ ...f, driver_name: e.target.value }))}
              />
            </label>
            <label className="auth-field">
              <span>Driver phone</span>
              <input
                value={form.driver_phone}
                onChange={(e) => setForm((f) => ({ ...f, driver_phone: e.target.value }))}
              />
            </label>
            <div className="form-actions">
              {editing && (
                <button className="button ghost" type="button" onClick={() => { setEditing(null); setForm({ plate_number: "", driver_name: "", driver_phone: "" }); }}>
                  Cancel edit
                </button>
              )}
              <button className="button" type="submit" disabled={submitting || !activeHospitalId}>
                <Plus size={15} /> {submitting ? "Saving..." : editing ? "Save changes" : "Add ambulance"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </HospitalShell>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Save } from "lucide-react";
import { Shell } from "@/components/shell";
import { FacilityRequiredNotice } from "@/components/facility-selector";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/use-workspace";
import { TransferMode } from "@/lib/types";

const CONSENT_ITEMS = [
  "Patient or legal representative has been informed of the referral.",
  "Clinical information is accurate and limited to what is necessary.",
  "Receiving facility may view referral details after acceptance.",
  "Next-of-kin contact details are correct, where available."
];

export default function NewReferral() {
  const { session, activeHospitalId, actingPayload } = useWorkspace();
  const [consent, setConsent] = useState([false, false, false, false]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ id: string; reference: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    patient_initials: "",
    care_level: "",
    urgency: "urgent",
    clinical_summary: "",
    transfer_mode: "external" as TransferMode,
    patient_location: ""
  });

  const needsFacility =
    session &&
    !session.networkAdmin &&
    session.memberships.filter((m) => m.status === "active").length > 1;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isSupabaseConfigured) {
      setError("Connect Supabase to save real referrals. This form is read-only in demo mode.");
      return;
    }
    if (!form.care_level) {
      setError("Select a care level.");
      return;
    }
    if (needsFacility && !activeHospitalId) {
      setError("Select which facility you are acting for.");
      return;
    }
    if (form.transfer_mode === "internal_offsite" && !form.patient_location.trim()) {
      setError("Enter the patient's current location for pickup.");
      return;
    }
    if (!consent.every(Boolean)) {
      setError("All four consent checks must be confirmed before saving.");
      return;
    }

    setSubmitting(true);
    try {
      const createRes = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_initials: form.patient_initials,
          care_level: form.care_level,
          urgency: form.urgency,
          clinical_summary: form.clinical_summary,
          transfer_mode: form.transfer_mode,
          patient_location: form.transfer_mode === "internal_offsite" ? form.patient_location : null,
          acting_hospital_id: activeHospitalId
        })
      });
      const created = await createRes.json();
      if (!createRes.ok) throw new Error(created.error ?? "Could not create referral");

      const consentRes = await fetch(`/api/referrals/${created.referral.id}/consent`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checks: consent, ...actingPayload })
      });
      const consented = await consentRes.json();
      if (!consentRes.ok) throw new Error(consented.error ?? "Could not confirm consent");

      setSubmitted({ id: created.referral.id, reference: created.referral.reference });
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Shell title="Create referral">
      <div className="breadcrumb">
        <Link href="/dashboard">Dashboard</Link>
        <ChevronRight size={14} /> New referral
      </div>

      <FacilityRequiredNotice />

      {submitted ? (
        <section className="success-card">
          <CheckCircle2 />
          <h2>Referral {submitted.reference} saved</h2>
          <p>Consent is confirmed. Open the referral and send it — all network hospitals will be notified.</p>
          <Link className="button" href={`/referrals/${submitted.id}`}>
            Open referral
          </Link>
        </section>
      ) : (
        <form onSubmit={submit} className="referral-form">
          {!isSupabaseConfigured && (
            <div className="notice warn">Demo mode: connect Supabase to save real referrals from this form.</div>
          )}
          {error && <div className="notice error">{error}</div>}

          <section className="form-card">
            <div className="form-heading">
              <span>01</span>
              <div>
                <h2>Clinical referral details</h2>
                <p>Use minimum necessary information while matching a bed.</p>
              </div>
            </div>
            <div className="form-grid">
              <label>
                Patient initials
                <input
                  required
                  placeholder="e.g. JM"
                  maxLength={4}
                  value={form.patient_initials}
                  onChange={(e) => setForm((f) => ({ ...f, patient_initials: e.target.value.toUpperCase() }))}
                />
              </label>
              <label>
                Care level
                <select
                  required
                  value={form.care_level}
                  onChange={(e) => setForm((f) => ({ ...f, care_level: e.target.value }))}
                >
                  <option value="" disabled>
                    Select required care level
                  </option>
                  <option value="ICU">ICU</option>
                  <option value="HDU">HDU</option>
                  <option value="NICU">NICU</option>
                </select>
              </label>
              <label>
                Urgency
                <select value={form.urgency} onChange={(e) => setForm((f) => ({ ...f, urgency: e.target.value }))}>
                  <option value="critical">Critical</option>
                  <option value="urgent">Urgent</option>
                  <option value="routine">Routine</option>
                </select>
              </label>
              <label className="full">
                Clinical summary
                <textarea
                  required
                  rows={4}
                  placeholder="Briefly describe the reason for referral and immediate care requirement."
                  value={form.clinical_summary}
                  onChange={(e) => setForm((f) => ({ ...f, clinical_summary: e.target.value }))}
                />
              </label>
            </div>
          </section>

          <section className="form-card">
            <div className="form-heading">
              <span>02</span>
              <div>
                <h2>Transfer type</h2>
                <p>Choose whether the patient is already on-site or needs pickup.</p>
              </div>
            </div>
            <div className="transfer-options">
              <label className={`transfer-option ${form.transfer_mode === "external" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="transfer_mode"
                  checked={form.transfer_mode === "external"}
                  onChange={() => setForm((f) => ({ ...f, transfer_mode: "external", patient_location: "" }))}
                />
                <div>
                  <b>Broadcast to all hospitals</b>
                  <small>No hospital is chosen upfront. Every network hospital sees this case — the first to accept gets the referral.</small>
                </div>
              </label>
              <label className={`transfer-option ${form.transfer_mode === "internal_onsite" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="transfer_mode"
                  checked={form.transfer_mode === "internal_onsite"}
                  onChange={() => setForm((f) => ({ ...f, transfer_mode: "internal_onsite", patient_location: "" }))}
                />
                <div>
                  <b>My hospital — patient on-site</b>
                  <small>Patient is already at your facility. No ambulance needed after acceptance.</small>
                </div>
              </label>
              <label className={`transfer-option ${form.transfer_mode === "internal_offsite" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="transfer_mode"
                  checked={form.transfer_mode === "internal_offsite"}
                  onChange={() => setForm((f) => ({ ...f, transfer_mode: "internal_offsite" }))}
                />
                <div>
                  <b>My hospital — off-site pickup</b>
                  <small>Patient is at another location — dispatch your ambulance after family confirms.</small>
                </div>
              </label>
            </div>
            {form.transfer_mode === "internal_offsite" && (
              <label style={{ marginTop: 12 }}>
                Patient location
                <input
                  required
                  placeholder="e.g. Ward 3B, Donholm ERC outreach clinic"
                  value={form.patient_location}
                  onChange={(e) => setForm((f) => ({ ...f, patient_location: e.target.value }))}
                />
              </label>
            )}
          </section>

          <section className="form-card">
            <div className="form-heading">
              <span>03</span>
              <div>
                <h2>Consent checkpoint</h2>
                <p>All confirmations are required before the referral can be sent.</p>
              </div>
            </div>
            <div className="checklist">
              {CONSENT_ITEMS.map((text, i) => (
                <label key={text} className="check-row">
                  <input
                    type="checkbox"
                    checked={consent[i]}
                    onChange={(e) => setConsent((v) => v.map((x, j) => (j === i ? e.target.checked : x)))}
                  />
                  <span>{text}</span>
                </label>
              ))}
            </div>
          </section>

          <div className="form-actions">
            <Link href="/dashboard" className="button ghost">
              Cancel
            </Link>
            <button className="button" type="submit" disabled={submitting}>
              <Save size={16} /> {submitting ? "Saving..." : "Save referral"}
            </button>
          </div>
        </form>
      )}
    </Shell>
  );
}

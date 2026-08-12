"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Ambulance, Check, Clock3, Send, UserRound, XCircle } from "lucide-react";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { FacilityRequiredNotice } from "@/components/facility-selector";
import { demoReferrals } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/use-workspace";
import { Referral, ReferralEvent, REFERRAL_STEPS, ReferralStatus } from "@/lib/types";

const ACTION_BY_STATUS: Partial<Record<ReferralStatus, { label: string; icon: any; endpoint: string }>> = {
  ready_to_send: { label: "Send to hospitals", icon: Send, endpoint: "send" },
  searching: { label: "Mark hospital accepted", icon: Check, endpoint: "accept" },
  hospital_accepted: { label: "Record family confirmation", icon: UserRound, endpoint: "family-confirmation" },
  family_confirmed: { label: "Arrange ambulance", icon: Ambulance, endpoint: "ambulance" },
  ambulance_arranged: { label: "Mark patient en route", icon: Ambulance, endpoint: "en-route" },
  patient_en_route: { label: "Confirm patient received", icon: Check, endpoint: "received" },
  patient_received: { label: "Close case", icon: Check, endpoint: "close" }
};

export default function ReferralDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { activeHospitalId, actingPayload } = useWorkspace();
  const [referral, setReferral] = useState<Referral | null>(null);
  const [events, setEvents] = useState<ReferralEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [family, setFamily] = useState({ relationship: "", name: "", phone: "", consent_given: true });

  async function load() {
    if (!isSupabaseConfigured) {
      setReferral(demoReferrals.find((r) => r.id === id) ?? demoReferrals[0]);
      return;
    }
    const [refRes, eventsRes] = await Promise.all([
      fetch(`/api/referrals/${id}`),
      fetch(`/api/referrals/${id}/events`)
    ]);
    const refData = await refRes.json();
    const eventsData = await eventsRes.json();
    if (refRes.ok) {
      setReferral({
        ...refData.referral,
        referring_facility: refData.referral.referring?.name ?? "Unknown facility",
        receiving_facility: refData.referral.receiving?.name
      });
    }
    if (eventsRes.ok) setEvents(eventsData.events ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function runAction(endpoint: string, body?: object) {
    if (!isSupabaseConfigured) {
      setError("Connect Supabase to update live referrals.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { ...actingPayload, ...(body ?? {}) };
      if ((endpoint === "accept" || endpoint === "decline") && activeHospitalId) {
        payload.receiving_facility_id = activeHospitalId;
      }

      const res = await fetch(`/api/referrals/${id}/${endpoint}`, {
        method: endpoint === "consent" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      await load();
      setShowFamilyForm(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!referral) {
    return (
      <Shell title="Referral detail">
        <p className="empty-state">Loading referral...</p>
      </Shell>
    );
  }

  const currentStepIndex = REFERRAL_STEPS.findIndex((s) => s.status === referral.status);
  const action = ACTION_BY_STATUS[referral.status];

  return (
    <Shell title={referral.reference} action={<StatusBadge status={referral.status} />}>
      <div className="breadcrumb">
        <Link href="/dashboard">Dashboard</Link>
        <span>/</span> Referral detail
      </div>

      <FacilityRequiredNotice />

      {error && <div className="notice error">{error}</div>}

      <section className="detail-grid">
        <div>
          <div className="panel detail-header">
            <div>
              <p className="eyebrow">
                {referral.care_level} referral · <span className={`urgency ${referral.urgency}`}>{referral.urgency}</span>
              </p>
              <h2>Patient {referral.patient_initials}</h2>
              <p>
                {referral.referring_facility}
                {referral.receiving_facility ? ` to ${referral.receiving_facility}` : ""}
              </p>
            </div>
            <StatusBadge status={referral.status} />
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <h2>Referral timeline</h2>
                <p>Every milestone is recorded in the audit log.</p>
              </div>
            </div>
            <ol className="timeline">
              {REFERRAL_STEPS.map((step, i) => {
                const event = events.find((e) => e.to_status === step.status);
                const done = i <= currentStepIndex;
                return (
                  <li className={done ? "done" : ""} key={step.status}>
                    <span>{done ? <Check size={14} /> : <Clock3 size={14} />}</span>
                    <div>
                      <b>{step.label}</b>
                      <small>
                        {event ? new Date(event.created_at).toLocaleString() : done ? "Recorded" : "Awaiting update"}
                      </small>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {showFamilyForm && (
            <section className="form-card">
              <div className="form-heading">
                <span>NoK</span>
                <div>
                  <h2>Family confirmation</h2>
                  <p>Captured by the referring clinician after the family agrees to transfer.</p>
                </div>
              </div>
              <div className="form-grid">
                <label>
                  Relationship
                  <select
                    value={family.relationship}
                    onChange={(e) => setFamily((f) => ({ ...f, relationship: e.target.value }))}
                  >
                    <option value="">Select</option>
                    <option>Wife</option>
                    <option>Husband</option>
                    <option>Son</option>
                    <option>Daughter</option>
                    <option>Parent</option>
                    <option>Sibling</option>
                    <option>Guardian</option>
                  </select>
                </label>
                <label>
                  Name
                  <input value={family.name} onChange={(e) => setFamily((f) => ({ ...f, name: e.target.value }))} />
                </label>
                <label>
                  Phone number
                  <input value={family.phone} onChange={(e) => setFamily((f) => ({ ...f, phone: e.target.value }))} />
                </label>
              </div>
              <div className="form-actions">
                <button className="button ghost" onClick={() => setShowFamilyForm(false)} type="button">
                  Cancel
                </button>
                <button
                  className="button"
                  type="button"
                  disabled={busy || !family.relationship || !family.name || !family.phone}
                  onClick={() => runAction("family-confirmation", family)}
                >
                  Confirm consent recorded
                </button>
              </div>
            </section>
          )}
        </div>

        <aside className="detail-aside">
          <section className="panel">
            <h2>Actions</h2>
            {action ? (
              <button
                className="button full-button"
                disabled={busy}
                onClick={() =>
                  action.endpoint === "family-confirmation" ? setShowFamilyForm(true) : runAction(action.endpoint)
                }
              >
                <action.icon size={16} /> {action.label}
              </button>
            ) : (
              <p className="empty-state">No further action needed.</p>
            )}
            {referral.status === "searching" && (
              <button className="button danger full-button" disabled={busy} onClick={() => runAction("decline")}>
                <XCircle size={16} /> Hospital declined
              </button>
            )}
          </section>
          <section className="panel">
            <h2>Case details</h2>
            <dl>
              <dt>Referring facility</dt>
              <dd>{referral.referring_facility}</dd>
              <dt>Care requirement</dt>
              <dd>{referral.care_level}</dd>
              <dt>Consent</dt>
              <dd className={referral.consent_obtained ? "confirmed" : ""}>
                <Check size={15} /> {referral.consent_obtained ? "Complete" : "Pending"}
              </dd>
            </dl>
          </section>
        </aside>
      </section>
    </Shell>
  );
}

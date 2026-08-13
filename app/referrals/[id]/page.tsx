"use client";

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { Ambulance, Check, Clock3, ScrollText, Send, UserRound, X, XCircle } from "lucide-react";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { FacilityRequiredNotice } from "@/components/facility-selector";
import { demoReferrals } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/use-workspace";
import { Ambulance as AmbulanceType, Referral, ReferralEvent, REFERRAL_STEPS, ReferralStatus, TransferMode } from "@/lib/types";

const EVENT_DOT: Partial<Record<ReferralStatus, string>> = {
  searching: "event-blue",
  ready_to_send: "event-blue",
  hospital_accepted: "event-teal",
  family_confirmed: "event-teal",
  ambulance_arranged: "event-green",
  patient_en_route: "event-green",
  patient_received: "event-green",
  closed: "event-green"
};

function stepLabel(status: ReferralStatus) {
  return REFERRAL_STEPS.find((s) => s.status === status)?.label ?? status;
}

function transferLabel(mode?: TransferMode) {
  if (mode === "internal_onsite") return "Internal · patient on-site";
  if (mode === "internal_offsite") return "Internal · off-site pickup";
  return "External network referral";
}

export default function ReferralDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { activeHospitalId, actingPayload } = useWorkspace();
  const [referral, setReferral] = useState<Referral | null>(null);
  const [events, setEvents] = useState<ReferralEvent[]>([]);
  const [ambulances, setAmbulances] = useState<AmbulanceType[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showAmbulanceModal, setShowAmbulanceModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState("");
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

  useEffect(() => {
    if (!isSupabaseConfigured || !activeHospitalId || !referral) return;
    if (referral.transfer_mode === "internal_onsite") return;
    fetch(`/api/hospitals/${activeHospitalId}/ambulances`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ambulances) setAmbulances(data.ambulances.filter((a: AmbulanceType) => a.status === "available"));
      })
      .catch(() => {});
  }, [activeHospitalId, referral?.transfer_mode]);

  const isReferringHospital = useMemo(() => {
    if (!referral || !activeHospitalId) return false;
    return referral.referring_facility_id === activeHospitalId;
  }, [referral, activeHospitalId]);

  const canRespondAsReceiver = useMemo(() => {
    if (!referral || !activeHospitalId || referral.status !== "searching") return false;
    if (referral.referring_facility_id === activeHospitalId && referral.transfer_mode === "external") return false;
    if (referral.receiving_facility_id && referral.receiving_facility_id !== activeHospitalId) return false;
    return true;
  }, [referral, activeHospitalId]);

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
      setShowFamilyModal(false);
      setShowDeclineModal(false);
      setShowAmbulanceModal(false);
      setDeclineReason("");
      setSelectedAmbulanceId("");
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
  const needsTransport = referral.transfer_mode !== "internal_onsite";
  const selectedAmbulance = ambulances.find((a) => a.id === selectedAmbulanceId);

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
                {referral.receiving_facility ? ` → ${referral.receiving_facility}` : ""}
              </p>
              <small style={{ color: "var(--muted)" }}>{transferLabel(referral.transfer_mode)}</small>
              {referral.patient_location && (
                <small style={{ display: "block", color: "var(--muted)" }}>Pickup: {referral.patient_location}</small>
              )}
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
                const skip =
                  !needsTransport && ["ambulance_arranged", "patient_en_route"].includes(step.status);
                if (skip) return null;
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

          <div className="panel">
            <div className="panel-heading">
              <div>
                <h2>Full audit trail</h2>
                <p>Every state transition, as written to the event log.</p>
              </div>
              <ScrollText size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
            </div>
            {events.length === 0 ? (
              <p className="empty-state">No transitions recorded yet — this case is still in draft.</p>
            ) : (
              <div className="audit-card" style={{ margin: 0, width: "100%", transform: "none", boxShadow: "none", border: "1px solid var(--line)" }}>
                <div className="audit-title" style={{ display: "flex" }}>
                  <span>
                    <ScrollText size={13} /> {referral.reference}
                  </span>
                  <small>{events.length} event{events.length === 1 ? "" : "s"}</small>
                </div>
                {[...events]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((event) => (
                    <div className="audit-event" style={{ display: "flex" }} key={event.id}>
                      <i className={EVENT_DOT[event.to_status] ?? "event-teal"} />
                      <div>
                        <b>
                          {event.from_status ? `${stepLabel(event.from_status)} → ` : ""}
                          {stepLabel(event.to_status)}
                        </b>
                        <span>{event.actor_user_id ? "Care team member" : "System"}</span>
                        {event.notes && <small style={{ display: "block", color: "var(--muted)" }}>{event.notes}</small>}
                      </div>
                      <time>{new Date(event.created_at).toLocaleString()}</time>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <aside className="detail-aside">
          <section className="panel">
            <h2>Actions</h2>

            {referral.status === "ready_to_send" && isReferringHospital && (
              <button className="button full-button" disabled={busy} onClick={() => runAction("send")}>
                <Send size={16} /> Send to hospitals
              </button>
            )}

            {referral.status === "searching" && isReferringHospital && !canRespondAsReceiver && (
              <p className="empty-state">
                Waiting for the receiving hospital to accept or decline. You can continue once they respond.
              </p>
            )}

            {referral.status === "searching" && canRespondAsReceiver && (
              <>
                <button className="button full-button" disabled={busy} onClick={() => runAction("accept")}>
                  <Check size={16} /> Accept referral
                </button>
                <button className="button danger full-button" disabled={busy} onClick={() => setShowDeclineModal(true)}>
                  <XCircle size={16} /> Decline referral
                </button>
              </>
            )}

            {referral.status === "hospital_accepted" && isReferringHospital && (
              <button className="button full-button" disabled={busy} onClick={() => setShowFamilyModal(true)}>
                <UserRound size={16} /> Record family confirmation
              </button>
            )}

            {referral.status === "family_confirmed" && isReferringHospital && needsTransport && (
              <button className="button full-button" disabled={busy} onClick={() => setShowAmbulanceModal(true)}>
                <Ambulance size={16} /> Dispatch ambulance
              </button>
            )}

            {referral.status === "family_confirmed" && isReferringHospital && !needsTransport && (
              <button className="button full-button" disabled={busy} onClick={() => runAction("receive-onsite")}>
                <Check size={16} /> Confirm patient on-site
              </button>
            )}

            {referral.status === "ambulance_arranged" && isReferringHospital && (
              <button className="button full-button" disabled={busy} onClick={() => runAction("en-route")}>
                <Ambulance size={16} /> Mark patient en route
              </button>
            )}

            {referral.status === "patient_en_route" && isReferringHospital && (
              <button className="button full-button" disabled={busy} onClick={() => runAction("received")}>
                <Check size={16} /> Confirm patient received
              </button>
            )}

            {referral.status === "patient_received" && isReferringHospital && (
              <button className="button full-button" disabled={busy} onClick={() => runAction("close")}>
                <Check size={16} /> Close case
              </button>
            )}

            {!isReferringHospital && !canRespondAsReceiver && referral.status !== "searching" && (
              <p className="empty-state">Referring facility is handling the next steps.</p>
            )}
          </section>

          <section className="panel">
            <h2>Case details</h2>
            <dl>
              <dt>Referring facility</dt>
              <dd>{referral.referring_facility}</dd>
              <dt>Care requirement</dt>
              <dd>{referral.care_level}</dd>
              <dt>Transfer type</dt>
              <dd>{transferLabel(referral.transfer_mode)}</dd>
              <dt>Consent</dt>
              <dd className={referral.consent_obtained ? "confirmed" : ""}>
                <Check size={15} /> {referral.consent_obtained ? "Complete" : "Pending"}
              </dd>
            </dl>
          </section>
        </aside>
      </section>

      {showFamilyModal && (
        <div className="modal-backdrop" onClick={() => setShowFamilyModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" type="button" aria-label="Close" onClick={() => setShowFamilyModal(false)}>
              <X size={16} />
            </button>
            <h2>Family confirmation</h2>
            <p>Captured after the family agrees to transfer. Required before transport or on-site handover.</p>
            <div className="form-grid">
              <label>
                Relationship
                <select value={family.relationship} onChange={(e) => setFamily((f) => ({ ...f, relationship: e.target.value }))}>
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
              <button className="button ghost" type="button" onClick={() => setShowFamilyModal(false)}>
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
          </div>
        </div>
      )}

      {showDeclineModal && (
        <div className="modal-backdrop" onClick={() => setShowDeclineModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" type="button" aria-label="Close" onClick={() => setShowDeclineModal(false)}>
              <X size={16} />
            </button>
            <h2>Decline referral</h2>
            <p>State why your facility cannot accept this case. The referring team will see this reason.</p>
            <label>
              Reason
              <textarea
                rows={3}
                placeholder="e.g. No ICU beds available at this time"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
              />
            </label>
            <div className="form-actions">
              <button className="button ghost" type="button" onClick={() => setShowDeclineModal(false)}>
                Cancel
              </button>
              <button
                className="button danger"
                type="button"
                disabled={busy || !declineReason.trim()}
                onClick={() => runAction("decline", { reason: declineReason.trim() })}
              >
                Decline referral
              </button>
            </div>
          </div>
        </div>
      )}

      {showAmbulanceModal && (
        <div className="modal-backdrop" onClick={() => setShowAmbulanceModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" type="button" aria-label="Close" onClick={() => setShowAmbulanceModal(false)}>
              <X size={16} />
            </button>
            <h2>Dispatch ambulance</h2>
            <p>Select an available unit. Dispatched ambulances cannot be reused until the patient is received.</p>
            {ambulances.length === 0 ? (
              <p className="empty-state">
                No ambulances available. Register units under Hospital workspace → Ambulances.
              </p>
            ) : (
              <>
                <label>
                  Ambulance
                  <select value={selectedAmbulanceId} onChange={(e) => setSelectedAmbulanceId(e.target.value)}>
                    <option value="">Select ambulance</option>
                    {ambulances.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.plate_number} · {a.driver_name}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedAmbulance && (
                  <div className="ambulance-preview">
                    <p>
                      <b>{selectedAmbulance.plate_number}</b>
                    </p>
                    <p>Driver: {selectedAmbulance.driver_name}</p>
                    {selectedAmbulance.driver_phone && <p>Phone: {selectedAmbulance.driver_phone}</p>}
                  </div>
                )}
              </>
            )}
            <div className="form-actions">
              <button className="button ghost" type="button" onClick={() => setShowAmbulanceModal(false)}>
                Cancel
              </button>
              <button
                className="button"
                type="button"
                disabled={busy || !selectedAmbulanceId}
                onClick={() => runAction("ambulance", { ambulance_id: selectedAmbulanceId })}
              >
                Dispatch ambulance
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

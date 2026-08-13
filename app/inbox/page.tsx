"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Inbox, RadioTower } from "lucide-react";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { FacilityRequiredNotice } from "@/components/facility-selector";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/use-workspace";
import { Referral } from "@/lib/types";

export default function InboxPage() {
  const { activeHospitalId, actingPayload } = useWorkspace();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [errored, setErrored] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  function loadInbox() {
    if (!isSupabaseConfigured) return;
    const params = activeHospitalId ? `?view=inbox&hospital_id=${activeHospitalId}` : "?view=inbox";
    fetch(`/api/referrals${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.referrals) {
          setReferrals(
            data.referrals.map((r: any) => ({
              ...r,
              referring_facility: r.referring?.name ?? "Unknown facility",
              receiving_facility: r.receiving?.name
            }))
          );
          setErrored(false);
        } else {
          setErrored(true);
        }
      })
      .catch(() => setErrored(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHospitalId]);

  async function respond(referralId: string, endpoint: "accept" | "decline", reason?: string) {
    if (!activeHospitalId) return;
    setBusyId(referralId);
    try {
      const res = await fetch(`/api/referrals/${referralId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...actingPayload,
          receiving_facility_id: activeHospitalId,
          ...(reason ? { reason } : {})
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      setReferrals((current) => current.filter((r) => r.id !== referralId));
      setDeclineId(null);
      setDeclineReason("");
    } catch (err: any) {
      setErrored(true);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Shell title="Hospital inbox">
      <FacilityRequiredNotice />

      {errored && (
        <div className="notice error">
          <RadioTower size={17} />
          <span>Could not complete the action. Check permissions and try again.</span>
        </div>
      )}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Incoming referrals</h2>
            <p>Accept or decline with a reason — referring staff can only continue after you accept.</p>
          </div>
          <Link href="/dashboard" className="text-link">
            Back to dashboard <ArrowRight size={15} />
          </Link>
        </div>

        {loading ? (
          <p className="empty-state">Loading inbox...</p>
        ) : referrals.length === 0 ? (
          <p className="empty-state">
            <Inbox size={28} style={{ display: "block", margin: "0 auto 12px", opacity: 0.4 }} />
            No referrals awaiting response.
          </p>
        ) : (
          <div className="inbox-list">
            {referrals.map((r) => (
              <article key={r.id} className="inbox-item">
                <div>
                  <Link href={`/referrals/${r.id}`} className="ref-link">
                    {r.reference}
                  </Link>
                  <p>
                    {r.care_level} · <span className={`urgency ${r.urgency}`}>{r.urgency}</span>
                  </p>
                  <small>From {r.referring_facility}</small>
                </div>
                <div className="inbox-actions">
                  <StatusBadge status={r.status} />
                  <button
                    className="button"
                    type="button"
                    disabled={!activeHospitalId || busyId === r.id}
                    onClick={() => respond(r.id, "accept")}
                  >
                    Accept
                  </button>
                  <button
                    className="button ghost"
                    type="button"
                    disabled={!activeHospitalId || busyId === r.id}
                    onClick={() => setDeclineId(r.id)}
                  >
                    Decline
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {declineId && (
        <div className="modal-backdrop" onClick={() => setDeclineId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Decline referral</h2>
            <p>Give the referring team a clear reason (e.g. no beds, wrong care level).</p>
            <textarea
              rows={3}
              placeholder="Reason for declining"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
            <div className="form-actions">
              <button className="button ghost" type="button" onClick={() => setDeclineId(null)}>
                Cancel
              </button>
              <button
                className="button danger"
                type="button"
                disabled={!declineReason.trim() || busyId === declineId}
                onClick={() => respond(declineId, "decline", declineReason.trim())}
              >
                Decline referral
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

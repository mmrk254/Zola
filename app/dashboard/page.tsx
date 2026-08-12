"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BedDouble, Clock3, Plus, RadioTower } from "lucide-react";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { FacilityRequiredNotice } from "@/components/facility-selector";
import { demoReferrals } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/use-workspace";
import { Referral } from "@/lib/types";

export default function Dashboard() {
  const { activeHospitalId } = useWorkspace();
  const [referrals, setReferrals] = useState<Referral[]>(demoReferrals);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const params = activeHospitalId ? `?hospital_id=${activeHospitalId}` : "";
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
        } else setErrored(true);
      })
      .catch(() => setErrored(true))
      .finally(() => setLoading(false));
  }, [activeHospitalId]);

  const active = referrals.filter((r) => !["closed", "draft"].includes(r.status));
  const awaitingBed = referrals.filter((r) => ["searching", "ready_to_send"].includes(r.status)).length;

  return (
    <Shell
      title="Operations dashboard"
      action={
        <Link href="/referrals/new" className="button compact">
          <Plus size={15} /> New referral
        </Link>
      }
    >
      <FacilityRequiredNotice />

      {!isSupabaseConfigured && (
        <div className="notice warn">
          <RadioTower size={16} />
          <span>Demo workspace active until Supabase is configured.</span>
        </div>
      )}
      {errored && (
        <div className="notice error">
          <RadioTower size={16} />
          <span>Could not reach the referral service.</span>
        </div>
      )}

      <section className="metrics compact-metrics ops-metrics">
        <article>
          <div className="metric-icon"><RadioTower /></div>
          <p>Active referrals</p>
          <strong>{loading ? "..." : active.length}</strong>
        </article>
        <article>
          <div className="metric-icon amber"><Clock3 /></div>
          <p>Awaiting a bed</p>
          <strong>{loading ? "..." : awaitingBed}</strong>
        </article>
        <article>
          <div className="metric-icon green"><BedDouble /></div>
          <p>Care levels</p>
          <strong>ICU · HDU · NICU</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Live referral queue</h2>
            <p>Cases requiring active coordination</p>
          </div>
          <Link href="/referrals/new" className="text-link">
            Create referral <ArrowRight size={14} />
          </Link>
        </div>

        <div className="referral-cards mobile-only">
          {referrals.length === 0 && !loading ? (
            <p className="empty-state">No referrals yet.</p>
          ) : (
            referrals.map((r) => (
              <Link key={r.id} href={`/referrals/${r.id}`} className="referral-card">
                <div className="referral-card-top">
                  <strong>{r.reference}</strong>
                  <StatusBadge status={r.status} />
                </div>
                <p>
                  {r.patient_initials} · {r.care_level} · <span className={`urgency ${r.urgency}`}>{r.urgency}</span>
                </p>
                <small>{r.referring_facility}</small>
              </Link>
            ))
          )}
        </div>

        <div className="table-wrap desktop-only">
          {referrals.length === 0 && !loading ? (
            <p className="empty-state">No referrals yet. Create the first one to get started.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Referral</th>
                  <th>Level</th>
                  <th>Urgency</th>
                  <th>Status</th>
                  <th>Facility</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/referrals/${r.id}`} className="ref-link">
                        {r.reference}
                        <small>{r.patient_initials}</small>
                      </Link>
                    </td>
                    <td><b>{r.care_level}</b></td>
                    <td><span className={`urgency ${r.urgency}`}>{r.urgency}</span></td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>{r.referring_facility}</td>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </Shell>
  );
}

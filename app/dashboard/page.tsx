"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BedDouble, Clock3, Plus, RadioTower } from "lucide-react";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { demoReferrals } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { Referral } from "@/lib/types";

export default function Dashboard() {
  const [referrals, setReferrals] = useState<Referral[]>(demoReferrals);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    fetch("/api/referrals")
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
        } else {
          setErrored(true);
        }
      })
      .catch(() => setErrored(true))
      .finally(() => setLoading(false));
  }, []);

  const active = referrals.filter((r) => !["closed", "draft"].includes(r.status));
  const awaitingBed = referrals.filter((r) => ["searching", "ready_to_send"].includes(r.status)).length;

  return (
    <Shell
      title="Operations dashboard"
      action={
        <Link href="/referrals/new" className="button">
          <Plus size={16} /> New referral
        </Link>
      }
    >
      {!isSupabaseConfigured && (
        <div className="notice warn">
          <RadioTower size={17} />
          <span>
            <b>Demo workspace</b> is active until Supabase environment variables are configured.
          </span>
        </div>
      )}
      {errored && (
        <div className="notice error">
          <RadioTower size={17} />
          <span>Could not reach the referral service. Showing the last known data.</span>
        </div>
      )}

      <section className="metrics">
        <article>
          <div className="metric-icon">
            <RadioTower />
          </div>
          <p>Active referrals</p>
          <strong>{loading ? "—" : active.length}</strong>
          <small>Across all hospitals</small>
        </article>
        <article>
          <div className="metric-icon amber">
            <Clock3 />
          </div>
          <p>Awaiting a bed</p>
          <strong>{loading ? "—" : awaitingBed}</strong>
          <small>Critical and urgent cases</small>
        </article>
        <article>
          <div className="metric-icon green">
            <BedDouble />
          </div>
          <p>Care levels tracked</p>
          <strong>3</strong>
          <small>ICU, HDU, NICU</small>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Live referral queue</h2>
            <p>Cases requiring active coordination</p>
          </div>
          <Link href="/referrals/new" className="text-link">
            Create referral <ArrowRight size={15} />
          </Link>
        </div>
        <div className="table-wrap">
          {referrals.length === 0 && !loading ? (
            <p className="empty-state">No referrals yet. Create the first one to get started.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Referral</th>
                  <th>Level</th>
                  <th>Urgency</th>
                  <th>Current status</th>
                  <th>Referring facility</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/referrals/${r.id}`} className="ref-link">
                        {r.reference}
                        <small>{r.patient_initials} · Patient initials</small>
                      </Link>
                    </td>
                    <td>
                      <b>{r.care_level}</b>
                    </td>
                    <td>
                      <span className={`urgency ${r.urgency}`}>{r.urgency}</span>
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td>{r.referring_facility}</td>
                    <td>{r.created_at}</td>
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

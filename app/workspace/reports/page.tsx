"use client";

import { useEffect, useMemo, useState } from "react";
import { HospitalShell } from "@/components/hospital-shell";
import { FacilityRequiredNotice } from "@/components/facility-selector";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/use-workspace";
import { demoReferrals } from "@/lib/demo-data";
import { CareLevel, PIPELINE_BUCKETS, Referral, Urgency } from "@/lib/types";

function BarRows({ rows }: { rows: { label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="report-bars">
      {rows.map((r) => (
        <div className="report-bar-row" key={r.label}>
          <span>{r.label}</span>
          <div className="report-bar-track">
            <div className="report-bar-fill" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
          <span style={{ textAlign: "right", fontWeight: 700 }}>{r.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const { activeHospitalId } = useWorkspace();
  const [referrals, setReferrals] = useState<Referral[]>(demoReferrals);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const params = activeHospitalId ? `?hospital_id=${activeHospitalId}` : "";
    fetch(`/api/referrals${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.referrals) setReferrals(data.referrals);
      })
      .finally(() => setLoading(false));
  }, [activeHospitalId]);

  const total = referrals.length;
  const closedOrLater = referrals.filter((r) => ["patient_received", "closed"].includes(r.status)).length;
  const stillSearching = referrals.filter((r) => r.status === "searching").length;
  const matchedRate = total ? Math.round(((total - stillSearching) / total) * 100) : 0;

  const pipeline = useMemo(
    () => PIPELINE_BUCKETS.map((b) => ({ label: b.label, count: referrals.filter((r) => b.statuses.includes(r.status)).length })),
    [referrals]
  );

  const byCareLevel = useMemo(() => {
    const levels: CareLevel[] = ["ICU", "HDU", "NICU"];
    return levels.map((level) => ({ label: level, count: referrals.filter((r) => r.care_level === level).length }));
  }, [referrals]);

  const byUrgency = useMemo(() => {
    const urgencies: Urgency[] = ["critical", "urgent", "routine"];
    return urgencies.map((u) => ({
      label: u[0].toUpperCase() + u.slice(1),
      count: referrals.filter((r) => r.urgency === u).length
    }));
  }, [referrals]);

  return (
    <HospitalShell title="Reports & analytics">
      <FacilityRequiredNotice />

      <section className="metrics compact-metrics">
        <article>
          <p>Total referrals</p>
          <strong>{loading ? "..." : total}</strong>
        </article>
        <article>
          <p>Matched to a bed</p>
          <strong>{loading ? "..." : `${matchedRate}%`}</strong>
          <small>Not still in &quot;searching&quot;</small>
        </article>
        <article>
          <p>Closed out</p>
          <strong>{loading ? "..." : closedOrLater}</strong>
          <small>Received or closed</small>
        </article>
      </section>

      <section className="report-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Pipeline breakdown</h2>
              <p>Every case, by stage</p>
            </div>
          </div>
          <BarRows rows={pipeline} />
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>By care level</h2>
              <p>ICU · HDU · NICU volume</p>
            </div>
          </div>
          <BarRows rows={byCareLevel} />
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>By urgency</h2>
              <p>Critical · urgent · routine</p>
            </div>
          </div>
          <BarRows rows={byUrgency} />
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Turnaround time</h2>
              <p>Requires per-event timestamps</p>
            </div>
          </div>
          <p className="empty-state" style={{ padding: "20px 4px", textAlign: "left" }}>
            Referral-to-acceptance turnaround needs the audit log timestamps from{" "}
            <code>GET /referrals/{"{id}"}/events</code> aggregated across cases. Worth building once there&apos;s enough
            closed-case volume to make the average meaningful — the counts above are accurate today.
          </p>
        </div>
      </section>
    </HospitalShell>
  );
}

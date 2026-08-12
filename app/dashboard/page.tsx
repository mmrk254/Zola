"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  Building2,
  ClipboardPlus,
  Clock3,
  Inbox,
  Plus,
  RadioTower,
  Users
} from "lucide-react";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { FacilityRequiredNotice } from "@/components/facility-selector";
import { demoReferrals } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/use-workspace";
import { Referral, ReferralStatus } from "@/lib/types";

const PIPELINE: { status: ReferralStatus; label: string }[] = [
  { status: "searching", label: "Searching" },
  { status: "hospital_accepted", label: "Accepted" },
  { status: "family_confirmed", label: "Family OK" },
  { status: "patient_en_route", label: "En route" },
  { status: "patient_received", label: "Received" }
];

export default function Dashboard() {
  const { session, activeHospitalId } = useWorkspace();
  const [referrals, setReferrals] = useState<Referral[]>(demoReferrals);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [errored, setErrored] = useState(false);

  const isAdmin =
    session?.networkAdmin ||
    session?.memberships.some((m) => m.role === "hospital_admin" && m.status === "active");

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
  const critical = referrals.filter((r) => r.urgency === "critical" && r.status !== "closed").length;
  const inboxCount = referrals.filter((r) => r.status === "searching").length;

  const pipelineCounts = useMemo(() => {
    return PIPELINE.map((step) => ({
      ...step,
      count: referrals.filter((r) => r.status === step.status).length
    }));
  }, [referrals]);

  const recent = [...referrals].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 5);

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

      {session?.user?.name && (
        <section className="welcome-strip">
          <div>
            <p className="eyebrow">Welcome back</p>
            <h2>{session.user.name}</h2>
          </div>
          <div className="welcome-meta">
            <span>{session.memberships[0]?.hospital_name ?? "Network workspace"}</span>
            <span className="role-pill">{session.memberships[0]?.role?.replace("_", " ") ?? "admin"}</span>
          </div>
        </section>
      )}

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

      <section className="quick-actions">
        <Link href="/referrals/new" className="quick-action">
          <ClipboardPlus size={18} />
          <span>New referral</span>
        </Link>
        <Link href="/inbox" className="quick-action">
          <Inbox size={18} />
          <span>Inbox {inboxCount > 0 && <em>{inboxCount}</em>}</span>
        </Link>
        {isAdmin && (
          <Link href="/staff" className="quick-action">
            <Users size={18} />
            <span>Staff accounts</span>
          </Link>
        )}
        <Link href="/inbox" className="quick-action">
          <Building2 size={18} />
          <span>Bed requests</span>
        </Link>
      </section>

      <section className="metrics compact-metrics">
        <article>
          <div className="metric-icon"><RadioTower /></div>
          <p>Active</p>
          <strong>{loading ? "..." : active.length}</strong>
        </article>
        <article>
          <div className="metric-icon amber"><Clock3 /></div>
          <p>Awaiting bed</p>
          <strong>{loading ? "..." : awaitingBed}</strong>
        </article>
        <article>
          <div className="metric-icon red"><BedDouble /></div>
          <p>Critical</p>
          <strong>{loading ? "..." : critical}</strong>
        </article>
        <article>
          <div className="metric-icon green"><Building2 /></div>
          <p>In inbox</p>
          <strong>{loading ? "..." : inboxCount}</strong>
        </article>
      </section>

      <section className="pipeline-bar panel">
        <div className="panel-heading">
          <div>
            <h2>Referral pipeline</h2>
            <p>Live counts across coordination stages</p>
          </div>
        </div>
        <div className="pipeline-track">
          {pipelineCounts.map((step) => (
            <div key={step.status} className="pipeline-step">
              <strong>{step.count}</strong>
              <span>{step.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Live referral queue</h2>
            <p>Cases requiring active coordination</p>
          </div>
          <Link href="/referrals/new" className="text-link">
            Create <ArrowRight size={14} />
          </Link>
        </div>

        <div className="referral-cards mobile-only">
          {recent.length === 0 && !loading ? (
            <p className="empty-state">No referrals yet.</p>
          ) : (
            recent.map((r) => (
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
          {recent.length === 0 && !loading ? (
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
                {recent.map((r) => (
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

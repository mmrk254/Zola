"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  Bell,
  Building2,
  FileBarChart2,
  Inbox,
  LayoutDashboard,
  Truck,
  Users
} from "lucide-react";
import { HospitalShell } from "@/components/hospital-shell";
import { useNotifications } from "@/components/notification-bell";
import { useWorkspace } from "@/lib/use-workspace";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { demoCapacity, demoReferrals } from "@/lib/demo-data";
import { CapacitySnapshot, PIPELINE_BUCKETS, Referral } from "@/lib/types";

const QUICK_ACTIONS = [
  { href: "/workspace/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard", label: "Referral operations", icon: LayoutDashboard },
  { href: "/workspace/capacity", label: "Bed & capacity", icon: BedDouble },
  { href: "/workspace/ambulances", label: "Ambulances", icon: Truck },
  { href: "/inbox", label: "Referral inbox", icon: Inbox },
  { href: "/workspace/staff", label: "Staff accounts", icon: Users },
  { href: "/workspace/reports", label: "Reports", icon: FileBarChart2 }
];

export default function HospitalDashboard() {
  const { session, activeHospitalId } = useWorkspace();
  const { items: notifications, unread } = useNotifications();
  const [stats, setStats] = useState({ referrals: 0, staff: 0, searching: 0 });
  const [referrals, setReferrals] = useState<Referral[]>(demoReferrals);
  const [capacity, setCapacity] = useState<CapacitySnapshot[]>(demoCapacity);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const hospitalParam = activeHospitalId ? `?hospital_id=${activeHospitalId}` : "";
    Promise.all([
      fetch(`/api/referrals${hospitalParam}`).then((r) => r.json()),
      fetch(`/api/staff${hospitalParam}`).then((r) => r.json()),
      activeHospitalId
        ? fetch(`/api/hospitals/${activeHospitalId}/capacity`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        : Promise.resolve(null)
    ])
      .then(([refData, staffData, capacityData]) => {
        const refs = refData.referrals ?? [];
        setReferrals(refs);
        setStats({
          referrals: refs.length,
          staff: staffData.staff?.length ?? 0,
          searching: refs.filter((r: { status: string }) => r.status === "searching").length
        });
        if (capacityData?.capacity) setCapacity(capacityData.capacity);
      })
      .finally(() => setLoading(false));
  }, [activeHospitalId]);

  const hospitalName =
    session?.memberships.find((m) => m.hospital_id === activeHospitalId)?.hospital_name ??
    session?.memberships[0]?.hospital_name ??
    "Your facility";

  const pipeline = useMemo(
    () =>
      PIPELINE_BUCKETS.map((bucket) => ({
        label: bucket.label,
        count: referrals.filter((r) => bucket.statuses.includes(r.status)).length
      })),
    [referrals]
  );

  const facilityOpen = capacity.every((c) => c.facility_status !== "closed");

  return (
    <HospitalShell title="Hospital overview">
      <div className="hospital-dash">
        <header className="hospital-dash-head">
          <div>
            <p className="eyebrow">Facility</p>
            <h2>{hospitalName}</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className={`facility-status-pill ${facilityOpen ? "open" : "at_capacity"}`}>
              <span className={`online-dot ${facilityOpen ? "" : "offline"}`} />
              {facilityOpen ? "Accepting referrals" : "Limited capacity"}
            </span>
            <span className="role-pill">Hospital admin</span>
          </div>
        </header>

        <div className="hospital-dash-stats">
          <article>
            <p>Referrals</p>
            <strong>{loading ? "..." : stats.referrals}</strong>
          </article>
          <article>
            <p>Staff</p>
            <strong>{loading ? "..." : stats.staff}</strong>
          </article>
          <article>
            <p>Searching</p>
            <strong>{loading ? "..." : stats.searching}</strong>
          </article>
        </div>

        {unread.length > 0 && (
          <section className="panel hospital-notif-strip" style={{ maxWidth: "none" }}>
            <div className="panel-heading">
              <div>
                <h2>Needs attention</h2>
                <p>{unread.length} referral{unread.length === 1 ? "" : "s"} waiting on your team</p>
              </div>
              <Link href="/workspace/notifications" className="text-link">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="inbox-list">
              {notifications.slice(0, 3).map((n) => (
                <article key={n.id} className="inbox-item unread">
                  <div>
                    <Link href={`/referrals/${n.referralId}`} className="ref-link">
                      {n.reference}
                    </Link>
                    <p>{n.message}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="panel" style={{ maxWidth: "none" }}>
          <div className="panel-heading">
            <div>
              <h2>Bed capacity</h2>
              <p>Live availability by care level</p>
            </div>
            <Link href="/workspace/capacity" className="text-link">
              Manage capacity <ArrowRight size={14} />
            </Link>
          </div>
          <div className="capacity-grid">
            {capacity.map((c) => (
              <div className="capacity-card" key={c.care_level}>
                <h3>{c.care_level}</h3>
                <div className="capacity-count">
                  <strong style={{ fontSize: 22 }}>{c.available_beds}</strong>
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>beds free</span>
                </div>
                <span className={`facility-status-pill ${c.facility_status}`}>
                  {c.facility_status.replace("_", " ")}
                </span>
                <span className="capacity-updated">Updated {c.updated_at}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="quick-actions hospital-quick-actions" style={{ maxWidth: "none" }}>
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.href} href={action.href} className="quick-action">
              <action.icon size={16} /> {action.label}
            </Link>
          ))}
        </div>

        <section className="panel pipeline-bar" style={{ maxWidth: "none" }}>
          <div className="panel-heading">
            <div>
              <h2>Referral pipeline</h2>
              <p>Cases involving your facility, by stage</p>
            </div>
          </div>
          <div className="pipeline-track">
            {pipeline.map((stage) => (
              <div className="pipeline-step" key={stage.label}>
                <strong>{loading ? "..." : stage.count}</strong>
                <span>{stage.label}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="hospital-dash-actions">
          <Link href="/workspace/staff" className="hospital-dash-link">
            <Users size={18} />
            <span>
              <b>Staff accounts</b>
              <small>Create logins for your referral team</small>
            </span>
            <ArrowRight size={16} />
          </Link>
          <Link href="/workspace/settings" className="hospital-dash-link">
            <Building2 size={18} />
            <span>
              <b>Facility settings</b>
              <small>Profile, capacity, and contacts</small>
            </span>
            <ArrowRight size={16} />
          </Link>
        </div>

        <p className="hospital-dash-note">
          Clinical staff sign in via <Link href="/login?next=/referrals/new">Create a referral</Link> on the homepage, not here.
        </p>
      </div>
    </HospitalShell>
  );
}

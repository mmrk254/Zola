"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Users } from "lucide-react";
import { HospitalShell } from "@/components/hospital-shell";
import { useWorkspace } from "@/lib/use-workspace";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function HospitalDashboard() {
  const { session, activeHospitalId } = useWorkspace();
  const [stats, setStats] = useState({ referrals: 0, staff: 0, searching: 0 });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const hospitalParam = activeHospitalId ? `?hospital_id=${activeHospitalId}` : "";
    Promise.all([
      fetch(`/api/referrals${hospitalParam}`).then((r) => r.json()),
      fetch(`/api/staff${hospitalParam}`).then((r) => r.json())
    ]).then(([refData, staffData]) => {
      const refs = refData.referrals ?? [];
      setStats({
        referrals: refs.length,
        staff: staffData.staff?.length ?? 0,
        searching: refs.filter((r: { status: string }) => r.status === "searching").length
      });
    });
  }, [activeHospitalId]);

  const hospitalName =
    session?.memberships.find((m) => m.hospital_id === activeHospitalId)?.hospital_name ??
    session?.memberships[0]?.hospital_name ??
    "Your facility";

  return (
    <HospitalShell title="Hospital overview">
      <div className="hospital-dash">
        <header className="hospital-dash-head">
          <div>
            <p className="eyebrow">Facility</p>
            <h2>{hospitalName}</h2>
          </div>
          <span className="role-pill">Hospital admin</span>
        </header>

        <div className="hospital-dash-stats">
          <article>
            <p>Referrals</p>
            <strong>{stats.referrals}</strong>
          </article>
          <article>
            <p>Staff</p>
            <strong>{stats.staff}</strong>
          </article>
          <article>
            <p>Searching</p>
            <strong>{stats.searching}</strong>
          </article>
        </div>

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

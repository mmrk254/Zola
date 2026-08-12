"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ClipboardPlus, RadioTower, Users } from "lucide-react";
import { HospitalShell } from "@/components/hospital-shell";
import { useWorkspace } from "@/lib/use-workspace";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function HospitalDashboard() {
  const { session, activeHospitalId } = useWorkspace();
  const [stats, setStats] = useState({ referrals: 0, staff: 0, searching: 0 });

  const isAdmin =
    session?.networkAdmin ||
    session?.memberships.some((m) => m.role === "hospital_admin" && m.status === "active");

  useEffect(() => {
    if (session && !isAdmin) {
      window.location.assign("/login");
    }
  }, [session, isAdmin]);

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
      <section className="welcome-strip hospital-welcome">
        <div>
          <p className="eyebrow">Facility</p>
          <h2>{hospitalName}</h2>
        </div>
        <span className="role-pill">Hospital admin</span>
      </section>

      <section className="metrics compact-metrics">
        <article>
          <p>Total referrals</p>
          <strong>{stats.referrals}</strong>
        </article>
        <article>
          <p>Staff accounts</p>
          <strong>{stats.staff}</strong>
        </article>
        <article>
          <p>Active searches</p>
          <strong>{stats.searching}</strong>
        </article>
      </section>

      <section className="hospital-modules">
        <Link href="/workspace/staff" className="hospital-module">
          <Users size={20} />
          <div>
            <h3>Staff accounts</h3>
            <p>Create login credentials for nurses, clinicians, and coordination staff.</p>
          </div>
        </Link>
        <Link href="/login?next=/dashboard" className="hospital-module">
          <ClipboardPlus size={20} />
          <div>
            <h3>Referral operations</h3>
            <p>Open the clinical dashboard where staff manage live referrals.</p>
          </div>
        </Link>
        <Link href="/workspace/settings" className="hospital-module">
          <Building2 size={20} />
          <div>
            <h3>Facility settings</h3>
            <p>Capacity, contact details, and hospital profile.</p>
          </div>
        </Link>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Getting started</h2>
            <p>Provision staff first, then they sign in via Create a referral on the public site.</p>
          </div>
        </div>
        <ol className="hospital-checklist">
          <li>Create staff accounts with roles (clinician, hospital staff, or admin).</li>
          <li>Share credentials securely with each team member.</li>
          <li>Staff use <b>Create a referral</b> on the homepage to sign in and work cases.</li>
        </ol>
      </section>

      {!isSupabaseConfigured && (
        <div className="notice warn">
          <RadioTower size={16} /> Connect Supabase to enable live hospital management.
        </div>
      )}
    </HospitalShell>
  );
}

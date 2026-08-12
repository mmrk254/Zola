"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Plus, UserPlus, Users } from "lucide-react";
import { Shell } from "@/components/shell";
import { FacilityRequiredNotice } from "@/components/facility-selector";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/use-workspace";

type StaffMember = {
  id: string;
  role: string;
  status: string;
  users: { id: string; name: string; email: string };
};

export default function StaffPage() {
  const { session, activeHospitalId, actingPayload } = useWorkspace();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "clinician", password: "" });

  const isAdmin =
    session?.networkAdmin ||
    session?.memberships.some((m) => m.role === "hospital_admin" && m.status === "active");

  async function load() {
    if (!isSupabaseConfigured || !isAdmin) {
      setLoading(false);
      return;
    }
    const params = activeHospitalId ? `?hospital_id=${activeHospitalId}` : "";
    const res = await fetch(`/api/staff${params}`);
    const data = await res.json();
    if (res.ok) setStaff(data.staff ?? []);
    else setError(data.error ?? "Could not load staff");
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHospitalId, isAdmin]);

  async function createStaff(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setCreatedPassword(null);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...actingPayload })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create staff account");
      setCreatedPassword(form.password);
      setForm({ name: "", email: "", role: "clinician", password: "" });
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAdmin) {
    return (
      <Shell title="Staff">
        <div className="notice warn">Only hospital administrators can manage staff accounts.</div>
        <Link href="/dashboard" className="text-link">
          Back to dashboard
        </Link>
      </Shell>
    );
  }

  return (
    <Shell
      title="Staff accounts"
      action={
        <span className="header-pill">
          <Users size={14} /> {staff.length} members
        </span>
      }
    >
      <FacilityRequiredNotice />

      {error && <div className="notice error">{error}</div>}
      {createdPassword && (
        <div className="notice">
          <UserPlus size={17} />
          <span>
            Account created. Share the temporary password securely: <b>{createdPassword}</b>
            <button type="button" className="inline-copy" onClick={() => navigator.clipboard.writeText(createdPassword)}>
              <Copy size={14} />
            </button>
          </span>
        </div>
      )}

      <div className="dash-split">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Facility team</h2>
              <p>Clinicians and coordination staff who handle referrals</p>
            </div>
          </div>
          {loading ? (
            <p className="empty-state">Loading staff...</p>
          ) : staff.length === 0 ? (
            <p className="empty-state">No staff accounts yet. Create the first one.</p>
          ) : (
            <div className="staff-list">
              {staff.map((member) => (
                <article key={member.id} className="staff-row">
                  <div>
                    <strong>{member.users?.name ?? "Unknown"}</strong>
                    <small>{member.users?.email}</small>
                  </div>
                  <span className="role-pill">{member.role.replace("_", " ")}</span>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel form-card compact-card">
          <div className="panel-heading">
            <div>
              <h2>Create account</h2>
              <p>Provision a referral handler at your hospital</p>
            </div>
          </div>
          <form onSubmit={createStaff} className="auth-form">
            <label className="auth-field">
              <span>Full name</span>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </label>
            <label className="auth-field">
              <span>Email</span>
              <input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </label>
            <label className="auth-field">
              <span>Role</span>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="clinician">Clinician</option>
                <option value="hospital_staff">Hospital staff</option>
                <option value="hospital_admin">Hospital admin</option>
              </select>
            </label>
            <label className="auth-field">
              <span>Temporary password</span>
              <input
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Share out of band"
              />
            </label>
            <button className="button" type="submit" disabled={submitting || !activeHospitalId}>
              <Plus size={15} /> {submitting ? "Creating..." : "Create staff account"}
            </button>
          </form>
        </section>
      </div>
    </Shell>
  );
}

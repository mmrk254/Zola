"use client";

import { FormEvent, useEffect, useState } from "react";
import { Copy, Pencil, Plus, UserPlus } from "lucide-react";
import { HospitalShell } from "@/components/hospital-shell";
import { FacilityRequiredNotice } from "@/components/facility-selector";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/use-workspace";

type StaffMember = {
  id: string;
  role: string;
  status: string;
  users: { id: string; name: string; email: string };
};

export default function WorkspaceStaffPage() {
  const { activeHospitalId, actingPayload } = useWorkspace();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "clinician", password: "" });
  const [editForm, setEditForm] = useState({ name: "", role: "clinician", status: "active", password: "" });

  async function load() {
    if (!isSupabaseConfigured) {
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
  }, [activeHospitalId]);

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

  async function updateStaff(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, ...actingPayload })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update staff");
      setEditing(null);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <HospitalShell title="Staff accounts">
      <FacilityRequiredNotice />
      {error && <div className="notice error">{error}</div>}
      {createdPassword && (
        <div className="notice">
          <UserPlus size={17} />
          <span>
            Account created. Temporary password: <b>{createdPassword}</b>
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
              <h2>Team members</h2>
              <p>Clinicians create referrals. Hospital staff handle inbox accept/decline. Admins manage the workspace.</p>
            </div>
          </div>
          {loading ? (
            <p className="empty-state">Loading...</p>
          ) : staff.length === 0 ? (
            <p className="empty-state">No staff accounts yet.</p>
          ) : (
            <div className="staff-list">
              {staff.map((member) => (
                <article key={member.id} className="staff-row">
                  <div>
                    <strong>{member.users?.name ?? "Unknown"}</strong>
                    <small>{member.users?.email}</small>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="role-pill">{member.role.replace("_", " ")}</span>
                    <button
                      className="button ghost compact"
                      type="button"
                      onClick={() => {
                        setEditing(member);
                        setEditForm({
                          name: member.users?.name ?? "",
                          role: member.role,
                          status: member.status,
                          password: ""
                        });
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel form-card compact-card">
          <div className="panel-heading">
            <div>
              <h2>Create account</h2>
              <p>For nurses, clinicians, or coordination staff</p>
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
                <option value="clinician">Clinician — create &amp; manage referrals</option>
                <option value="hospital_staff">Hospital staff — inbox accept/decline</option>
                <option value="hospital_admin">Hospital admin — full workspace</option>
              </select>
            </label>
            <label className="auth-field">
              <span>Temporary password</span>
              <input required minLength={8} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </label>
            <button className="button" type="submit" disabled={submitting || !activeHospitalId}>
              <Plus size={15} /> {submitting ? "Creating..." : "Create account"}
            </button>
          </form>
        </section>
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit staff member</h2>
            <p>{editing.users?.email}</p>
            <form onSubmit={updateStaff} className="auth-form">
              <label className="auth-field">
                <span>Full name</span>
                <input required value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
              </label>
              <label className="auth-field">
                <span>Role</span>
                <select value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}>
                  <option value="clinician">Clinician</option>
                  <option value="hospital_staff">Hospital staff</option>
                  <option value="hospital_admin">Hospital admin</option>
                </select>
              </label>
              <label className="auth-field">
                <span>Status</span>
                <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="revoked">Revoked</option>
                </select>
              </label>
              <label className="auth-field">
                <span>New password (optional)</span>
                <input
                  minLength={8}
                  value={editForm.password}
                  onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Leave blank to keep current"
                />
              </label>
              <div className="form-actions">
                <button className="button ghost" type="button" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button className="button" type="submit" disabled={submitting}>
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </HospitalShell>
  );
}

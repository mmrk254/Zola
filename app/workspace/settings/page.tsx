"use client";

import { FormEvent, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { HospitalShell } from "@/components/hospital-shell";
import { FacilityRequiredNotice } from "@/components/facility-selector";
import { useWorkspace } from "@/lib/use-workspace";

export default function WorkspaceSettingsPage() {
  const { session, activeHospitalId } = useWorkspace();
  const hospital =
    session?.memberships.find((m) => m.hospital_id === activeHospitalId) ?? session?.memberships[0];
  const [form, setForm] = useState({ name: "", address: "", contact_info: "", alert_phone: "", alert_email: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hospital?.hospital_id) return;
    fetch(`/api/hospitals/${hospital.hospital_id}`)
      .then((r) => r.json())
      .then((data) => data.hospital && setForm(data.hospital))
      .catch(() => setForm((value) => ({ ...value, name: hospital.hospital_name ?? "" })));
  }, [hospital?.hospital_id, hospital?.hospital_name]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!hospital?.hospital_id) return;
    setSaving(true);
    setMessage(null);
    const response = await fetch(`/api/hospitals/${hospital.hospital_id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form)
    });
    const data = await response.json();
    setMessage(response.ok ? "Facility settings saved." : data.error ?? "Could not save facility settings.");
    setSaving(false);
  }

  return (
    <HospitalShell title="Facility settings">
      <FacilityRequiredNotice />
      <form className="panel referral-form" onSubmit={save}>
        <div className="panel-heading"><div><h2>Facility settings</h2><p>Maintain the contact details used for operational and referral alerts.</p></div></div>
        {message && <div className={message.includes("saved") ? "notice success" : "notice error"}>{message}</div>}
        <div className="form-grid">
          <label>Facility name<input required value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>General contact<input value={form.contact_info ?? ""} onChange={(e) => setForm({ ...form, contact_info: e.target.value })} placeholder="Phone or email" /></label>
          <label className="full">Address<input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Physical address" /></label>
          <label>SMS alert number<input type="tel" value={form.alert_phone ?? ""} onChange={(e) => setForm({ ...form, alert_phone: e.target.value })} placeholder="+254..." /></label>
          <label>Alert email<input type="email" value={form.alert_email ?? ""} onChange={(e) => setForm({ ...form, alert_email: e.target.value })} placeholder="alerts@facility.org" /></label>
        </div>
        <div className="form-actions"><button className="button" disabled={saving}><Save size={16} />{saving ? "Saving..." : "Save settings"}</button></div>
      </form>
    </HospitalShell>
  );
}

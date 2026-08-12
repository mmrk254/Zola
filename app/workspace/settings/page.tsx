"use client";

import { HospitalShell } from "@/components/hospital-shell";
import { FacilityRequiredNotice } from "@/components/facility-selector";
import { useWorkspace } from "@/lib/use-workspace";

export default function WorkspaceSettingsPage() {
  const { session, activeHospitalId } = useWorkspace();
  const hospital =
    session?.memberships.find((m) => m.hospital_id === activeHospitalId) ?? session?.memberships[0];

  return (
    <HospitalShell title="Facility settings">
      <FacilityRequiredNotice />
      <section className="panel">
        <h2>Hospital profile</h2>
        <dl className="settings-dl">
          <dt>Facility name</dt>
          <dd>{hospital?.hospital_name ?? "Not selected"}</dd>
          <dt>Your role</dt>
          <dd className="role-pill">{hospital?.role?.replace("_", " ") ?? "admin"}</dd>
          <dt>Status</dt>
          <dd>Active on network</dd>
        </dl>
        <p className="empty-state" style={{ textAlign: "left", padding: "16px 0 0" }}>
          Advanced capacity and contact settings will be available in a future release. For now, contact the platform team to update facility details.
        </p>
      </section>
    </HospitalShell>
  );
}

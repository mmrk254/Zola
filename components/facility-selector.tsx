"use client";

import { Building2, ChevronDown } from "lucide-react";
import { useWorkspace } from "@/lib/use-workspace";

export function FacilitySelector() {
  const { session, activeHospitalId, setActiveHospitalId, loading } = useWorkspace();

  if (loading || !session) return null;

  const memberships = session.memberships.filter((m) => m.status === "active");
  if (memberships.length <= 1 && !session.networkAdmin) return null;

  const active = memberships.find((m) => m.hospital_id === activeHospitalId);

  return (
    <label className="facility-selector">
      <Building2 size={15} />
      <span className="facility-selector-label">Acting for</span>
      <select
        value={activeHospitalId ?? ""}
        onChange={(e) => setActiveHospitalId(e.target.value)}
        aria-label="Select active facility"
      >
        <option value="" disabled>
          Select facility
        </option>
        {memberships.map((m) => (
          <option key={m.hospital_id} value={m.hospital_id}>
            {m.hospital_name ?? m.hospital_id.slice(0, 8)}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="facility-chevron" />
    </label>
  );
}

export function FacilityRequiredNotice() {
  const { session, activeHospitalId, loading } = useWorkspace();
  if (loading || !session) return null;

  const needsSelection =
    !session.networkAdmin && session.memberships.filter((m) => m.status === "active").length > 1;

  if (!needsSelection || activeHospitalId) return null;

  return (
    <div className="notice warn">
      <Building2 size={17} />
      <span>Select which facility you are acting for before continuing.</span>
    </div>
  );
}

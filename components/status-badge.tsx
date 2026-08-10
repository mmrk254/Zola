import { ReferralStatus } from "@/lib/types";

const statusLabels: Record<ReferralStatus, string> = {
  draft: "Draft",
  consent_pending: "Consent pending",
  ready_to_send: "Ready to send",
  searching: "Searching for bed",
  hospital_accepted: "Hospital accepted",
  family_confirmed: "Family confirmed",
  ambulance_arranged: "Ambulance arranged",
  patient_en_route: "Patient en route",
  patient_received: "Patient received",
  closed: "Closed"
};

export function StatusBadge({ status }: { status: ReferralStatus }) {
  return <span className={`status ${status}`}>{statusLabels[status]}</span>;
}

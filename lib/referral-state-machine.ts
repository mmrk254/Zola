import { ReferralStatus } from "@/lib/types";

/**
 * Allowed from -> to transitions, mirroring the Zola data model & API spec.
 * A decline branch returns the case from "searching" to "ready_to_send" so
 * it can be re-broadcast to another facility.
 */
export const ALLOWED_TRANSITIONS: Record<string, ReferralStatus[]> = {
  send: ["ready_to_send"],
  accept: ["searching"],
  decline: ["searching"],
  "family-confirmation": ["hospital_accepted"],
  ambulance: ["family_confirmed"],
  "en-route": ["ambulance_arranged"],
  received: ["patient_en_route"],
  close: ["patient_received"]
};

export function canTransition(action: string, currentStatus: string) {
  const allowedFrom = ALLOWED_TRANSITIONS[action];
  return Boolean(allowedFrom && allowedFrom.includes(currentStatus as ReferralStatus));
}

export function nextReference(sequence: number) {
  const year = new Date().getFullYear();
  return `ZOL-${year}-${String(sequence).padStart(4, "0")}`;
}

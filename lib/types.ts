export type ReferralStatus =
  | "draft"
  | "consent_pending"
  | "ready_to_send"
  | "searching"
  | "hospital_accepted"
  | "family_confirmed"
  | "ambulance_arranged"
  | "patient_en_route"
  | "patient_received"
  | "closed";

export type CareLevel = "ICU" | "HDU" | "NICU";
export type Urgency = "critical" | "urgent" | "routine";

export type Hospital = {
  id: string;
  name: string;
  type: string;
  contact_info: string | null;
};

export type Referral = {
  id: string;
  reference: string;
  patient_initials: string;
  care_level: CareLevel;
  urgency: Urgency;
  status: ReferralStatus;
  referring_facility_id: string;
  receiving_facility_id: string | null;
  referring_facility: string;
  receiving_facility?: string;
  clinical_summary?: string;
  consent_obtained: boolean;
  created_at: string;
};

export type ReferralEvent = {
  id: string;
  referral_case_id: string;
  from_status: ReferralStatus | null;
  to_status: ReferralStatus;
  actor_user_id: string | null;
  created_at: string;
};

export type FamilyConfirmation = {
  id: string;
  referral_case_id: string;
  relationship: string;
  name: string;
  phone: string;
  consent_given: boolean;
  confirmed_at: string;
};

export const REFERRAL_STEPS: { status: ReferralStatus; label: string }[] = [
  { status: "draft", label: "Draft created" },
  { status: "consent_pending", label: "Consent checkpoint" },
  { status: "ready_to_send", label: "Ready to send" },
  { status: "searching", label: "Broadcast to hospitals" },
  { status: "hospital_accepted", label: "Hospital accepted" },
  { status: "family_confirmed", label: "Family confirmed" },
  { status: "ambulance_arranged", label: "Ambulance arranged" },
  { status: "patient_en_route", label: "Patient en route" },
  { status: "patient_received", label: "Patient received" },
  { status: "closed", label: "Case closed" }
];

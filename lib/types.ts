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
export type FacilityStatus = "open" | "at_capacity" | "closed";
export type TransferMode = "external" | "internal_onsite" | "internal_offsite";
export type AmbulanceStatus = "available" | "dispatched";

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
  transfer_mode?: TransferMode;
  patient_location?: string | null;
  ambulance_id?: string | null;
  created_at: string;
};

export type ReferralEvent = {
  id: string;
  referral_case_id: string;
  from_status: ReferralStatus | null;
  to_status: ReferralStatus;
  actor_user_id: string | null;
  notes?: string | null;
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

export type Ambulance = {
  id: string;
  hospital_id: string;
  plate_number: string;
  driver_name: string;
  driver_phone: string | null;
  status: AmbulanceStatus;
  current_referral_id: string | null;
  created_at: string;
  updated_at: string;
};

// ---- New: bed & capacity management ----
export type CapacitySnapshot = {
  hospital_id: string;
  care_level: CareLevel;
  available_beds: number;
  facility_status: FacilityStatus;
  updated_at: string;
};

// ---- New: notifications ----
export type NotificationItem = {
  id: string;
  referralId: string;
  reference: string;
  message: string;
  status: ReferralStatus;
  created_at: string;
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

// Buckets used by the pipeline overview on both dashboards, and by the
// reporting module's status breakdown.
export const PIPELINE_BUCKETS: { label: string; statuses: ReferralStatus[] }[] = [
  { label: "Draft / consent", statuses: ["draft", "consent_pending"] },
  { label: "Searching", statuses: ["ready_to_send", "searching"] },
  { label: "Accepted", statuses: ["hospital_accepted", "family_confirmed"] },
  { label: "In transit", statuses: ["ambulance_arranged", "patient_en_route"] },
  { label: "Closed", statuses: ["patient_received", "closed"] }
];

import { CapacitySnapshot, Referral } from "./types";

export const demoReferrals: Referral[] = [
  {
    id: "a1",
    reference: "ZOL-2026-0041",
    patient_initials: "JM",
    care_level: "ICU",
    urgency: "critical",
    status: "searching",
    referring_facility_id: "demo-1",
    receiving_facility_id: null,
    referring_facility: "Kijani County Hospital",
    consent_obtained: true,
    created_at: "12 min ago"
  },
  {
    id: "a2",
    reference: "ZOL-2026-0040",
    patient_initials: "AK",
    care_level: "HDU",
    urgency: "urgent",
    status: "hospital_accepted",
    referring_facility_id: "demo-2",
    receiving_facility_id: "demo-3",
    referring_facility: "Riverside Medical Centre",
    receiving_facility: "Nairobi Central Hospital",
    consent_obtained: true,
    created_at: "38 min ago"
  },
  {
    id: "a3",
    reference: "ZOL-2026-0039",
    patient_initials: "FN",
    care_level: "NICU",
    urgency: "critical",
    status: "ready_to_send",
    referring_facility_id: "demo-1",
    receiving_facility_id: null,
    referring_facility: "Kijani County Hospital",
    consent_obtained: true,
    created_at: "1 hr ago"
  },
  {
    id: "a4",
    reference: "ZOL-2026-0038",
    patient_initials: "MW",
    care_level: "ICU",
    urgency: "urgent",
    status: "patient_en_route",
    referring_facility_id: "demo-2",
    receiving_facility_id: "demo-3",
    referring_facility: "Riverside Medical Centre",
    receiving_facility: "Nairobi Central Hospital",
    consent_obtained: true,
    created_at: "2 hrs ago"
  },
  {
    id: "a5",
    reference: "ZOL-2026-0037",
    patient_initials: "OC",
    care_level: "ICU",
    urgency: "routine",
    status: "closed",
    referring_facility_id: "demo-2",
    receiving_facility_id: "demo-3",
    referring_facility: "Riverside Medical Centre",
    receiving_facility: "Nairobi Central Hospital",
    consent_obtained: true,
    created_at: "1 day ago"
  }
];

export const demoHospitals = [
  { id: "demo-1", name: "Kijani County Hospital", type: "referring", contact_info: null },
  { id: "demo-2", name: "Riverside Medical Centre", type: "referring", contact_info: null },
  { id: "demo-3", name: "Nairobi Central Hospital", type: "receiving", contact_info: null }
];

// Demo capacity snapshot, keyed by hospital, used by the Bed & Capacity
// module and the hospital admin dashboard's capacity strip until the
// /api/hospitals/{id}/capacity endpoint is wired up.
export const demoCapacity: CapacitySnapshot[] = [
  { hospital_id: "demo-3", care_level: "ICU", available_beds: 2, facility_status: "open", updated_at: "18 min ago" },
  { hospital_id: "demo-3", care_level: "HDU", available_beds: 5, facility_status: "open", updated_at: "18 min ago" },
  { hospital_id: "demo-3", care_level: "NICU", available_beds: 0, facility_status: "at_capacity", updated_at: "2 hrs ago" }
];

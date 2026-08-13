import { CareLevel } from "./types";

export type PaymentStatus = "pending" | "partial" | "paid" | "waived";
export type PaymentMethod = "mpesa" | "bank_transfer" | "cash" | "insurance" | "nhif";
export type PaymentType = "full" | "partial" | "deposit";

export type BedPricing = {
  care_level: CareLevel;
  nightly_rate_kes: number;
  acceptance_fee_kes: number;
  ambulance_surcharge_kes: number;
};

export type PaymentRecord = {
  id: string;
  receipt_number: string;
  referral_id: string;
  referral_reference: string;
  referring_hospital: string;
  receiving_hospital: string;
  patient_initials: string;
  care_level: CareLevel;
  amount_due_kes: number;
  amount_paid_kes: number;
  balance_kes: number;
  status: PaymentStatus;
  payment_type: PaymentType;
  method: PaymentMethod;
  payer_label: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export const DEFAULT_BED_PRICING: BedPricing[] = [
  { care_level: "ICU", nightly_rate_kes: 45000, acceptance_fee_kes: 15000, ambulance_surcharge_kes: 12000 },
  { care_level: "HDU", nightly_rate_kes: 28000, acceptance_fee_kes: 10000, ambulance_surcharge_kes: 10000 },
  { care_level: "NICU", nightly_rate_kes: 38000, acceptance_fee_kes: 12000, ambulance_surcharge_kes: 11000 }
];

export const demoPayments: PaymentRecord[] = [
  {
    id: "pay-1",
    receipt_number: "ZOL-RCP-2026-0088",
    referral_id: "a2",
    referral_reference: "ZOL-2026-0040",
    referring_hospital: "Riverside Medical Centre",
    receiving_hospital: "Nairobi Central Hospital",
    patient_initials: "AK",
    care_level: "HDU",
    amount_due_kes: 38000,
    amount_paid_kes: 38000,
    balance_kes: 0,
    status: "paid",
    payment_type: "full",
    method: "mpesa",
    payer_label: "Riverside Medical Centre",
    notes: "Bed acceptance + first night HDU",
    created_at: "2026-08-13T09:14:00+03:00",
    updated_at: "2026-08-13T09:14:00+03:00"
  },
  {
    id: "pay-2",
    receipt_number: "ZOL-RCP-2026-0089",
    referral_id: "a4",
    referral_reference: "ZOL-2026-0038",
    referring_hospital: "Riverside Medical Centre",
    receiving_hospital: "Nairobi Central Hospital",
    patient_initials: "MW",
    care_level: "ICU",
    amount_due_kes: 72000,
    amount_paid_kes: 30000,
    balance_kes: 42000,
    status: "partial",
    payment_type: "partial",
    method: "bank_transfer",
    payer_label: "Riverside Medical Centre",
    notes: "Deposit received — balance on patient arrival",
    created_at: "2026-08-13T11:02:00+03:00",
    updated_at: "2026-08-13T11:02:00+03:00"
  },
  {
    id: "pay-3",
    receipt_number: "ZOL-RCP-2026-0090",
    referral_id: "a5",
    referral_reference: "ZOL-2026-0037",
    referring_hospital: "Riverside Medical Centre",
    receiving_hospital: "Nairobi Central Hospital",
    patient_initials: "OC",
    care_level: "ICU",
    amount_due_kes: 60000,
    amount_paid_kes: 0,
    balance_kes: 60000,
    status: "pending",
    payment_type: "deposit",
    method: "insurance",
    payer_label: "NHIF scheme",
    notes: "Awaiting insurer pre-authorisation",
    created_at: "2026-08-12T16:40:00+03:00",
    updated_at: "2026-08-12T16:40:00+03:00"
  }
];

export function formatKes(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

export function paymentStatusLabel(status: PaymentStatus) {
  const map: Record<PaymentStatus, string> = {
    pending: "Pending",
    partial: "Partially paid",
    paid: "Paid in full",
    waived: "Waived"
  };
  return map[status];
}

export function loadBedPricing(hospitalId: string): BedPricing[] {
  if (typeof window === "undefined") return DEFAULT_BED_PRICING;
  const raw = localStorage.getItem(`zola_bed_pricing_${hospitalId}`);
  if (!raw) return DEFAULT_BED_PRICING;
  try {
    return JSON.parse(raw) as BedPricing[];
  } catch {
    return DEFAULT_BED_PRICING;
  }
}

export function saveBedPricing(hospitalId: string, pricing: BedPricing[]) {
  localStorage.setItem(`zola_bed_pricing_${hospitalId}`, JSON.stringify(pricing));
}

export function loadPayments(): PaymentRecord[] {
  if (typeof window === "undefined") return demoPayments;
  const raw = localStorage.getItem("zola_demo_payments");
  if (!raw) return demoPayments;
  try {
    return JSON.parse(raw) as PaymentRecord[];
  } catch {
    return demoPayments;
  }
}

export function savePayments(payments: PaymentRecord[]) {
  localStorage.setItem("zola_demo_payments", JSON.stringify(payments));
}

export function nextReceiptNumber() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `ZOL-RCP-2026-${n}`;
}

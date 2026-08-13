import { CareLevel, Referral } from "./types";

export type PaymentStatus = "pending" | "partial" | "paid" | "waived";
export type PaymentMethod = "mpesa" | "bank_transfer" | "cash" | "insurance" | "nhif";
export type PaymentType = "full" | "partial" | "deposit";

export type BedPricing = {
  care_level: CareLevel;
  nightly_rate_kes: number;
  acceptance_fee_kes: number;
  ambulance_surcharge_kes: number;
};

export type PaymentInstallment = {
  id: string;
  receipt_number: string;
  amount_kes: number;
  payment_type: PaymentType;
  method: PaymentMethod;
  payer_label: string;
  notes?: string;
  created_at: string;
};

export type PaymentRecord = {
  id: string;
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
  payer_label: string;
  installments: PaymentInstallment[];
  created_at: string;
  updated_at: string;
};

export const ACCEPTED_STATUSES = [
  "hospital_accepted",
  "family_confirmed",
  "ambulance_arranged",
  "patient_en_route",
  "patient_received",
  "closed"
] as const;

export const DEFAULT_BED_PRICING: BedPricing[] = [
  { care_level: "ICU", nightly_rate_kes: 45000, acceptance_fee_kes: 15000, ambulance_surcharge_kes: 12000 },
  { care_level: "HDU", nightly_rate_kes: 28000, acceptance_fee_kes: 10000, ambulance_surcharge_kes: 10000 },
  { care_level: "NICU", nightly_rate_kes: 38000, acceptance_fee_kes: 12000, ambulance_surcharge_kes: 11000 }
];

function migrateRecord(raw: PaymentRecord & { receipt_number?: string; method?: PaymentMethod; payment_type?: PaymentType; notes?: string }): PaymentRecord {
  if (raw.installments?.length) return raw;
  const legacyReceipt = raw.receipt_number ?? nextReceiptNumber();
  return {
    ...raw,
    installments: [
      {
        id: `inst-${raw.id}`,
        receipt_number: legacyReceipt,
        amount_kes: raw.amount_paid_kes,
        payment_type: raw.payment_type ?? (raw.status === "paid" ? "full" : raw.amount_paid_kes > 0 ? "partial" : "deposit"),
        method: raw.method ?? "mpesa",
        payer_label: raw.payer_label,
        notes: raw.notes,
        created_at: raw.updated_at ?? raw.created_at
      }
    ].filter((i) => i.amount_kes > 0 || raw.status === "pending")
  };
}

export const demoPayments: PaymentRecord[] = [
  migrateRecord({
    id: "pay-1",
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
    payer_label: "Riverside Medical Centre",
    installments: [],
    created_at: "2026-08-13T09:14:00+03:00",
    updated_at: "2026-08-13T09:14:00+03:00",
    receipt_number: "ZOL-RCP-2026-0088",
    payment_type: "full",
    method: "mpesa",
    notes: "Bed acceptance + first night HDU"
  } as PaymentRecord),
  migrateRecord({
    id: "pay-2",
    referral_id: "a4",
    referral_reference: "ZOL-2026-0038",
    referring_hospital: "Riverside Medical Centre",
    receiving_hospital: "Nairobi Central Hospital",
    patient_initials: "MW",
    care_level: "ICU",
    amount_due_kes: 60000,
    amount_paid_kes: 30000,
    balance_kes: 30000,
    status: "partial",
    payer_label: "Riverside Medical Centre",
    installments: [],
    created_at: "2026-08-13T11:02:00+03:00",
    updated_at: "2026-08-13T11:02:00+03:00",
    receipt_number: "ZOL-RCP-2026-0089",
    payment_type: "partial",
    method: "bank_transfer",
    notes: "Deposit received — balance on patient arrival"
  } as PaymentRecord)
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

export function calculateAmountDue(
  pricing: BedPricing[],
  careLevel: CareLevel,
  options?: { includeAmbulance?: boolean }
): number {
  const row = pricing.find((p) => p.care_level === careLevel) ?? DEFAULT_BED_PRICING.find((p) => p.care_level === careLevel)!;
  return row.acceptance_fee_kes + row.nightly_rate_kes + (options?.includeAmbulance ? row.ambulance_surcharge_kes : 0);
}

export function pricingBreakdown(pricing: BedPricing[], careLevel: CareLevel, includeAmbulance = false) {
  const row = pricing.find((p) => p.care_level === careLevel) ?? DEFAULT_BED_PRICING.find((p) => p.care_level === careLevel)!;
  return {
    acceptance_fee_kes: row.acceptance_fee_kes,
    nightly_rate_kes: row.nightly_rate_kes,
    ambulance_surcharge_kes: includeAmbulance ? row.ambulance_surcharge_kes : 0,
    total_kes: calculateAmountDue(pricing, careLevel, { includeAmbulance })
  };
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
    const parsed = JSON.parse(raw) as PaymentRecord[];
    return parsed.map((p) => migrateRecord(p as PaymentRecord & { receipt_number?: string }));
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

export type BillableReferral = {
  id: string;
  reference: string;
  patient_initials: string;
  care_level: CareLevel;
  referring_hospital: string;
  receiving_hospital: string;
  status: string;
  include_ambulance: boolean;
};

export function referralToBillable(
  r: Referral & { referring?: { name: string }; receiving?: { name: string } },
  receivingHospitalName: string,
  receivingHospitalId?: string | null
): BillableReferral | null {
  if (!ACCEPTED_STATUSES.includes(r.status as (typeof ACCEPTED_STATUSES)[number])) return null;
  if (receivingHospitalId && r.receiving_facility_id && r.receiving_facility_id !== receivingHospitalId) return null;
  const receiving = r.receiving_facility ?? r.receiving?.name ?? receivingHospitalName;
  return {
    id: r.id,
    reference: r.reference,
    patient_initials: r.patient_initials,
    care_level: r.care_level,
    referring_hospital: r.referring_facility ?? r.referring?.name ?? "Referring hospital",
    receiving_hospital: receiving,
    status: r.status,
    include_ambulance: r.transfer_mode === "internal_offsite" || r.transfer_mode === "external"
  };
}

export function derivePaymentStatus(amountDue: number, amountPaid: number): PaymentStatus {
  if (amountPaid <= 0) return "pending";
  if (amountPaid >= amountDue) return "paid";
  return "partial";
}

export function applyInstallment(
  record: PaymentRecord,
  installment: Omit<PaymentInstallment, "id" | "receipt_number" | "created_at"> & { receipt_number?: string }
): PaymentRecord {
  const amount = Math.max(0, installment.amount_kes);
  const newPaid = record.amount_paid_kes + amount;
  const balance = Math.max(0, record.amount_due_kes - newPaid);
  const entry: PaymentInstallment = {
    id: `inst-${Date.now()}`,
    receipt_number: installment.receipt_number ?? nextReceiptNumber(),
    amount_kes: amount,
    payment_type: installment.payment_type,
    method: installment.method,
    payer_label: installment.payer_label,
    notes: installment.notes,
    created_at: new Date().toISOString()
  };
  return {
    ...record,
    amount_paid_kes: newPaid,
    balance_kes: balance,
    status: derivePaymentStatus(record.amount_due_kes, newPaid),
    payer_label: installment.payer_label || record.payer_label,
    installments: [...record.installments, entry],
    updated_at: new Date().toISOString()
  };
}

export function createPaymentFromReferral(
  billable: BillableReferral,
  pricing: BedPricing[],
  installment: Omit<PaymentInstallment, "id" | "receipt_number" | "created_at"> & { receipt_number?: string }
): PaymentRecord {
  const amountDue = calculateAmountDue(pricing, billable.care_level, { includeAmbulance: billable.include_ambulance });
  const now = new Date().toISOString();
  const base: PaymentRecord = {
    id: `pay-${billable.id}`,
    referral_id: billable.id,
    referral_reference: billable.reference,
    referring_hospital: billable.referring_hospital,
    receiving_hospital: billable.receiving_hospital,
    patient_initials: billable.patient_initials,
    care_level: billable.care_level,
    amount_due_kes: amountDue,
    amount_paid_kes: 0,
    balance_kes: amountDue,
    status: "pending",
    payer_label: billable.referring_hospital,
    installments: [],
    created_at: now,
    updated_at: now
  };
  return applyInstallment(base, installment);
}

export function latestInstallment(record: PaymentRecord): PaymentInstallment | null {
  if (!record.installments.length) return null;
  return record.installments[record.installments.length - 1];
}

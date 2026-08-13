"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, Plus, Printer, Save } from "lucide-react";
import { HospitalShell } from "@/components/hospital-shell";
import { FacilityRequiredNotice } from "@/components/facility-selector";
import { PaymentReceiptView, printPaymentReceipt } from "@/components/payment-receipt";
import {
  BedPricing,
  PaymentRecord,
  PaymentMethod,
  PaymentType,
  DEFAULT_BED_PRICING,
  demoPayments,
  formatKes,
  loadBedPricing,
  loadPayments,
  nextReceiptNumber,
  paymentStatusLabel,
  saveBedPricing,
  savePayments
} from "@/lib/demo-payments";
import { demoReferrals } from "@/lib/demo-data";
import { useWorkspace } from "@/lib/use-workspace";
import { CareLevel } from "@/lib/types";

const CARE_LEVELS: CareLevel[] = ["ICU", "HDU", "NICU"];

export default function HospitalPaymentsPage() {
  const { activeHospitalId, session } = useWorkspace();
  const hospitalName =
    session?.memberships.find((m) => m.hospital_id === activeHospitalId)?.hospital_name ?? "Your facility";

  const [pricing, setPricing] = useState<BedPricing[]>(DEFAULT_BED_PRICING);
  const [payments, setPayments] = useState<PaymentRecord[]>(demoPayments);
  const [pricingSaved, setPricingSaved] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord | null>(null);
  const [form, setForm] = useState({
    referral_id: demoReferrals[0]?.id ?? "",
    amount_paid_kes: "",
    payment_type: "full" as PaymentType,
    method: "mpesa" as PaymentMethod,
    payer_label: "",
    notes: ""
  });

  useEffect(() => {
    if (!activeHospitalId) return;
    setPricing(loadBedPricing(activeHospitalId));
    setPayments(loadPayments());
  }, [activeHospitalId]);

  const totals = useMemo(() => {
    const due = payments.reduce((s, p) => s + p.amount_due_kes, 0);
    const paid = payments.reduce((s, p) => s + p.amount_paid_kes, 0);
    return { due, paid, balance: due - paid };
  }, [payments]);

  function updatePricing(level: CareLevel, field: keyof BedPricing, value: string) {
    setPricing((rows) =>
      rows.map((row) =>
        row.care_level === level ? { ...row, [field]: Math.max(0, Number(value) || 0) } : row
      )
    );
  }

  function savePricing(e: FormEvent) {
    e.preventDefault();
    if (!activeHospitalId) return;
    saveBedPricing(activeHospitalId, pricing);
    setPricingSaved(true);
    setTimeout(() => setPricingSaved(false), 2500);
  }

  function recordPayment(e: FormEvent) {
    e.preventDefault();
    const referral = demoReferrals.find((r) => r.id === form.referral_id);
    if (!referral) return;
    const price = pricing.find((p) => p.care_level === referral.care_level) ?? pricing[0];
    const amountDue = price.acceptance_fee_kes + price.nightly_rate_kes;
    const paid = Math.max(0, Number(form.amount_paid_kes) || 0);
    const balance = Math.max(0, amountDue - paid);
    const status = balance === 0 ? "paid" : paid > 0 ? "partial" : "pending";

    const record: PaymentRecord = {
      id: `pay-${Date.now()}`,
      receipt_number: nextReceiptNumber(),
      referral_id: referral.id,
      referral_reference: referral.reference,
      referring_hospital: referral.referring_facility,
      receiving_hospital: referral.receiving_facility ?? hospitalName,
      patient_initials: referral.patient_initials,
      care_level: referral.care_level,
      amount_due_kes: amountDue,
      amount_paid_kes: paid,
      balance_kes: balance,
      status,
      payment_type: form.payment_type,
      method: form.method,
      payer_label: form.payer_label || referral.referring_facility,
      notes: form.notes || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const next = [record, ...payments];
    setPayments(next);
    savePayments(next);
    setSelectedReceipt(record);
    setShowForm(false);
    setForm((f) => ({ ...f, amount_paid_kes: "", notes: "" }));
  }

  return (
    <HospitalShell
      title="Payments & billing"
      action={
        <button type="button" className="button compact" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Record payment
        </button>
      }
    >
      <FacilityRequiredNotice />
      <div className="notice warn">
        <CreditCard size={16} />
        <span>MVP demo — payments are stored locally for presentation. Live M-Pesa and insurer APIs will connect here.</span>
      </div>

      <section className="metrics compact-metrics ops-metrics">
        <article><p>Total billed</p><strong>{formatKes(totals.due)}</strong></article>
        <article><p>Collected</p><strong>{formatKes(totals.paid)}</strong></article>
        <article><p>Outstanding</p><strong>{formatKes(totals.balance)}</strong></article>
      </section>

      <form onSubmit={savePricing} className="panel form-card compact-card">
        <div className="panel-heading">
          <div>
            <h2>Bed pricing by care level</h2>
            <p>Set acceptance fees, nightly bed rates, and ambulance surcharges for {hospitalName}</p>
          </div>
          <button type="submit" className="button compact"><Save size={14} /> Save pricing</button>
        </div>
        {pricingSaved && <div className="notice">Bed pricing saved for this facility.</div>}
        <div className="pricing-grid">
          {pricing.map((row) => (
            <div className="pricing-card" key={row.care_level}>
              <h3>{row.care_level}</h3>
              <label>Acceptance fee (KES)<input type="number" min={0} value={row.acceptance_fee_kes} onChange={(e) => updatePricing(row.care_level, "acceptance_fee_kes", e.target.value)} /></label>
              <label>Nightly bed rate (KES)<input type="number" min={0} value={row.nightly_rate_kes} onChange={(e) => updatePricing(row.care_level, "nightly_rate_kes", e.target.value)} /></label>
              <label>Ambulance surcharge (KES)<input type="number" min={0} value={row.ambulance_surcharge_kes} onChange={(e) => updatePricing(row.care_level, "ambulance_surcharge_kes", e.target.value)} /></label>
            </div>
          ))}
        </div>
      </form>

      <section className="panel">
        <div className="panel-heading">
          <div><h2>Payment ledger</h2><p>Full, partial, and pending referral payments</p></div>
        </div>
        <div className="payment-ledger">
          {payments.map((p) => (
            <article className="payment-row" key={p.id}>
              <div>
                <Link href={`/referrals/${p.referral_id}`} className="ref-link">{p.referral_reference}</Link>
                <p>{p.referring_hospital} → {p.receiving_hospital}</p>
                <small>{p.patient_initials} · {p.care_level} · {paymentStatusLabel(p.status)}</small>
              </div>
              <div className="payment-row-amounts">
                <span>{formatKes(p.amount_paid_kes)}</span>
                <small>of {formatKes(p.amount_due_kes)}</small>
              </div>
              <div className="payment-row-actions">
                <button type="button" className="button compact ghost" onClick={() => setSelectedReceipt(p)}>View</button>
                <button type="button" className="button compact ghost" onClick={() => printPaymentReceipt(p, hospitalName)}>
                  <Printer size={14} /> PDF
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <form className="modal payment-modal" onSubmit={recordPayment} onClick={(e) => e.stopPropagation()}>
            <h2>Record payment</h2>
            <p>Log a full or partial payment against a referral case.</p>
            <div className="form-grid">
              <label className="full">Referral
                <select value={form.referral_id} onChange={(e) => setForm((f) => ({ ...f, referral_id: e.target.value }))}>
                  {demoReferrals.map((r) => (
                    <option key={r.id} value={r.id}>{r.reference} — {r.patient_initials}</option>
                  ))}
                </select>
              </label>
              <label>Amount paid (KES)<input type="number" min={0} required value={form.amount_paid_kes} onChange={(e) => setForm((f) => ({ ...f, amount_paid_kes: e.target.value }))} /></label>
              <label>Payment type
                <select value={form.payment_type} onChange={(e) => setForm((f) => ({ ...f, payment_type: e.target.value as PaymentType }))}>
                  <option value="full">Full payment</option>
                  <option value="partial">Partial payment</option>
                  <option value="deposit">Deposit only</option>
                </select>
              </label>
              <label>Method
                <select value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as PaymentMethod }))}>
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="insurance">Private insurance</option>
                  <option value="nhif">NHIF</option>
                </select>
              </label>
              <label className="full">Payer name<input value={form.payer_label} onChange={(e) => setForm((f) => ({ ...f, payer_label: e.target.value }))} placeholder="Hospital or insurer" /></label>
              <label className="full">Notes<textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></label>
            </div>
            <div className="form-actions">
              <button type="button" className="button ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="button">Save &amp; generate receipt</button>
            </div>
          </form>
        </div>
      )}

      {selectedReceipt && (
        <div className="modal-backdrop" onClick={() => setSelectedReceipt(null)}>
          <div className="modal payment-modal" onClick={(e) => e.stopPropagation()}>
            <PaymentReceiptView payment={selectedReceipt} hospitalName={hospitalName} />
            <div className="form-actions">
              <button type="button" className="button ghost" onClick={() => setSelectedReceipt(null)}>Close</button>
              <button type="button" className="button" onClick={() => printPaymentReceipt(selectedReceipt, hospitalName)}>
                <Printer size={15} /> Print / save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </HospitalShell>
  );
}

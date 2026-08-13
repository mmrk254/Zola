"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, Plus, Printer, Save } from "lucide-react";
import { HospitalShell } from "@/components/hospital-shell";
import { FacilityRequiredNotice } from "@/components/facility-selector";
import { PaymentReceiptView, openPaymentReceiptExport } from "@/components/payment-receipt";
import { useDocumentExport } from "@/components/document-export-dialog";
import {
  ACCEPTED_STATUSES,
  BedPricing,
  BillableReferral,
  PaymentMethod,
  PaymentRecord,
  PaymentType,
  DEFAULT_BED_PRICING,
  applyInstallment,
  calculateAmountDue,
  createPaymentFromReferral,
  demoPayments,
  formatKes,
  latestInstallment,
  loadBedPricing,
  loadPayments,
  paymentStatusLabel,
  pricingBreakdown,
  referralToBillable,
  saveBedPricing,
  savePayments
} from "@/lib/demo-payments";
import { demoReferrals } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/use-workspace";
import { CareLevel, Referral } from "@/lib/types";

const CARE_LEVELS: CareLevel[] = ["ICU", "HDU", "NICU"];

type ReceiptView = { record: PaymentRecord; installmentId?: string };

export default function HospitalPaymentsPage() {
  const { activeHospitalId, session } = useWorkspace();
  const { openExport, dialog: exportDialog } = useDocumentExport();
  const hospitalName =
    session?.memberships.find((m) => m.hospital_id === activeHospitalId)?.hospital_name ?? "Your facility";

  const [pricing, setPricing] = useState<BedPricing[]>(DEFAULT_BED_PRICING);
  const [payments, setPayments] = useState<PaymentRecord[]>(demoPayments);
  const [acceptedReferrals, setAcceptedReferrals] = useState<BillableReferral[]>([]);
  const [pricingSaved, setPricingSaved] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [receiptView, setReceiptView] = useState<ReceiptView | null>(null);
  const [form, setForm] = useState({
    referral_id: "",
    amount_paid_kes: "",
    payment_type: "full" as PaymentType,
    method: "mpesa" as PaymentMethod,
    payer_label: "",
    notes: ""
  });

  const loadAccepted = useCallback(async () => {
    let referrals: Referral[] = demoReferrals;
    if (isSupabaseConfigured && activeHospitalId) {
      const res = await fetch(`/api/referrals?hospital_id=${activeHospitalId}`);
      const data = await res.json();
      if (data.referrals) {
        referrals = data.referrals.map((r: Referral & { referring?: { name: string }; receiving?: { name: string } }) => ({
          ...r,
          referring_facility: r.referring?.name ?? r.referring_facility,
          receiving_facility: r.receiving?.name ?? r.receiving_facility
        }));
      }
    }

    const billable = referrals
      .filter((r) => ACCEPTED_STATUSES.includes(r.status as (typeof ACCEPTED_STATUSES)[number]))
      .map((r) => referralToBillable(r, hospitalName, activeHospitalId))
      .filter((r): r is BillableReferral => Boolean(r));

    setAcceptedReferrals(billable);
    return billable;
  }, [activeHospitalId, hospitalName]);

  useEffect(() => {
    if (!activeHospitalId) {
      loadAccepted();
      return;
    }
    setPricing(loadBedPricing(activeHospitalId));
    setPayments(loadPayments());
    loadAccepted();
  }, [activeHospitalId, loadAccepted]);

  const paymentByReferral = useMemo(() => {
    const map = new Map<string, PaymentRecord>();
    payments.forEach((p) => map.set(p.referral_id, p));
    return map;
  }, [payments]);

  const awaitingBilling = useMemo(() => {
    return acceptedReferrals.filter((r) => {
      const existing = paymentByReferral.get(r.id);
      return !existing || existing.balance_kes > 0;
    });
  }, [acceptedReferrals, paymentByReferral]);

  const totals = useMemo(() => {
    const due = payments.reduce((s, p) => s + p.amount_due_kes, 0);
    const paid = payments.reduce((s, p) => s + p.amount_paid_kes, 0);
    return { due, paid, balance: due - paid };
  }, [payments]);

  const selectedBillable = acceptedReferrals.find((r) => r.id === form.referral_id) ?? awaitingBilling[0];
  const existingRecord = form.referral_id ? paymentByReferral.get(form.referral_id) : undefined;
  const includeAmbulance = selectedBillable?.include_ambulance ?? false;
  const breakdown = selectedBillable
    ? pricingBreakdown(pricing, selectedBillable.care_level, includeAmbulance)
    : null;
  const amountDue = existingRecord?.amount_due_kes ?? breakdown?.total_kes ?? 0;
  const balanceRemaining = existingRecord?.balance_kes ?? amountDue;

  function openRecordForm(referralId?: string, payRemaining = false) {
    const target = referralId ?? awaitingBilling[0]?.id ?? acceptedReferrals[0]?.id ?? "";
    const billable = acceptedReferrals.find((r) => r.id === target);
    const existing = target ? paymentByReferral.get(target) : undefined;
    const due = existing?.balance_kes ?? (billable ? calculateAmountDue(pricing, billable.care_level, { includeAmbulance: billable.include_ambulance }) : 0);

    setForm({
      referral_id: target,
      amount_paid_kes: payRemaining || !existing ? String(due) : "",
      payment_type: payRemaining || !existing ? "full" : "partial",
      method: "mpesa",
      payer_label: billable?.referring_hospital ?? "",
      notes: payRemaining ? "Balance settlement" : ""
    });
    setShowForm(true);
  }

  function onReferralChange(referralId: string) {
    const billable = acceptedReferrals.find((r) => r.id === referralId);
    const existing = paymentByReferral.get(referralId);
    const due = existing?.balance_kes ?? (billable ? calculateAmountDue(pricing, billable.care_level, { includeAmbulance: billable.include_ambulance }) : 0);
    setForm((f) => ({
      ...f,
      referral_id: referralId,
      payer_label: billable?.referring_hospital ?? f.payer_label,
      amount_paid_kes: f.payment_type === "full" ? String(due) : f.amount_paid_kes
    }));
  }

  function onPaymentTypeChange(paymentType: PaymentType) {
    setForm((f) => ({
      ...f,
      payment_type: paymentType,
      amount_paid_kes:
        paymentType === "full"
          ? String(balanceRemaining)
          : paymentType === "deposit"
            ? breakdown
              ? String(Math.round(breakdown.acceptance_fee_kes))
              : f.amount_paid_kes
            : f.amount_paid_kes
    }));
  }

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
    const billable = acceptedReferrals.find((r) => r.id === form.referral_id);
    if (!billable) return;

    const paid = Math.max(0, Number(form.amount_paid_kes) || 0);
    if (paid <= 0) return;

    const installment = {
      amount_kes: paid,
      payment_type: form.payment_type,
      method: form.method,
      payer_label: form.payer_label || billable.referring_hospital,
      notes: form.notes || undefined
    };

    const existing = paymentByReferral.get(billable.id);
    let updated: PaymentRecord;
    if (existing) {
      updated = applyInstallment(existing, installment);
    } else {
      updated = createPaymentFromReferral(billable, pricing, installment);
    }

    const next = existing
      ? payments.map((p) => (p.referral_id === billable.id ? updated : p))
      : [updated, ...payments];

    setPayments(next);
    savePayments(next);
    const slip = latestInstallment(updated);
    setReceiptView({ record: updated, installmentId: slip?.id });
    setShowForm(false);
    setForm((f) => ({ ...f, amount_paid_kes: "", notes: "" }));
  }

  return (
    <HospitalShell
      title="Payments & billing"
      action={
        <button type="button" className="button compact" onClick={() => openRecordForm()} disabled={!awaitingBilling.length}>
          <Plus size={15} /> Record payment
        </button>
      }
    >
      <FacilityRequiredNotice />
      <div className="notice warn">
        <CreditCard size={16} />
        <span>MVP demo — accepted referrals appear here for billing. Payments are stored locally until live M-Pesa is connected.</span>
      </div>

      <section className="metrics compact-metrics ops-metrics">
        <article><p>Total billed</p><strong>{formatKes(totals.due)}</strong></article>
        <article><p>Collected</p><strong>{formatKes(totals.paid)}</strong></article>
        <article><p>Outstanding</p><strong>{formatKes(totals.balance)}</strong></article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Awaiting payment</h2>
            <p>Accepted referrals from referring hospitals — record full or partial payment</p>
          </div>
        </div>
        {awaitingBilling.length === 0 ? (
          <p className="empty-state" style={{ padding: "24px 8px" }}>
            No accepted referrals need billing right now. When you accept a referral, it will appear here.
          </p>
        ) : (
          <div className="payment-ledger">
            {awaitingBilling.map((r) => {
              const existing = paymentByReferral.get(r.id);
              const due = existing?.amount_due_kes ?? calculateAmountDue(pricing, r.care_level, { includeAmbulance: r.include_ambulance });
              const balance = existing?.balance_kes ?? due;
              return (
                <article className="payment-row awaiting" key={r.id}>
                  <div>
                    <Link href={`/referrals/${r.id}`} className="ref-link">{r.reference}</Link>
                    <p>{r.referring_hospital} → {r.receiving_hospital}</p>
                    <small>{r.patient_initials} · {r.care_level} · {existing ? paymentStatusLabel(existing.status) : "Not yet billed"}</small>
                  </div>
                  <div className="payment-row-amounts">
                    <span>{formatKes(balance)}</span>
                    <small>{existing ? `paid ${formatKes(existing.amount_paid_kes)} of ${formatKes(due)}` : `due ${formatKes(due)}`}</small>
                  </div>
                  <div className="payment-row-actions">
                    <button type="button" className="button compact" onClick={() => openRecordForm(r.id, Boolean(existing))}>
                      {existing ? "Pay balance" : "Record payment"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <form onSubmit={savePricing} className="panel form-card compact-card">
        <div className="panel-heading">
          <div>
            <h2>Bed pricing by care level</h2>
            <p>Acceptance fee + first night rate used to autofill full payments for {hospitalName}</p>
          </div>
          <button type="submit" className="button compact"><Save size={14} /> Save pricing</button>
        </div>
        {pricingSaved && <div className="notice">Bed pricing saved for this facility.</div>}
        <div className="pricing-grid">
          {pricing.map((row) => (
            <div className="pricing-card" key={row.care_level}>
              <h3>{row.care_level}</h3>
              <label>Acceptance fee (KES)<input type="number" min={0} value={row.acceptance_fee_kes} onChange={(e) => updatePricing(row.care_level, "acceptance_fee_kes", e.target.value)} /></label>
              <label>First night rate (KES)<input type="number" min={0} value={row.nightly_rate_kes} onChange={(e) => updatePricing(row.care_level, "nightly_rate_kes", e.target.value)} /></label>
              <label>Ambulance surcharge (KES)<input type="number" min={0} value={row.ambulance_surcharge_kes} onChange={(e) => updatePricing(row.care_level, "ambulance_surcharge_kes", e.target.value)} /></label>
            </div>
          ))}
        </div>
      </form>

      <section className="panel">
        <div className="panel-heading">
          <div><h2>Payment ledger</h2><p>All recorded payments with balances and receipt history</p></div>
        </div>
        <div className="payment-ledger">
          {payments.length === 0 ? (
            <p className="empty-state">No payments recorded yet.</p>
          ) : (
            payments.map((p) => (
              <article className="payment-row" key={p.id}>
                <div>
                  <Link href={`/referrals/${p.referral_id}`} className="ref-link">{p.referral_reference}</Link>
                  <p>{p.referring_hospital} → {p.receiving_hospital}</p>
                  <small>
                    {p.patient_initials} · {p.care_level} · {paymentStatusLabel(p.status)}
                    {p.installments.length > 1 ? ` · ${p.installments.length} receipts` : ""}
                  </small>
                </div>
                <div className="payment-row-amounts">
                  <span>{formatKes(p.amount_paid_kes)}</span>
                  <small>balance {formatKes(p.balance_kes)}</small>
                </div>
                <div className="payment-row-actions">
                  {p.balance_kes > 0 && (
                    <button type="button" className="button compact" onClick={() => openRecordForm(p.referral_id, true)}>
                      Pay balance
                    </button>
                  )}
                  <button type="button" className="button compact ghost" onClick={() => setReceiptView({ record: p })}>View</button>
                  <button type="button" className="button compact ghost" onClick={() => openPaymentReceiptExport(openExport, p, hospitalName, latestInstallment(p))}>
                    <Printer size={14} /> Export
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <form className="modal payment-modal" onSubmit={recordPayment} onClick={(e) => e.stopPropagation()}>
            <h2>Record payment</h2>
            <p>Bill the referring hospital for an accepted referral case.</p>
            <div className="form-grid">
              <label className="full">Accepted referral
                <select
                  required
                  value={form.referral_id}
                  onChange={(e) => onReferralChange(e.target.value)}
                >
                  <option value="" disabled>Select referral</option>
                  {awaitingBilling.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.reference} — {r.patient_initials} ({r.referring_hospital})
                    </option>
                  ))}
                </select>
              </label>
              {breakdown && (
                <div className="full pricing-preview">
                  <p><strong>{selectedBillable?.care_level}</strong> bed charges for {selectedBillable?.reference}</p>
                  <ul>
                    <li>Acceptance fee: {formatKes(breakdown.acceptance_fee_kes)}</li>
                    <li>First night: {formatKes(breakdown.nightly_rate_kes)}</li>
                    {includeAmbulance && <li>Ambulance: {formatKes(breakdown.ambulance_surcharge_kes)}</li>}
                  </ul>
                  <p><strong>Total due:</strong> {formatKes(amountDue)} · <strong>Balance:</strong> {formatKes(balanceRemaining)}</p>
                </div>
              )}
              <label>Payment type
                <select value={form.payment_type} onChange={(e) => onPaymentTypeChange(e.target.value as PaymentType)}>
                  <option value="full">Full payment</option>
                  <option value="partial">Partial payment</option>
                  <option value="deposit">Deposit only</option>
                </select>
              </label>
              <label>Amount (KES)
                <input
                  type="number"
                  min={0}
                  max={balanceRemaining}
                  required
                  value={form.amount_paid_kes}
                  onChange={(e) => setForm((f) => ({ ...f, amount_paid_kes: e.target.value }))}
                />
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
              <label className="full">Payer (referring hospital / insurer)
                <input value={form.payer_label} onChange={(e) => setForm((f) => ({ ...f, payer_label: e.target.value }))} placeholder="Hospital or insurer name" />
              </label>
              <label className="full">Notes<textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></label>
            </div>
            <div className="form-actions">
              <button type="button" className="button ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="button">Save &amp; generate receipt</button>
            </div>
          </form>
        </div>
      )}

      {receiptView && (
        <div className="modal-backdrop" onClick={() => setReceiptView(null)}>
          <div className="modal payment-modal" onClick={(e) => e.stopPropagation()}>
            <PaymentReceiptView
              payment={receiptView.record}
              installment={receiptView.record.installments.find((i) => i.id === receiptView.installmentId) ?? latestInstallment(receiptView.record)}
              hospitalName={hospitalName}
            />
            <div className="form-actions">
              <button type="button" className="button ghost" onClick={() => setReceiptView(null)}>Close</button>
              {receiptView.record.balance_kes > 0 && (
                <button type="button" className="button ghost" onClick={() => { setReceiptView(null); openRecordForm(receiptView.record.referral_id, true); }}>
                  Pay remaining balance
                </button>
              )}
              <button
                type="button"
                className="button"
                onClick={() =>
                  openPaymentReceiptExport(
                    openExport,
                    receiptView.record,
                    hospitalName,
                    receiptView.record.installments.find((i) => i.id === receiptView.installmentId) ?? latestInstallment(receiptView.record)
                  )
                }
              >
                <Printer size={15} /> Export receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {exportDialog}
    </HospitalShell>
  );
}

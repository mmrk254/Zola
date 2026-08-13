"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, Printer } from "lucide-react";
import { Shell } from "@/components/shell";
import { FacilityRequiredNotice } from "@/components/facility-selector";
import { PaymentReceiptView, printPaymentReceipt } from "@/components/payment-receipt";
import { demoPayments, formatKes, loadPayments, paymentStatusLabel } from "@/lib/demo-payments";
import { PaymentRecord } from "@/lib/demo-payments";
import { useWorkspace } from "@/lib/use-workspace";

export default function StaffPaymentsPage() {
  const { session, activeHospitalId } = useWorkspace();
  const [payments, setPayments] = useState(demoPayments);
  const [selected, setSelected] = useState<PaymentRecord | null>(null);

  const hospitalName =
    session?.memberships.find((m) => m.hospital_id === activeHospitalId)?.hospital_name ??
    session?.memberships[0]?.hospital_name ??
    "Your facility";

  useEffect(() => {
    setPayments(loadPayments());
  }, []);

  const relevant = useMemo(() => {
    return payments.filter(
      (p) =>
        p.referring_hospital === hospitalName ||
        p.receiving_hospital === hospitalName ||
        !activeHospitalId
    );
  }, [payments, hospitalName, activeHospitalId]);

  const outstanding = relevant.reduce((s, p) => s + p.balance_kes, 0);
  const paid = relevant.reduce((s, p) => s + p.amount_paid_kes, 0);

  return (
    <Shell title="Payments">
      <FacilityRequiredNotice />
      <div className="notice warn">
        <CreditCard size={16} />
        <span>Demo ledger for referral bed fees and transfers. Your hospital admin records payments in the workspace.</span>
      </div>

      <section className="metrics compact-metrics ops-metrics">
        <article><p>Your cases</p><strong>{relevant.length}</strong></article>
        <article><p>Paid</p><strong>{formatKes(paid)}</strong></article>
        <article><p>Outstanding</p><strong>{formatKes(outstanding)}</strong></article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Referral payment status</h2>
            <p>Bed acceptance fees and balances for cases involving {hospitalName}</p>
          </div>
        </div>
        <div className="payment-ledger">
          {relevant.length === 0 ? (
            <p className="empty-state">No payment records yet.</p>
          ) : (
            relevant.map((p) => (
              <article className="payment-row" key={p.id}>
                <div>
                  <Link href={`/referrals/${p.referral_id}`} className="ref-link">{p.referral_reference}</Link>
                  <p>{p.referring_hospital} → {p.receiving_hospital}</p>
                  <small>{p.patient_initials} · {paymentStatusLabel(p.status)}</small>
                </div>
                <div className="payment-row-amounts">
                  <span>{formatKes(p.amount_paid_kes)}</span>
                  <small>balance {formatKes(p.balance_kes)}</small>
                </div>
                <div className="payment-row-actions">
                  <button type="button" className="button compact ghost" onClick={() => setSelected(p)}>Receipt</button>
                  <button type="button" className="button compact ghost" onClick={() => printPaymentReceipt(p, p.receiving_hospital)}>
                    <Printer size={14} />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal payment-modal" onClick={(e) => e.stopPropagation()}>
            <PaymentReceiptView payment={selected} hospitalName={selected.receiving_hospital} />
            <div className="form-actions">
              <button type="button" className="button ghost" onClick={() => setSelected(null)}>Close</button>
              <button type="button" className="button" onClick={() => printPaymentReceipt(selected, selected.receiving_hospital)}>
                <Printer size={15} /> Print / save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

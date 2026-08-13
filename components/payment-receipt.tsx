"use client";

import { PaymentInstallment, PaymentRecord, formatKes, paymentStatusLabel } from "@/lib/demo-payments";
import { buildPaymentReceiptDocument } from "@/lib/payment-receipt-export";
import { ExportDocument } from "@/lib/document-templates";

function installmentLabel(installment: PaymentInstallment) {
  return installment.payment_type === "full"
    ? "Full payment"
    : installment.payment_type === "partial"
      ? "Partial payment"
      : "Deposit";
}

export function PaymentReceiptView({
  payment,
  installment,
  hospitalName
}: {
  payment: PaymentRecord;
  installment?: PaymentInstallment | null;
  hospitalName?: string;
}) {
  const slip = installment ?? payment.installments[payment.installments.length - 1];
  const receiptNo = slip?.receipt_number ?? "—";

  return (
    <div className="payment-receipt">
      <div className="payment-receipt-head">
        <div>
          <p className="eyebrow">ZOLA PAYMENT RECEIPT</p>
          <h2>{receiptNo}</h2>
        </div>
        <span className={`payment-status ${payment.status}`}>{paymentStatusLabel(payment.status)}</span>
      </div>
      <dl className="receipt-dl">
        <div><dt>Date</dt><dd>{slip ? new Date(slip.created_at).toLocaleString("en-KE") : new Date(payment.updated_at).toLocaleString("en-KE")}</dd></div>
        <div><dt>Referral</dt><dd className="mono">{payment.referral_reference}</dd></div>
        <div><dt>Patient</dt><dd>{payment.patient_initials} · {payment.care_level}</dd></div>
        <div><dt>Referring hospital</dt><dd>{payment.referring_hospital}</dd></div>
        <div><dt>Receiving hospital</dt><dd>{payment.receiving_hospital}</dd></div>
        {hospitalName && <div><dt>Issued by</dt><dd>{hospitalName}</dd></div>}
        {slip && (
          <>
            <div><dt>Payer</dt><dd>{slip.payer_label}</dd></div>
            <div><dt>Method</dt><dd style={{ textTransform: "capitalize" }}>{slip.method.replace("_", " ")}</dd></div>
            <div><dt>This payment</dt><dd>{installmentLabel(slip)}</dd></div>
          </>
        )}
      </dl>
      <table className="receipt-table">
        <tbody>
          {slip && (
            <tr><td>Amount on this receipt</td><td>{formatKes(slip.amount_kes)}</td></tr>
          )}
          <tr><td>Total amount due</td><td>{formatKes(payment.amount_due_kes)}</td></tr>
          <tr><td>Total paid to date</td><td>{formatKes(payment.amount_paid_kes)}</td></tr>
          <tr><td><strong>Outstanding balance</strong></td><td><strong>{formatKes(payment.balance_kes)}</strong></td></tr>
        </tbody>
      </table>
      {slip?.notes && <p className="receipt-notes"><strong>Notes:</strong> {slip.notes}</p>}
      {payment.installments.length > 1 && (
        <div className="receipt-history">
          <b>Payment history</b>
          <ul>
            {payment.installments.map((inst) => (
              <li key={inst.id}>
                {inst.receipt_number} · {formatKes(inst.amount_kes)} · {new Date(inst.created_at).toLocaleDateString("en-KE")}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="receipt-footer">This is a Zola-generated receipt for critical care referral coordination. Retain for hospital finance and audit.</p>
    </div>
  );
}

export function openPaymentReceiptExport(
  openExport: (doc: ExportDocument, filename?: string) => void,
  payment: PaymentRecord,
  hospitalName?: string,
  installment?: PaymentInstallment | null
) {
  const doc = buildPaymentReceiptDocument(payment, hospitalName, installment);
  const slip = installment ?? payment.installments[payment.installments.length - 1];
  openExport(doc, slip?.receipt_number ?? payment.referral_reference);
}

"use client";

import { PaymentRecord, formatKes, paymentStatusLabel } from "@/lib/demo-payments";
import { printHtml } from "@/lib/export-document";

export function PaymentReceiptView({ payment, hospitalName }: { payment: PaymentRecord; hospitalName?: string }) {
  return (
    <div className="payment-receipt">
      <div className="payment-receipt-head">
        <div>
          <p className="eyebrow">ZOLA PAYMENT RECEIPT</p>
          <h2>{payment.receipt_number}</h2>
        </div>
        <span className={`payment-status ${payment.status}`}>{paymentStatusLabel(payment.status)}</span>
      </div>
      <dl className="receipt-dl">
        <div><dt>Date</dt><dd>{new Date(payment.created_at).toLocaleString("en-KE")}</dd></div>
        <div><dt>Referral</dt><dd className="mono">{payment.referral_reference}</dd></div>
        <div><dt>Patient</dt><dd>{payment.patient_initials} · {payment.care_level}</dd></div>
        <div><dt>Referring hospital</dt><dd>{payment.referring_hospital}</dd></div>
        <div><dt>Receiving hospital</dt><dd>{payment.receiving_hospital}</dd></div>
        {hospitalName && (
          <div><dt>Issued by</dt><dd>{hospitalName}</dd></div>
        )}
        <div><dt>Payer</dt><dd>{payment.payer_label}</dd></div>
        <div><dt>Method</dt><dd style={{ textTransform: "capitalize" }}>{payment.method.replace("_", " ")}</dd></div>
        <div><dt>Payment type</dt><dd style={{ textTransform: "capitalize" }}>{payment.payment_type}</dd></div>
      </dl>
      <table className="receipt-table">
        <tbody>
          <tr><td>Amount due</td><td>{formatKes(payment.amount_due_kes)}</td></tr>
          <tr><td>Amount paid</td><td>{formatKes(payment.amount_paid_kes)}</td></tr>
          <tr><td><strong>Balance</strong></td><td><strong>{formatKes(payment.balance_kes)}</strong></td></tr>
        </tbody>
      </table>
      {payment.notes && <p className="receipt-notes"><strong>Notes:</strong> {payment.notes}</p>}
      <p className="receipt-footer">This is a Zola-generated receipt for critical care referral coordination. Retain for hospital finance and audit.</p>
    </div>
  );
}

export function printPaymentReceipt(payment: PaymentRecord, hospitalName?: string) {
  const body = `
    <h1>Zola payment receipt</h1>
    <p class="meta">${payment.receipt_number} · ${new Date(payment.created_at).toLocaleString("en-KE")}</p>
    <table>
      <tr><th>Field</th><th>Detail</th></tr>
      <tr><td>Status</td><td>${paymentStatusLabel(payment.status)}</td></tr>
      <tr><td>Referral</td><td>${payment.referral_reference}</td></tr>
      <tr><td>Patient</td><td>${payment.patient_initials} (${payment.care_level})</td></tr>
      <tr><td>Referring hospital</td><td>${payment.referring_hospital}</td></tr>
      <tr><td>Receiving hospital</td><td>${payment.receiving_hospital}</td></tr>
      ${hospitalName ? `<tr><td>Issued by</td><td>${hospitalName}</td></tr>` : ""}
      <tr><td>Payer</td><td>${payment.payer_label}</td></tr>
      <tr><td>Method</td><td>${payment.method.replace("_", " ")}</td></tr>
      <tr><td>Amount due</td><td>${formatKes(payment.amount_due_kes)}</td></tr>
      <tr><td>Amount paid</td><td>${formatKes(payment.amount_paid_kes)}</td></tr>
      <tr><td>Balance</td><td>${formatKes(payment.balance_kes)}</td></tr>
    </table>
    ${payment.notes ? `<p class="totals"><strong>Notes:</strong> ${payment.notes}</p>` : ""}
    <p class="footer">Zola critical care coordination · ${payment.receipt_number}</p>
  `;
  printHtml(payment.receipt_number, body);
}

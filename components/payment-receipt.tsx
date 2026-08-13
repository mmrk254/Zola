"use client";

import { PaymentInstallment, PaymentRecord, formatKes, paymentStatusLabel } from "@/lib/demo-payments";
import { printHtml } from "@/lib/export-document";

function installmentLabel(installment: PaymentInstallment) {
  return installment.payment_type === "full" ? "Full payment" : installment.payment_type === "partial" ? "Partial payment" : "Deposit";
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

export function printPaymentReceipt(payment: PaymentRecord, hospitalName?: string, installment?: PaymentInstallment | null) {
  const slip = installment ?? payment.installments[payment.installments.length - 1];
  const body = `
    <h1>Zola payment receipt</h1>
    <p class="meta">${slip?.receipt_number ?? payment.referral_reference} · ${slip ? new Date(slip.created_at).toLocaleString("en-KE") : ""}</p>
    <table>
      <tr><th>Field</th><th>Detail</th></tr>
      <tr><td>Account status</td><td>${paymentStatusLabel(payment.status)}</td></tr>
      <tr><td>Referral</td><td>${payment.referral_reference}</td></tr>
      <tr><td>Patient</td><td>${payment.patient_initials} (${payment.care_level})</td></tr>
      <tr><td>Referring hospital</td><td>${payment.referring_hospital}</td></tr>
      <tr><td>Receiving hospital</td><td>${payment.receiving_hospital}</td></tr>
      ${hospitalName ? `<tr><td>Issued by</td><td>${hospitalName}</td></tr>` : ""}
      ${slip ? `<tr><td>This receipt amount</td><td>${formatKes(slip.amount_kes)}</td></tr>` : ""}
      <tr><td>Total due</td><td>${formatKes(payment.amount_due_kes)}</td></tr>
      <tr><td>Total paid</td><td>${formatKes(payment.amount_paid_kes)}</td></tr>
      <tr><td>Balance</td><td>${formatKes(payment.balance_kes)}</td></tr>
    </table>
    ${slip?.notes ? `<p class="totals"><strong>Notes:</strong> ${slip.notes}</p>` : ""}
    <p class="footer">Zola critical care coordination · ${slip?.receipt_number ?? payment.referral_reference}</p>
  `;
  printHtml(slip?.receipt_number ?? payment.referral_reference, body);
}

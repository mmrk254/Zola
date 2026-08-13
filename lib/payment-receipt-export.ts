import {
  PaymentInstallment,
  PaymentRecord,
  formatKes,
  paymentStatusLabel
} from "@/lib/demo-payments";
import { ExportDocument, ExportSection } from "@/lib/document-templates";

function installmentLabel(installment: PaymentInstallment) {
  return installment.payment_type === "full"
    ? "Full payment"
    : installment.payment_type === "partial"
      ? "Partial payment"
      : "Deposit";
}

function badgeTone(status: PaymentRecord["status"]) {
  if (status === "paid") return "paid" as const;
  if (status === "partial") return "partial" as const;
  if (status === "pending") return "pending" as const;
  return "neutral" as const;
}

export function buildPaymentReceiptDocument(
  payment: PaymentRecord,
  hospitalName?: string,
  installment?: PaymentInstallment | null
): ExportDocument {
  const slip = installment ?? payment.installments[payment.installments.length - 1];
  const receiptNo = slip?.receipt_number ?? payment.referral_reference;

  const caseRows = [
    { label: "Referral reference", value: payment.referral_reference },
    { label: "Patient", value: `${payment.patient_initials} · ${payment.care_level}` },
    { label: "Referring hospital", value: payment.referring_hospital },
    { label: "Receiving hospital", value: payment.receiving_hospital },
    ...(hospitalName ? [{ label: "Issued by", value: hospitalName }] : [])
  ];

  const paymentRows = slip
    ? [
        { label: "Receipt number", value: receiptNo },
        { label: "Payment date", value: new Date(slip.created_at).toLocaleString("en-KE") },
        { label: "Payer", value: slip.payer_label },
        { label: "Payment method", value: slip.method.replace("_", " ") },
        { label: "Payment type", value: installmentLabel(slip) },
        { label: "Amount on this receipt", value: formatKes(slip.amount_kes), emphasis: true }
      ]
    : [];

  const balanceRows = [
    { label: "Total amount due", value: formatKes(payment.amount_due_kes) },
    { label: "Total paid to date", value: formatKes(payment.amount_paid_kes) },
    { label: "Outstanding balance", value: formatKes(payment.balance_kes), emphasis: true }
  ];

  const sections: ExportSection[] = [
    { title: "Case details", rows: caseRows },
    ...(paymentRows.length ? [{ title: "This payment", rows: paymentRows }] : []),
    { title: "Account summary", rows: balanceRows }
  ];

  if (payment.installments.length > 1) {
    sections.push({
      title: "Payment history",
      subtitle: "All receipts recorded against this referral",
      rows: payment.installments.map((inst) => ({
        label: `${inst.receipt_number} · ${new Date(inst.created_at).toLocaleDateString("en-KE")}`,
        value: formatKes(inst.amount_kes)
      }))
    });
  }

  if (slip?.notes) {
    sections.push({
      title: "Notes",
      rows: [{ label: "Remarks", value: slip.notes }]
    });
  }

  return {
    kind: "receipt",
    title: "Payment receipt",
    subtitle: `${payment.referring_hospital} → ${payment.receiving_hospital}`,
    reference: receiptNo,
    badge: { text: paymentStatusLabel(payment.status), tone: badgeTone(payment.status) },
    sections,
    footer: "Zola critical care coordination · Retain this receipt for hospital finance, audit, and insurer records."
  };
}

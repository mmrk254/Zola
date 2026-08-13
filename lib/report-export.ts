import { ExportDocument } from "./document-templates";
import { formatKes } from "./demo-payments";

export type ReportExportData = {
  hospitalName: string;
  generatedAt: string;
  total: number;
  matchedRate: number;
  acceptanceRate: number;
  completionRate: number;
  critical: number;
  inTransit: number;
  declined: number;
  collected: string;
  outstanding: string;
  pipeline: { label: string; count: number }[];
  byCareLevel: { label: string; count: number }[];
  byUrgency: { label: string; count: number }[];
  byReferringFacility: { label: string; count: number }[];
  transferModes: { label: string; count: number }[];
};

export function buildReportDocument(data: ReportExportData): ExportDocument {
  return {
    kind: "report",
    title: "Hospital coordination report",
    subtitle: `${data.hospitalName} · ${data.generatedAt}`,
    badge: { text: "Operations analytics", tone: "neutral" },
    sections: [
      {
        title: "Executive summary",
        subtitle: "Key referral coordination metrics",
        rows: [
          { label: "Total referrals", value: String(data.total) },
          { label: "Matched to a bed", value: `${data.matchedRate}%` },
          { label: "Acceptance rate", value: `${data.acceptanceRate}%` },
          { label: "Transfer completion", value: `${data.completionRate}%` },
          { label: "Critical cases", value: String(data.critical) },
          { label: "Patients in transit", value: String(data.inTransit) },
          { label: "Declined / unmatched", value: String(data.declined) },
          { label: "Payments collected", value: data.collected },
          { label: "Outstanding balance", value: data.outstanding, emphasis: true }
        ]
      },
      {
        title: "Pipeline breakdown",
        rows: data.pipeline.map((p) => ({ label: p.label, value: String(p.count) }))
      },
      {
        title: "Care level demand",
        rows: data.byCareLevel.map((p) => ({ label: p.label, value: String(p.count) }))
      },
      {
        title: "Urgency mix",
        rows: data.byUrgency.map((p) => ({ label: p.label, value: String(p.count) }))
      },
      {
        title: "Referring facilities",
        rows: data.byReferringFacility.map((p) => ({ label: p.label, value: String(p.count) }))
      },
      {
        title: "Transfer pathways",
        rows: data.transferModes.map((p) => ({ label: p.label, value: String(p.count) }))
      }
    ],
    footer: "Zola critical care coordination · Confidential clinical operations report for hospital leadership and audit."
  };
}

export function buildReportExportData(args: Omit<ReportExportData, "generatedAt"> & { generatedAt?: string }): ReportExportData {
  return {
    ...args,
    generatedAt: args.generatedAt ?? new Date().toLocaleString("en-KE")
  };
}

export function formatReportMoney(amount: number) {
  return formatKes(amount);
}

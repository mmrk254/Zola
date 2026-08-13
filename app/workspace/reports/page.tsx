"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { HospitalShell } from "@/components/hospital-shell";
import { FacilityRequiredNotice } from "@/components/facility-selector";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/use-workspace";
import { demoReferrals } from "@/lib/demo-data";
import { demoPayments, formatKes, loadPayments } from "@/lib/demo-payments";
import { downloadCsv, printHtml } from "@/lib/export-document";
import { CareLevel, PIPELINE_BUCKETS, Referral, Urgency } from "@/lib/types";

function BarRows({ rows }: { rows: { label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="report-bars">
      {rows.map((r) => (
        <div className="report-bar-row" key={r.label}>
          <span>{r.label}</span>
          <div className="report-bar-track">
            <div className="report-bar-fill" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
          <span style={{ textAlign: "right", fontWeight: 700 }}>{r.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const { activeHospitalId, session } = useWorkspace();
  const [referrals, setReferrals] = useState<Referral[]>(demoReferrals);
  const [payments, setPayments] = useState(demoPayments);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const hospitalName =
    session?.memberships.find((m) => m.hospital_id === activeHospitalId)?.hospital_name ?? "Your facility";

  useEffect(() => {
    setPayments(loadPayments());
    if (!isSupabaseConfigured) return;
    const params = activeHospitalId ? `?hospital_id=${activeHospitalId}` : "";
    fetch(`/api/referrals${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.referrals) setReferrals(data.referrals);
      })
      .finally(() => setLoading(false));
  }, [activeHospitalId]);

  const total = referrals.length;
  const accepted = referrals.filter((r) =>
    ["hospital_accepted", "family_confirmed", "ambulance_arranged", "patient_en_route", "patient_received", "closed"].includes(r.status)
  ).length;
  const declined = referrals.filter((r) => r.status === "closed" && !r.receiving_facility_id).length;
  const stillSearching = referrals.filter((r) => r.status === "searching").length;
  const inTransit = referrals.filter((r) => ["ambulance_arranged", "patient_en_route"].includes(r.status)).length;
  const received = referrals.filter((r) => ["patient_received", "closed"].includes(r.status)).length;
  const critical = referrals.filter((r) => r.urgency === "critical").length;
  const matchedRate = total ? Math.round(((total - stillSearching) / total) * 100) : 0;
  const acceptanceRate = total ? Math.round((accepted / total) * 100) : 0;
  const completionRate = total ? Math.round((received / total) * 100) : 0;
  const collected = payments.reduce((s, p) => s + p.amount_paid_kes, 0);
  const outstanding = payments.reduce((s, p) => s + p.balance_kes, 0);

  const pipeline = useMemo(
    () => PIPELINE_BUCKETS.map((b) => ({ label: b.label, count: referrals.filter((r) => b.statuses.includes(r.status)).length })),
    [referrals]
  );

  const byCareLevel = useMemo(() => {
    const levels: CareLevel[] = ["ICU", "HDU", "NICU"];
    return levels.map((level) => ({ label: level, count: referrals.filter((r) => r.care_level === level).length }));
  }, [referrals]);

  const byUrgency = useMemo(() => {
    const urgencies: Urgency[] = ["critical", "urgent", "routine"];
    return urgencies.map((u) => ({
      label: u[0].toUpperCase() + u.slice(1),
      count: referrals.filter((r) => r.urgency === u).length
    }));
  }, [referrals]);

  const byReferringFacility = useMemo(() => {
    const map = new Map<string, number>();
    referrals.forEach((r) => map.set(r.referring_facility, (map.get(r.referring_facility) ?? 0) + 1));
    return Array.from(map.entries()).map(([label, count]) => ({ label, count }));
  }, [referrals]);

  const transferModes = useMemo(
    () => [
      { label: "External transfer", count: referrals.filter((r) => !r.transfer_mode || r.transfer_mode === "external").length },
      { label: "Internal on-site", count: referrals.filter((r) => r.transfer_mode === "internal_onsite").length },
      { label: "Internal off-site", count: referrals.filter((r) => r.transfer_mode === "internal_offsite").length }
    ],
    [referrals]
  );

  function exportCsv() {
    downloadCsv(`zola-reports-${hospitalName.replace(/\s+/g, "-").toLowerCase()}.csv`, [
      ["Report", "Value"],
      ["Hospital", hospitalName],
      ["Generated", new Date().toLocaleString("en-KE")],
      ["Total referrals", String(total)],
      ["Acceptance rate", `${acceptanceRate}%`],
      ["Completion rate", `${completionRate}%`],
      ["Critical cases", String(critical)],
      ["In transit", String(inTransit)],
      ["Declined / unmatched", String(declined)],
      ["Payments collected", formatKes(collected)],
      ["Outstanding balance", formatKes(outstanding)],
      ...pipeline.map((p) => [`Pipeline: ${p.label}`, String(p.count)]),
      ...byCareLevel.map((p) => [`Care level: ${p.label}`, String(p.count)])
    ]);
  }

  function printReport() {
    const rows = [
      ...pipeline.map((p) => `<tr><td>${p.label}</td><td>${p.count}</td></tr>`),
      ...byCareLevel.map((p) => `<tr><td>${p.label} volume</td><td>${p.count}</td></tr>`),
      ...byUrgency.map((p) => `<tr><td>${p.label} urgency</td><td>${p.count}</td></tr>`)
    ].join("");
    printHtml(
      `Zola reports — ${hospitalName}`,
      `<h1>Hospital coordination report</h1>
      <p class="meta">${hospitalName} · ${new Date().toLocaleString("en-KE")}</p>
      <table><tr><th>Metric</th><th>Value</th></tr>
      <tr><td>Total referrals</td><td>${total}</td></tr>
      <tr><td>Matched to a bed</td><td>${matchedRate}%</td></tr>
      <tr><td>Acceptance rate</td><td>${acceptanceRate}%</td></tr>
      <tr><td>Transfer completion</td><td>${completionRate}%</td></tr>
      <tr><td>Critical cases</td><td>${critical}</td></tr>
      <tr><td>Patients in transit</td><td>${inTransit}</td></tr>
      <tr><td>Payments collected</td><td>${formatKes(collected)}</td></tr>
      <tr><td>Outstanding</td><td>${formatKes(outstanding)}</td></tr>
      ${rows}
      </table>
      <p class="footer">Zola critical care coordination · Confidential clinical operations report</p>`
    );
  }

  return (
    <HospitalShell
      title="Reports & analytics"
      action={
        <div className="header-action-group">
          <button type="button" className="button compact ghost" onClick={exportCsv}>
            <Download size={14} /> CSV
          </button>
          <button type="button" className="button compact" onClick={printReport}>
            <Printer size={14} /> Print / PDF
          </button>
        </div>
      }
    >
      <FacilityRequiredNotice />

      <section className="metrics compact-metrics">
        <article><p>Total referrals</p><strong>{loading ? "..." : total}</strong></article>
        <article><p>Acceptance rate</p><strong>{loading ? "..." : `${acceptanceRate}%`}</strong></article>
        <article><p>Completed transfers</p><strong>{loading ? "..." : `${completionRate}%`}</strong></article>
        <article><p>Critical cases</p><strong>{loading ? "..." : critical}</strong></article>
      </section>

      <section className="report-grid printable-report">
        <div className="panel">
          <div className="panel-heading"><div><h2>Pipeline breakdown</h2><p>Every case, by coordination stage</p></div></div>
          <BarRows rows={pipeline} />
        </div>
        <div className="panel">
          <div className="panel-heading"><div><h2>By care level</h2><p>ICU · HDU · NICU demand</p></div></div>
          <BarRows rows={byCareLevel} />
        </div>
        <div className="panel">
          <div className="panel-heading"><div><h2>By urgency</h2><p>Clinical priority mix</p></div></div>
          <BarRows rows={byUrgency} />
        </div>
        <div className="panel">
          <div className="panel-heading"><div><h2>Referring facilities</h2><p>Who sends patients to your network</p></div></div>
          <BarRows rows={byReferringFacility.length ? byReferringFacility : [{ label: "No data", count: 0 }]} />
        </div>
        <div className="panel">
          <div className="panel-heading"><div><h2>Transfer mode</h2><p>External vs internal pathways</p></div></div>
          <BarRows rows={transferModes} />
        </div>
        <div className="panel">
          <div className="panel-heading"><div><h2>Operational KPIs</h2><p>Key metrics for charge nurses &amp; admins</p></div></div>
          <dl className="report-kpi-list">
            <div><dt>Patients in transit</dt><dd>{inTransit}</dd></div>
            <div><dt>Still searching for bed</dt><dd>{stillSearching}</dd></div>
            <div><dt>Declined / unmatched</dt><dd>{declined}</dd></div>
            <div><dt>Avg. match rate</dt><dd>{matchedRate}%</dd></div>
            <div><dt>Payments collected</dt><dd>{formatKes(collected)}</dd></div>
            <div><dt>Outstanding balances</dt><dd>{formatKes(outstanding)}</dd></div>
          </dl>
        </div>
        <div className="panel">
          <div className="panel-heading"><div><h2>Bed &amp; capacity insight</h2><p>Utilisation signals for ICU / HDU / NICU</p></div></div>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, margin: 0 }}>
            Peak demand is driven by {byCareLevel.sort((a, b) => b.count - a.count)[0]?.label ?? "ICU"} referrals.
            Review the <strong>Bed &amp; capacity</strong> module when acceptance rates drop — it usually means published bed counts are stale.
          </p>
        </div>
        <div className="panel">
          <div className="panel-heading"><div><h2>Ambulance &amp; handover</h2><p>Transfer logistics performance</p></div></div>
          <BarRows rows={[
            { label: "Ambulance arranged", count: referrals.filter((r) => r.status === "ambulance_arranged").length },
            { label: "En route", count: referrals.filter((r) => r.status === "patient_en_route").length },
            { label: "Received", count: referrals.filter((r) => r.status === "patient_received").length }
          ]} />
        </div>
      </section>
    </HospitalShell>
  );
}

export type ExportBadge = {
  text: string;
  tone: "paid" | "partial" | "pending" | "neutral";
};

export type ExportRow = {
  label: string;
  value: string;
  emphasis?: boolean;
};

export type ExportSection = {
  title: string;
  subtitle?: string;
  rows: ExportRow[];
};

export type ExportDocument = {
  kind: "receipt" | "report";
  title: string;
  subtitle: string;
  reference?: string;
  badge?: ExportBadge;
  sections: ExportSection[];
  footer: string;
};

const BADGE_COLORS: Record<ExportBadge["tone"], { bg: string; text: string }> = {
  paid: { bg: "#e6f3eb", text: "#1d7448" },
  partial: { bg: "#fbf2df", text: "#8a5a00" },
  pending: { bg: "#fbeef0", text: "#9c2f3e" },
  neutral: { bg: "#eef3fb", text: "#3d4f6d" }
};

export function buildDocumentHtml(doc: ExportDocument): string {
  const badge = doc.badge
    ? `<span style="display:inline-block;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:700;background:${BADGE_COLORS[doc.badge.tone].bg};color:${BADGE_COLORS[doc.badge.tone].text}">${escapeHtml(doc.badge.text)}</span>`
    : "";

  const sections = doc.sections
    .map((section) => {
      const rows = section.rows
        .map(
          (row) => `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #ece5d8;color:#5f6d7f;font-size:12px;width:42%;">${escapeHtml(row.label)}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #ece5d8;color:#172230;font-size:${row.emphasis ? "14px" : "13px"};font-weight:${row.emphasis ? "700" : "600"};text-align:right;">${escapeHtml(row.value)}</td>
        </tr>`
        )
        .join("");
      return `
      <section style="margin-top:22px;">
        <h2 style="margin:0 0 4px;font-size:14px;font-weight:700;color:#172230;">${escapeHtml(section.title)}</h2>
        ${section.subtitle ? `<p style="margin:0 0 10px;font-size:12px;color:#6b7686;">${escapeHtml(section.subtitle)}</p>` : ""}
        <table style="width:100%;border-collapse:collapse;border:1px solid #e4ddce;border-radius:10px;overflow:hidden;background:#fff;">
          <tbody>${rows}</tbody>
        </table>
      </section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(doc.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f7f3eb;font-family:Inter,Arial,sans-serif;color:#172230;">
  <div style="max-width:760px;margin:0 auto;padding:28px 24px 40px;">
    <div style="background:linear-gradient(135deg,#0f8d8a 0%,#146059 100%);border-radius:16px 16px 0 0;padding:22px 24px;color:#fff;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
        <div>
          <div style="font-size:10px;letter-spacing:.14em;font-weight:800;opacity:.85;margin-bottom:8px;">ZOLA · ${doc.kind === "receipt" ? "PAYMENT RECEIPT" : "OPERATIONS REPORT"}</div>
          <h1 style="margin:0 0 6px;font-size:24px;font-weight:700;line-height:1.2;">${escapeHtml(doc.title)}</h1>
          <p style="margin:0;font-size:12px;opacity:.88;">${escapeHtml(doc.subtitle)}</p>
          ${doc.reference ? `<p style="margin:8px 0 0;font-family:ui-monospace,monospace;font-size:12px;opacity:.95;">${escapeHtml(doc.reference)}</p>` : ""}
        </div>
        ${badge}
      </div>
    </div>
    <div style="background:#fffdf9;border:1px solid #e4ddce;border-top:0;border-radius:0 0 16px 16px;padding:24px;box-shadow:0 18px 40px rgba(17,24,39,.08);">
      ${sections}
      <p style="margin:28px 0 0;padding-top:14px;border-top:1px solid #ece5d8;font-size:11px;line-height:1.55;color:#6b7686;">${escapeHtml(doc.footer)}</p>
    </div>
  </div>
</body>
</html>`;
}

export function buildPreviewInnerHtml(doc: ExportDocument): string {
  const full = buildDocumentHtml(doc);
  const match = full.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return match?.[1] ?? full;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function documentToExcelRows(doc: ExportDocument): (string | number)[][] {
  const rows: (string | number)[][] = [
    ["Zola export"],
    [doc.title],
    [doc.subtitle],
    doc.reference ? ["Reference", doc.reference] : [],
    [],
    ["Section", "Metric", "Value"]
  ].filter((r) => r.length > 0) as (string | number)[][];

  doc.sections.forEach((section) => {
    rows.push([]);
    rows.push([section.title]);
    if (section.subtitle) rows.push([section.subtitle]);
    section.rows.forEach((row) => rows.push(["", row.label, row.value]));
  });

  rows.push([]);
  rows.push([doc.footer]);
  return rows;
}

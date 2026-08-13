export function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function printHtml(title: string, bodyHtml: string) {
  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${title}</title>
<style>
  body { font-family: Inter, Arial, sans-serif; color: #172230; margin: 32px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .meta { color: #5f6d7f; font-size: 12px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #e4ddce; padding: 8px 10px; font-size: 12px; text-align: left; }
  th { background: #f2ead9; }
  .totals { margin-top: 16px; font-size: 13px; }
  .footer { margin-top: 28px; font-size: 11px; color: #6b7686; border-top: 1px solid #e4ddce; padding-top: 12px; }
  @media print { body { margin: 16px; } }
</style></head><body>${bodyHtml}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

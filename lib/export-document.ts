import { buildDocumentHtml, documentToExcelRows, ExportDocument } from "./document-templates";

export function downloadCsv(filename: string, rows: string[][]) {
  const bom = "\uFEFF";
  const csv = bom + rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

export async function downloadExcel(doc: ExportDocument, filename: string) {
  const XLSX = await import("xlsx");
  const rows = documentToExcelRows(doc);
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = [{ wch: 22 }, { wch: 34 }, { wch: 22 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, doc.kind === "receipt" ? "Receipt" : "Report");
  const out = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  triggerDownload(blob, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export function printDocument(doc: ExportDocument) {
  const html = buildDocumentHtml(doc);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDoc = frameWindow?.document;
  if (!frameDoc || !frameWindow) {
    document.body.removeChild(iframe);
    return;
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  const runPrint = () => {
    frameWindow.focus();
    frameWindow.print();
    window.setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1000);
  };

  if (frameDoc.readyState === "complete") {
    window.setTimeout(runPrint, 250);
  } else {
    iframe.onload = () => window.setTimeout(runPrint, 250);
  }
}

export async function downloadPdf(element: HTMLElement, filename: string) {
  const html2pdf = (await import("html2pdf.js")).default;
  await html2pdf()
    .set({
      margin: [12, 12, 12, 12],
      filename: filename.endsWith(".pdf") ? filename : `${filename}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#f7f3eb" },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    })
    .from(element)
    .save();
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** @deprecated Use DocumentExportDialog instead */
export function printHtml(title: string, bodyHtml: string) {
  printDocument({
    kind: "report",
    title,
    subtitle: new Date().toLocaleString("en-KE"),
    sections: [{ title: "Details", rows: [{ label: "Content", value: "See exported document" }] }],
    footer: "Zola critical care coordination"
  });
}

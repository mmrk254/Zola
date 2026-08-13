"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Printer, X } from "lucide-react";
import { buildPreviewInnerHtml, ExportDocument } from "@/lib/document-templates";
import { downloadExcel, downloadPdf, printDocument } from "@/lib/export-document";

export function DocumentExportDialog({
  open,
  onClose,
  document,
  filenameBase
}: {
  open: boolean;
  onClose: () => void;
  document: ExportDocument | null;
  filenameBase: string;
}) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"print" | "pdf" | "excel" | null>(null);

  if (!open || !document) return null;

  async function handlePrint() {
    setBusy("print");
    try {
      printDocument(document!);
    } finally {
      setBusy(null);
    }
  }

  async function handlePdf() {
    if (!previewRef.current) return;
    setBusy("pdf");
    try {
      await downloadPdf(previewRef.current, filenameBase);
    } finally {
      setBusy(null);
    }
  }

  async function handleExcel() {
    setBusy("excel");
    try {
      await downloadExcel(document!, filenameBase);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="modal-backdrop document-export-backdrop" onClick={onClose}>
      <div className="document-export-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="document-export-toolbar">
          <div>
            <b>Export document</b>
            <p>Preview your {document.kind === "receipt" ? "receipt" : "report"}, then print or download.</p>
          </div>
          <div className="document-export-actions">
            <button type="button" className="button compact ghost" onClick={handlePrint} disabled={Boolean(busy)}>
              <Printer size={14} /> {busy === "print" ? "Printing..." : "Print"}
            </button>
            <button type="button" className="button compact" onClick={handlePdf} disabled={Boolean(busy)}>
              <Download size={14} /> {busy === "pdf" ? "Saving..." : "Download PDF"}
            </button>
            <button type="button" className="button compact ghost" onClick={handleExcel} disabled={Boolean(busy)}>
              <FileSpreadsheet size={14} /> {busy === "excel" ? "Saving..." : "Download Excel"}
            </button>
            <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="document-export-preview-wrap">
          <div
            ref={previewRef}
            className="document-export-preview"
            dangerouslySetInnerHTML={{ __html: buildPreviewInnerHtml(document) }}
          />
        </div>
      </div>
    </div>
  );
}

export function useDocumentExport() {
  const [open, setOpen] = useState(false);
  const [document, setDocument] = useState<ExportDocument | null>(null);
  const [filenameBase, setFilenameBase] = useState("zola-export");

  function openExport(doc: ExportDocument, filename?: string) {
    setDocument(doc);
    setFilenameBase(filename ?? slugify(doc.title));
    setOpen(true);
  }

  function closeExport() {
    setOpen(false);
  }

  const dialog = (
    <DocumentExportDialog open={open} onClose={closeExport} document={document} filenameBase={filenameBase} />
  );

  return { openExport, closeExport, dialog };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "zola-export";
}

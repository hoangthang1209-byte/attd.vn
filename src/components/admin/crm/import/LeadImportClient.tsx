"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Download, Upload } from "lucide-react";
import { useAdminToast } from "@/hooks/useAdminToast";
import type { LeadImportPreview, LeadImportResult } from "@/features/crm/services/lead-import.service";

async function readJsonResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data?.message === "string" ? data.message : "Yêu cầu không thành công.";
    throw new Error(message);
  }
  return data as T;
}

export default function LeadImportClient() {
  const toast = useAdminToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<LeadImportPreview | null>(null);
  const [result, setResult] = useState<LeadImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function onPreview() {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const data = await readJsonResponse<LeadImportPreview>(
        await fetch("/api/admin/crm/leads/import/preview", { method: "POST", body: form })
      );
      setPreview(data);
      setResult(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Preview thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function onImport() {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const data = await readJsonResponse<{ result: LeadImportResult }>(
        await fetch("/api/admin/crm/leads/import", { method: "POST", body: form })
      );
      setResult(data.result);
      toast.success("Import hoàn tất");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-panel">
      <p className="admin-field-hint">
        Mọi dòng hợp lệ đi qua <strong>intakeLead</strong> với idempotency theo source + sourceRef.{" "}
        <Link href="/admin/crm/intake">Xem Intake Hub</Link>
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <Link
          href="/api/admin/crm/leads/import/template"
          className="admin-btn admin-btn--secondary"
          prefetch={false}
        >
          <Download size={16} /> Tải mẫu CSV
        </Link>
        <button type="button" className="admin-btn" onClick={() => inputRef.current?.click()}>
          <Upload size={16} /> Chọn file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          hidden
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setPreview(null);
            setResult(null);
          }}
        />
        {file && <span className="admin-field-hint">{file.name}</span>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="admin-btn" disabled={!file || busy} onClick={() => void onPreview()}>
          Xem trước
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={!file || busy || !preview?.okCount}
          onClick={() => void onImport()}
        >
          Import
        </button>
      </div>
      {preview && (
        <p className="admin-field-hint" style={{ marginTop: 16 }}>
          OK: {preview.okCount} · Không hợp lệ: {preview.invalidCount}
        </p>
      )}
      {result && (
        <p className="admin-field-hint">
          Tạo mới: {result.created} · Trùng (replay): {result.duplicate} · Lỗi: {result.failed}
        </p>
      )}
    </div>
  );
}

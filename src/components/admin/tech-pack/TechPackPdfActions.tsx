"use client";

import { useRef } from "react";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import {
  openTechPackPdfPreview,
  openTechPackPdfPrint,
  techPackPdfDownloadUrl,
} from "@/features/tech-pack/pdf/open-tech-pack-pdf.client";
import { useAdminMutation } from "@/hooks/useAdminAction";

type Props = {
  techPackId: string;
  compact?: boolean;
};

export default function TechPackPdfActions({ techPackId, compact = false }: Props) {
  const mutate = useAdminMutation();
  const busyRef = useRef(false);

  async function withGuard<T>(fn: () => Promise<T>): Promise<T | null> {
    if (busyRef.current) return null;
    busyRef.current = true;
    try {
      return await fn();
    } finally {
      busyRef.current = false;
    }
  }

  async function previewPdf() {
    await withGuard(() =>
      mutate({
        loadingMessage: "Đang xuất PDF để xem trước...",
        errorFallback: "Không thể tạo PDF Tech Pack. Vui lòng thử lại.",
        action: async () => {
          openTechPackPdfPreview(techPackId);
          return { ok: true as const, data: true };
        },
      }),
    );
  }

  async function printPdf() {
    await withGuard(() =>
      mutate({
        loadingMessage: "Đang xuất PDF để in...",
        errorFallback: "Không thể tạo PDF Tech Pack. Vui lòng thử lại.",
        action: async () => {
          openTechPackPdfPrint(techPackId);
          return { ok: true as const, data: true };
        },
      }),
    );
  }

  async function downloadPdf() {
    await withGuard(() =>
      mutate({
        loadingMessage: "Đang xuất PDF để tải xuống...",
        successMessage: "Đã tạo PDF Tech Pack.",
        errorFallback: "Không thể tạo PDF Tech Pack. Vui lòng thử lại.",
        action: async () => {
          const res = await fetch(techPackPdfDownloadUrl(techPackId));
          if (!res.ok) {
            let message: string | undefined;
            try {
              const body = (await res.json()) as { message?: string };
              message = body.message;
            } catch {
              // ignore
            }
            return { ok: false as const, message };
          }
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download =
            res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ??
            "TECH-PACK.pdf";
          anchor.click();
          URL.revokeObjectURL(url);
          return { ok: true as const, data: true };
        },
      }),
    );
  }

  if (compact) {
    return (
      <AdminLoadingButton size="small" onClick={() => void previewPdf()}>
        PDF Tech Pack
      </AdminLoadingButton>
    );
  }

  return (
    <div className="tech-pack-pdf-actions">
      <AdminLoadingButton size="xs" onClick={() => void previewPdf()}>
        Xem PDF Tech Pack
      </AdminLoadingButton>
      <AdminLoadingButton size="xs" onClick={() => void printPdf()}>
        In / Lưu PDF
      </AdminLoadingButton>
      <AdminLoadingButton size="xs" onClick={() => void downloadPdf()}>
        Tải PDF Tech Pack
      </AdminLoadingButton>
    </div>
  );
}

"use client";

import type { OrderStatus } from "@prisma/client";
import { getProductionSheetAvailability } from "@/features/orders/production-sheet/production-sheet-availability";
import {
  openProductionSheetPdfInline,
  openProductionSheetView,
  productionSheetPdfDownloadUrl,
} from "@/features/orders/production-sheet/open-production-sheet-pdf.client";
import { useAdminMutation } from "@/hooks/useAdminAction";

type ProductionSheetOrderRef = {
  id: string;
  orderNo: string;
  status: OrderStatus;
};

type Props = {
  order: ProductionSheetOrderRef;
  compact?: boolean;
};

export default function ProductionSheetActions({ order, compact = false }: Props) {
  const mutate = useAdminMutation();
  const availability = getProductionSheetAvailability(order);

  async function downloadPdf() {
    await mutate({
      loadingMessage: "Đang chuẩn bị lệnh sản xuất…",
      successMessage: "Đã tạo PDF lệnh sản xuất.",
      errorFallback: "Không thể tạo file PDF lệnh sản xuất. Vui lòng thử lại.",
      action: async () => {
        const res = await fetch(productionSheetPdfDownloadUrl(order.id));
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
          `lenh-san-xuat-${order.orderNo}.pdf`;
        anchor.click();
        URL.revokeObjectURL(url);
        return { ok: true as const, data: true };
      },
    });
  }

  if (compact) {
    return (
      <button
        type="button"
        className="admin-btn admin-btn--secondary admin-btn--small"
        disabled={!availability.available}
        title={availability.reason ?? "Lệnh sản xuất"}
        onClick={() => openProductionSheetView(order.id)}
      >
        Lệnh sản xuất
      </button>
    );
  }

  return (
    <div className="production-sheet-actions">
      <p className="production-sheet-actions__title">Lệnh sản xuất</p>
      {!availability.available && availability.reason ? (
        <p className="admin-field-hint production-sheet-actions__hint">{availability.reason}</p>
      ) : null}
      <div className="production-sheet-actions__buttons">
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--xs"
          disabled={!availability.available}
          title={availability.reason ?? undefined}
          onClick={() => openProductionSheetView(order.id)}
        >
          Xem lệnh sản xuất
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--xs"
          disabled={!availability.available}
          title={availability.reason ?? undefined}
          onClick={() => openProductionSheetPdfInline(order.id)}
        >
          In / Lưu PDF
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--xs"
          disabled={!availability.available}
          title={availability.reason ?? undefined}
          onClick={() => void downloadPdf()}
        >
          Tải PDF
        </button>
      </div>
    </div>
  );
}

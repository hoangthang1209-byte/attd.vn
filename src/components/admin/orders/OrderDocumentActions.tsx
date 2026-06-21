"use client";

import { useMemo } from "react";
import { getOrderDocumentAvailability } from "@/features/orders/order-document-availability";
import type { OrderDocumentType } from "@/features/orders/order-document-types";
import type { OrderDetailRecord } from "@/features/orders/order.types";
import {
  openOrderDocumentView,
  openOrderPdfInline,
  orderPdfDownloadUrl,
} from "@/features/orders/pdf/open-order-pdf.client";
import { useAdminMutation } from "@/hooks/useAdminAction";

const DOCUMENTS: Array<{
  type: OrderDocumentType;
  label: string;
  viewLabel: string;
  downloadLabel: string;
  inlineLabel: string;
}> = [
  {
    type: "confirmation",
    label: "Xác nhận đơn hàng",
    viewLabel: "Xem xác nhận đơn hàng",
    downloadLabel: "Tải PDF xác nhận đơn hàng",
    inlineLabel: "In / Lưu PDF xác nhận đơn hàng",
  },
  {
    type: "production",
    label: "Lệnh sản xuất",
    viewLabel: "Xem lệnh sản xuất",
    downloadLabel: "Tải PDF lệnh sản xuất",
    inlineLabel: "In / Lưu PDF lệnh sản xuất",
  },
  {
    type: "delivery",
    label: "Phiếu giao hàng",
    viewLabel: "Xem phiếu giao hàng",
    downloadLabel: "Tải PDF phiếu giao hàng",
    inlineLabel: "In / Lưu PDF phiếu giao hàng",
  },
];

type Props = {
  order: OrderDetailRecord;
};

export default function OrderDocumentActions({ order }: Props) {
  const mutate = useAdminMutation();

  const availability = useMemo(
    () =>
      Object.fromEntries(
        DOCUMENTS.map((doc) => [doc.type, getOrderDocumentAvailability(doc.type, order)]),
      ) as Record<OrderDocumentType, ReturnType<typeof getOrderDocumentAvailability>>,
    [order],
  );

  async function downloadPdf(docType: OrderDocumentType, label: string) {
    await mutate({
      loadingMessage: `Đang tạo PDF ${label.toLowerCase()}…`,
      successMessage: "Đã tạo PDF chứng từ.",
      errorFallback: "Không thể tạo file PDF chứng từ đơn hàng. Vui lòng thử lại.",
      action: async () => {
        const res = await fetch(orderPdfDownloadUrl(order.id, docType));
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
          `order-${docType}.pdf`;
        anchor.click();
        URL.revokeObjectURL(url);
        return { ok: true as const, data: true };
      },
    });
  }

  return (
    <fieldset className="admin-catalog-fieldset order-document-actions">
      <legend>Chứng từ đơn hàng</legend>
      <div className="order-document-actions__groups">
        {DOCUMENTS.map((doc) => {
          const state = availability[doc.type];
          return (
            <div key={doc.type} className="order-document-actions__group">
              <p className="order-document-actions__title">{doc.label}</p>
              {!state.available && state.reason ? (
                <p className="admin-field-hint order-document-actions__hint">{state.reason}</p>
              ) : null}
              <div className="order-document-actions__buttons">
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  disabled={!state.available}
                  title={state.reason ?? undefined}
                  onClick={() => openOrderDocumentView(order.orderNo, doc.type)}
                >
                  {doc.viewLabel}
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  disabled={!state.available}
                  title={state.reason ?? undefined}
                  onClick={() => void downloadPdf(doc.type, doc.label)}
                >
                  {doc.downloadLabel}
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  disabled={!state.available}
                  title={state.reason ?? undefined}
                  onClick={() => openOrderPdfInline(order.id, doc.type)}
                >
                  {doc.inlineLabel}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

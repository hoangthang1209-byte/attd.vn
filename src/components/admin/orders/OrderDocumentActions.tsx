"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { getOrderDocumentAvailability } from "@/features/orders/order-document-availability";
import type { OrderDocumentType } from "@/features/orders/order-document-types";
import type { OrderDetailRecord } from "@/features/orders/order.types";
import {
  openOrderDocumentView,
  openOrderPdfInline,
  orderPdfDownloadUrl,
} from "@/features/orders/pdf/open-order-pdf.client";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsContext";

const DOCUMENTS: Array<{
  type: OrderDocumentType;
  sectionLabel: string;
  viewLabel: string;
}> = [
  {
    type: "confirmation",
    sectionLabel: "Xác nhận đơn hàng",
    viewLabel: "Xem xác nhận đơn hàng",
  },
  {
    type: "production",
    sectionLabel: "Lệnh sản xuất",
    viewLabel: "Xem lệnh sản xuất",
  },
  {
    type: "delivery",
    sectionLabel: "Phiếu giao hàng",
    viewLabel: "Xem phiếu giao hàng",
  },
];

type PendingAction = `${OrderDocumentType}:view` | `${OrderDocumentType}:download` | `${OrderDocumentType}:inline`;

type Props = {
  order: OrderDetailRecord;
};

export default function OrderDocumentActions({ order }: Props) {
  const mutate = useAdminMutation();
  const { permissions } = useAdminPermissions();
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const visibleDocuments = useMemo(
    () =>
      DOCUMENTS.filter((doc) => {
        if (doc.type === "production") return true;
        return permissions.canViewFinancials;
      }),
    [permissions.canViewFinancials],
  );

  const availability = useMemo(
    () =>
      Object.fromEntries(
        visibleDocuments.map((doc) => [doc.type, getOrderDocumentAvailability(doc.type, order)]),
      ) as Record<OrderDocumentType, ReturnType<typeof getOrderDocumentAvailability>>,
    [order, visibleDocuments],
  );

  const closeMenu = useCallback(() => {
    if (pendingAction) return;
    setOpen(false);
    triggerRef.current?.focus();
  }, [pendingAction]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      closeMenu();
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, closeMenu]);

  async function downloadPdf(docType: OrderDocumentType) {
    const actionKey: PendingAction = `${docType}:download`;
    if (pendingAction) return;
    setPendingAction(actionKey);
    await mutate({
      loadingMessage: "Đang tạo PDF…",
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
    setPendingAction(null);
    closeMenu();
  }

  async function handleView(docType: OrderDocumentType) {
    const actionKey: PendingAction = `${docType}:view`;
    if (pendingAction) return;
    setPendingAction(actionKey);
    await mutate({
      loadingMessage: "Đang mở…",
      errorFallback: "Không thể mở chứng từ.",
      action: async () => {
        openOrderDocumentView(order.orderNo, docType);
        return { ok: true as const, data: true };
      },
    });
    setPendingAction(null);
    closeMenu();
  }

  async function handleInline(docType: OrderDocumentType) {
    const actionKey: PendingAction = `${docType}:inline`;
    if (pendingAction) return;
    setPendingAction(actionKey);
    await mutate({
      loadingMessage: "Đang mở…",
      errorFallback: "Không thể mở PDF để in.",
      action: async () => {
        openOrderPdfInline(order.id, docType);
        return { ok: true as const, data: true };
      },
    });
    setPendingAction(null);
    closeMenu();
  }

  if (visibleDocuments.length === 0) return null;

  return (
    <div className="order-document-menu">
      <button
        ref={triggerRef}
        type="button"
        className="admin-btn admin-btn--secondary admin-btn--small"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        Chứng từ ▾
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          className="order-document-menu__panel"
          aria-label="Chứng từ đơn hàng"
        >
          {visibleDocuments.map((doc) => {
            const state = availability[doc.type];
            return (
              <div key={doc.type} className="order-document-menu__section" role="none">
                <p className="order-document-menu__section-label">{doc.sectionLabel}</p>
                {!state.available && state.reason ? (
                  <p className="order-document-menu__hint">{state.reason}</p>
                ) : null}
                <div className="order-document-menu__actions" role="group">
                  <AdminLoadingButton
                    role="menuitem"
                    size="small"
                    className="order-document-menu__action"
                    disabled={!state.available}
                    title={state.reason ?? undefined}
                    pending={pendingAction === `${doc.type}:view`}
                    pendingLabel="Đang mở…"
                    onClick={() => void handleView(doc.type)}
                  >
                    {doc.viewLabel}
                  </AdminLoadingButton>
                  <AdminLoadingButton
                    role="menuitem"
                    size="small"
                    className="order-document-menu__action"
                    disabled={!state.available}
                    title={state.reason ?? undefined}
                    pending={pendingAction === `${doc.type}:download`}
                    pendingLabel="Đang tải xuống…"
                    onClick={() => void downloadPdf(doc.type)}
                  >
                    Tải PDF
                  </AdminLoadingButton>
                  <AdminLoadingButton
                    role="menuitem"
                    size="small"
                    className="order-document-menu__action"
                    disabled={!state.available}
                    title={state.reason ?? undefined}
                    pending={pendingAction === `${doc.type}:inline`}
                    pendingLabel="Đang mở…"
                    onClick={() => void handleInline(doc.type)}
                  >
                    In / Lưu PDF
                  </AdminLoadingButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import ProcessTrustBlock from "@/components/public/trust/ProcessTrustBlock";
import TrustReassuranceLine from "@/components/public/trust/TrustReassuranceLine";
import {
  PDP_QUOTE_PROCESS_STEPS,
  TRUST_REASSURANCE_PRIVACY,
} from "@/lib/b2b-trust-v2-copy";
import ProductMediaFrame from "@/components/public/ProductMediaFrame";
import type { ProductQuoteContext } from "@/components/public/product-quote.types";
import { formatPdpMoqText, isPublicMoq } from "@/lib/formatMoq";
import { ButtonLoading } from "@/components/ui/loading/ContextLoading";
import {
  trackPdpQuoteSubmitAttempt,
  trackPdpQuoteSubmitSuccess,
} from "@/lib/analytics";
import { isValidImageSrc } from "@/lib/imagePaths";

type FormStatus = "idle" | "loading" | "success" | "error";

type Props = {
  open: boolean;
  onClose: () => void;
  product: ProductQuoteContext;
  restoreFocusRef?: React.RefObject<HTMLButtonElement | null>;
};

function formatOptionKey(key: string): string {
  const normalized = key.toLowerCase();
  if (normalized.includes("mau") || normalized.includes("color")) return "Màu";
  if (normalized.includes("size") || normalized.includes("kich-co")) return "Size";
  return key
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatOptionSelectionSummary(
  optionSelections?: Record<string, string | null>,
): string | null {
  if (!optionSelections) return null;
  const options = Object.entries(optionSelections)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${formatOptionKey(key)}: ${value}`);
  return options.length ? options.join(" · ") : null;
}

function buildProductMessage(payload: {
  product: ProductQuoteContext;
  productUrl: string;
  expectedQty: string;
  note: string;
}): string {
  const { product, productUrl, expectedQty, note } = payload;
  const lines = [
    "[Yêu cầu báo giá sản phẩm]",
    `Sản phẩm: ${product.name}`,
    `URL: ${productUrl}`,
  ];
  if (product.category?.trim()) lines.push(`Danh mục: ${product.category.trim()}`);
  if (product.variantLabel?.trim()) lines.push(`Biến thể: ${product.variantLabel.trim()}`);
  if (product.variantSku?.trim()) lines.push(`SKU: ${product.variantSku.trim()}`);
  if (product.optionSummary?.trim()) {
    lines.push(`Tùy chọn: ${product.optionSummary.trim()}`);
  } else if (product.optionSelections) {
    const options = Object.entries(product.optionSelections)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}: ${value}`);
    if (options.length) lines.push(`Tùy chọn: ${options.join(", ")}`);
  }
  if (isPublicMoq(product.moq)) lines.push(`MOQ: ${formatPdpMoqText(product.moq)}`);
  if (product.leadTime?.trim()) lines.push(`Thời gian sản xuất: ${product.leadTime.trim()}`);
  if (expectedQty.trim()) lines.push(`Số lượng dự kiến: ${expectedQty.trim()}`);
  if (note.trim()) {
    lines.push("---");
    lines.push(note.trim());
  }
  return lines.join("\n");
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null || el === document.activeElement);
}

export default function ProductQuoteDialog({
  open,
  onClose,
  product,
  restoreFocusRef,
}: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [expectedQty, setExpectedQty] = useState("");
  const [note, setNote] = useState("");
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleClose = useCallback(() => {
    onClose();
    requestAnimationFrame(() => {
      restoreFocusRef?.current?.focus();
    });
  }, [onClose, restoreFocusRef]);

  useEffect(() => {
    if (!open) return;
    setFormStatus("idle");
    setErrorMessage("");
  }, [open, product.id]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = getFocusableElements(panelRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (formStatus === "loading") return;

    if (!name.trim()) {
      setErrorMessage("Vui lòng nhập họ và tên.");
      setFormStatus("error");
      return;
    }
    if (!phone.trim()) {
      setErrorMessage("Vui lòng nhập số điện thoại.");
      setFormStatus("error");
      return;
    }

    setFormStatus("loading");
    setErrorMessage("");
    trackPdpQuoteSubmitAttempt({
      product_id: product.id,
      product_slug: product.slug,
    });

    const productUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/san-pham/${product.slug}`
        : `/san-pham/${product.slug}`;

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          company: company.trim() || null,
          message: buildProductMessage({ product, productUrl, expectedQty, note }),
          productInquiry: {
            productId: product.id,
            productName: product.name,
            productUrl,
            variantId: product.variantId ?? null,
            variantLabel: product.variantLabel ?? null,
            optionSelections: product.optionSelections ?? null,
            moq: product.moq ?? null,
            leadTime: product.leadTime ?? null,
            quantity: expectedQty.trim() || null,
            note: note.trim() || null,
          },
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setErrorMessage(data.message ?? "Không gửi được yêu cầu. Vui lòng thử lại.");
        setFormStatus("error");
        return;
      }

      setFormStatus("success");
      trackPdpQuoteSubmitSuccess({
        product_id: product.id,
        product_slug: product.slug,
      });
    } catch {
      setErrorMessage("Không thể kết nối. Vui lòng thử lại.");
      setFormStatus("error");
    }
  }

  if (!open) return null;

  const moqText = isPublicMoq(product.moq) ? formatPdpMoqText(product.moq) : null;
  const hasImage = Boolean(product.imageUrl && isValidImageSrc(product.imageUrl));
  const variantLabel = product.variantLabel?.trim() || null;
  const optionSummary =
    product.optionSummary?.trim() || formatOptionSelectionSummary(product.optionSelections);

  return createPortal(
    <div className="product-quote-dialog" role="presentation">
      <div
        className="product-quote-dialog__backdrop"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className="product-quote-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="product-quote-dialog__header">
          <div className="product-quote-dialog__header-text">
            <p className="product-quote-dialog__eyebrow">Yêu cầu báo giá</p>
            <h2 id={titleId} className="product-quote-dialog__title">
              Nhận báo giá sỉ cho sản phẩm này
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="product-quote-dialog__close"
            onClick={handleClose}
            aria-label="Đóng"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        {formStatus === "success" ? (
          <div className="product-quote-dialog__success">
            <div className="lead-form-success-icon" aria-hidden>
              ✓
            </div>
            <h3>ATTD đã nhận yêu cầu báo giá</h3>
            <p>
              Cảm ơn bạn. Đội ngũ ATTD sẽ xem sản phẩm, số lượng và liên hệ lại trong giờ làm việc.
            </p>
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Đóng
            </button>
          </div>
        ) : (
          <>
            <div className="product-quote-dialog__body">
              <p className="product-quote-dialog__intro">
                Để lại thông tin ngắn gọn, ATTD sẽ tư vấn MOQ, thời gian sản xuất và phương án logo nếu cần.
              </p>

              <div className="product-quote-dialog__product">
                <div className="product-quote-dialog__product-media">
                  {hasImage ? (
                    <Image
                      src={product.imageUrl!}
                      alt=""
                      width={56}
                      height={56}
                      className="product-quote-dialog__product-img"
                    />
                  ) : (
                    <ProductMediaFrame
                      imageUrl={null}
                      alt={product.name}
                      sizes="56px"
                      placeholderCompact
                    />
                  )}
                </div>
                <div className="product-quote-dialog__product-meta">
                  <p className="product-quote-dialog__product-name">{product.name}</p>
                  {variantLabel && (
                    <p className="product-quote-dialog__product-variant">{variantLabel}</p>
                  )}
                  {optionSummary && (
                    <p className="product-quote-dialog__product-options">
                      Lựa chọn: {optionSummary}
                    </p>
                  )}
                  {moqText && (
                    <p className="product-quote-dialog__product-moq">{moqText}</p>
                  )}
                </div>
              </div>

              <form
                id={`${titleId}-form`}
                className="product-quote-dialog__form"
                onSubmit={(e) => void handleSubmit(e)}
                noValidate
              >
                <div className="form-group">
                  <label htmlFor={`${titleId}-name`} className="form-label">
                    Họ và tên <span className="form-required">*</span>
                  </label>
                  <input
                    id={`${titleId}-name`}
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Người nhận báo giá"
                    autoComplete="name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`${titleId}-phone`} className="form-label">
                    Số điện thoại <span className="form-required">*</span>
                  </label>
                  <input
                    id={`${titleId}-phone`}
                    type="tel"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Số điện thoại/Zalo"
                    autoComplete="tel"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`${titleId}-company`} className="form-label">
                    Tên công ty
                  </label>
                  <input
                    id={`${titleId}-company`}
                    type="text"
                    className="form-input"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Không bắt buộc"
                    autoComplete="organization"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`${titleId}-qty`} className="form-label">
                    Số lượng dự kiến
                  </label>
                  <input
                    id={`${titleId}-qty`}
                    type="text"
                    className="form-input"
                    value={expectedQty}
                    onChange={(e) => setExpectedQty(e.target.value)}
                    placeholder="VD: 100, 500, 1.000..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`${titleId}-note`} className="form-label">
                    Nội dung cần tư vấn
                  </label>
                  <textarea
                    id={`${titleId}-note`}
                    className="form-input form-textarea"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ví dụ: cần in logo ngực trái, phối size, giao trong 2 tuần..."
                  />
                  <div className="form-hint">
                    Nếu chưa rõ số lượng hoặc kỹ thuật in/thêu, bạn có thể để trống.
                  </div>
                </div>

                {formStatus === "error" && errorMessage && (
                  <div
                    className="form-error product-quote-dialog__form-error"
                    role="alert"
                  >
                    {errorMessage}
                  </div>
                )}

                <div className="product-quote-dialog__actions product-quote-dialog__actions--inline">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleClose}
                    disabled={formStatus === "loading"}
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={formStatus === "loading"}
                  >
                    {formStatus === "loading" ? (
                      <ButtonLoading title="Đang gửi yêu cầu…" tone="public" />
                    ) : (
                      "Yêu cầu báo giá"
                    )}
                  </button>
                </div>

                <ProcessTrustBlock
                  title="Sau khi gửi yêu cầu"
                  steps={PDP_QUOTE_PROCESS_STEPS}
                  variant="compact"
                  className="product-quote-dialog__process"
                />
                <TrustReassuranceLine className="product-quote-dialog__reassurance">
                  {TRUST_REASSURANCE_PRIVACY}
                </TrustReassuranceLine>
              </form>
            </div>

            <div className="product-quote-dialog__sticky-footer" aria-hidden={false}>
              {formStatus === "error" && errorMessage && (
                <div className="form-error" role="alert">
                  {errorMessage}
                </div>
              )}
              <button
                type="submit"
                form={`${titleId}-form`}
                className="btn-primary product-quote-dialog__sticky-submit"
                disabled={formStatus === "loading"}
              >
                {formStatus === "loading" ? (
                  <ButtonLoading title="Đang gửi yêu cầu…" tone="public" />
                ) : (
                  "Yêu cầu báo giá"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

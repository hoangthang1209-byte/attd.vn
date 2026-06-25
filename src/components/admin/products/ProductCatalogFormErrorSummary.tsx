"use client";

import type { ProductFormErrorDescriptor, ProductFormTabId } from "@/features/products/product-form-error-descriptors";
import { formatErrorSummaryLine } from "@/features/products/product-form-error-descriptors";

type Props = {
  title?: string;
  body?: string;
  descriptors: ProductFormErrorDescriptor[];
  formError?: string | null;
  errorDetail?: string | null;
  onFocusError: (descriptor: ProductFormErrorDescriptor) => void;
};

export default function ProductCatalogFormErrorSummary({
  title = "Không thể lưu sản phẩm",
  body = "Vui lòng kiểm tra các trường được đánh dấu bên dưới.",
  descriptors,
  formError,
  errorDetail,
  onFocusError,
}: Props) {
  const hasFieldErrors = descriptors.length > 0;
  const hasFormError = Boolean(formError) && !hasFieldErrors;

  if (!hasFieldErrors && !hasFormError) return null;

  return (
    <div className="admin-product-form-error-summary" role="alert" aria-live="polite">
      <h3 className="admin-product-form-error-summary__title">{title}</h3>
      {hasFieldErrors ? (
        <>
          <p className="admin-product-form-error-summary__body">{body}</p>
          <ul className="admin-product-form-error-summary__list">
            {descriptors.map((descriptor) => (
              <li key={descriptor.key}>
                <button
                  type="button"
                  className="admin-product-form-error-summary__item"
                  onClick={() => onFocusError(descriptor)}
                >
                  {formatErrorSummaryLine(descriptor)}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="admin-product-form-error-summary__body">
          {formError ?? "Không thể lưu sản phẩm. Vui lòng thử lại."}
        </p>
      )}
      {errorDetail && process.env.NODE_ENV === "development" && (
        <details className="admin-import-error-detail">
          <summary>Chi tiết lỗi</summary>
          <pre>{errorDetail}</pre>
        </details>
      )}
    </div>
  );
}

export type { ProductFormTabId };

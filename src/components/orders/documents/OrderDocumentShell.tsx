import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  variant?: "screen" | "pdf" | "print";
};

export default function OrderDocumentShell({ children, variant = "screen" }: Props) {
  const variantClass =
    variant === "pdf" ? " order-doc--pdf" : variant === "print" ? " order-doc--print" : "";

  return (
    <div
      className={`order-document-root order-doc${variantClass}`}
      data-order-document="true"
      data-mode={variant}
    >
      <div className="order-document-page order-doc__paper">{children}</div>
    </div>
  );
}

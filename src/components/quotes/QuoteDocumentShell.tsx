import type { ReactNode } from "react";

type QuoteDocumentShellProps = {
  children: ReactNode;
  /** pdf = document-only route for Chromium PDF capture */
  variant?: "screen" | "pdf" | "print";
};

/** Stable root wrapper for quote document — used by public page, print route, and PDF renderer. */
export default function QuoteDocumentShell({
  children,
  variant = "screen",
}: QuoteDocumentShellProps) {
  const variantClass =
    variant === "pdf"
      ? " quote-doc--pdf"
      : variant === "print"
        ? " quote-doc--print"
        : "";

  return (
    <div
      className={`quote-document-root quote-doc${variantClass}`}
      data-quote-document="true"
      data-mode={variant}
    >
      <div className="quote-document-page quote-doc__paper" id="quote-print-area">
        {children}
      </div>
    </div>
  );
}

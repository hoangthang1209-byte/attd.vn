"use client";

import { Loader2 } from "lucide-react";

type LoadingSize = "sm" | "md" | "lg";
type LoadingVariant = "page" | "section" | "table" | "card" | "button" | "inline";
type LoadingTone = "public" | "admin" | "dealer" | "neutral";

type BaseProps = {
  title: string;
  description?: string;
  size?: LoadingSize;
  tone?: LoadingTone;
  className?: string;
};

function join(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function LoadingSpinner({
  size = "md",
  tone = "neutral",
  className,
}: {
  size?: LoadingSize;
  tone?: LoadingTone;
  className?: string;
}) {
  return (
    <span
      className={join("attd-loading-spinner", `attd-loading-spinner--${size}`, `attd-loading-spinner--${tone}`, className)}
      aria-hidden="true"
    >
      <Loader2 size={size === "lg" ? 22 : size === "sm" ? 14 : 18} />
    </span>
  );
}

export function PageLoading({ title, description, size = "lg", tone = "neutral", className }: BaseProps) {
  return (
    <div className={join("attd-loading attd-loading--page", `attd-loading--${tone}`, className)} role="status" aria-live="polite">
      <LoadingSpinner size={size} tone={tone} />
      <p className="attd-loading__title">{title}</p>
      {description ? <p className="attd-loading__desc">{description}</p> : null}
    </div>
  );
}

export function SectionLoading({ title, description, size = "md", tone = "neutral", className }: BaseProps) {
  return (
    <div className={join("attd-loading attd-loading--section", `attd-loading--${tone}`, className)} role="status" aria-live="polite">
      <LoadingSpinner size={size} tone={tone} />
      <div className="attd-loading__copy">
        <p className="attd-loading__title">{title}</p>
        {description ? <p className="attd-loading__desc">{description}</p> : null}
      </div>
    </div>
  );
}

export function TableLoading({
  title,
  description,
  tone = "admin",
  rows = 6,
  className,
}: BaseProps & { rows?: number }) {
  return (
    <div className={join("attd-loading attd-loading--table", `attd-loading--${tone}`, className)} role="status" aria-live="polite">
      <div className="attd-loading__copy">
        <p className="attd-loading__title">{title}</p>
        {description ? <p className="attd-loading__desc">{description}</p> : null}
      </div>
      <div className="attd-loading-table__rows" aria-hidden="true">
        {Array.from({ length: rows }, (_, i) => (
          <span key={i} className="attd-loading-table__row" style={{ width: `${98 - (i % 4) * 8}%` }} />
        ))}
      </div>
    </div>
  );
}

export function CardGridLoading({
  title,
  description,
  tone = "neutral",
  cards = 6,
  className,
}: BaseProps & { cards?: number }) {
  return (
    <div className={join("attd-loading attd-loading--card-grid", `attd-loading--${tone}`, className)} role="status" aria-live="polite">
      <div className="attd-loading__copy">
        <p className="attd-loading__title">{title}</p>
        {description ? <p className="attd-loading__desc">{description}</p> : null}
      </div>
      <div className="attd-loading-card-grid" aria-hidden="true">
        {Array.from({ length: cards }, (_, i) => (
          <span key={i} className="attd-loading-card-grid__card" />
        ))}
      </div>
    </div>
  );
}

export function ButtonLoading({
  title,
  size = "sm",
  tone = "neutral",
  className,
}: Pick<BaseProps, "title" | "size" | "tone" | "className">) {
  return (
    <span className={join("attd-loading-button", `attd-loading-button--${tone}`, className)} role="status" aria-live="polite">
      <LoadingSpinner size={size} tone={tone} />
      <span>{title}</span>
    </span>
  );
}

export function InlineLoading({ title, tone = "neutral", size = "sm", className }: Pick<BaseProps, "title" | "tone" | "size" | "className">) {
  return (
    <span className={join("attd-loading-inline", `attd-loading-inline--${tone}`, className)} role="status" aria-live="polite">
      <LoadingSpinner size={size} tone={tone} />
      <span>{title}</span>
    </span>
  );
}

export { LoadingSpinner };
export type { LoadingSize, LoadingTone, LoadingVariant };

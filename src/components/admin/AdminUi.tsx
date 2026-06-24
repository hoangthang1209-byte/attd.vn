import type { HTMLAttributes, ReactNode } from "react";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type AdminPageShellProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function AdminPageShell({
  children,
  className,
  ...props
}: AdminPageShellProps) {
  return (
    <div className={joinClasses("admin-page-shell", className)} {...props}>
      {children}
    </div>
  );
}

type PageHeaderProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={joinClasses("admin-page-header", className)}>
      <div className="admin-page-header__copy">
        {eyebrow && <p className="admin-page-header__eyebrow">{eyebrow}</p>}
        {title && <h2 className="admin-page-header__title">{title}</h2>}
        {description && (
          <p className="admin-page-header__description">{description}</p>
        )}
        {meta && <div className="admin-page-header__meta">{meta}</div>}
      </div>
      {actions && <div className="admin-page-header__actions">{actions}</div>}
    </header>
  );
}

export function DataToolbar({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={joinClasses("admin-data-toolbar", className)} {...props}>
      {children}
    </div>
  );
}

type SectionCardProps = HTMLAttributes<HTMLElement> & {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  ...props
}: SectionCardProps) {
  return (
    <section className={joinClasses("admin-section-card", className)} {...props}>
      {(title || description || actions) && (
        <div className="admin-section-card__header">
          <div>
            {title && <h2>{title}</h2>}
            {description && (
              <p className="admin-section-card__description">{description}</p>
            )}
          </div>
          {actions && (
            <div className="admin-section-card__actions">{actions}</div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export const FormSection = SectionCard;

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  tone?: "default" | "error";
  compact?: boolean;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  tone = "default",
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={joinClasses(
        "admin-empty-state",
        tone === "error" && "admin-empty-state--error",
        compact && "admin-empty-state--compact",
        className,
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      {icon && <div className="admin-empty-state__icon">{icon}</div>}
      <h3 className="admin-empty-state__title">{title}</h3>
      {description && (
        <p className="admin-empty-state__description">{description}</p>
      )}
      {action && <div className="admin-empty-state__action">{action}</div>}
    </div>
  );
}

type StatusBadgeProps = {
  children: ReactNode;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  className?: string;
};

export function StatusBadge({
  children,
  tone = "neutral",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={joinClasses(
        "admin-status-badge",
        `admin-status-badge--${tone}`,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AdminLoadingState({
  label = "Đang tải dữ liệu…",
  rows = 4,
}: {
  label?: string;
  rows?: number;
}) {
  return (
    <div className="admin-loading-state" role="status" aria-live="polite">
      <span className="admin-loading-state__label">{label}</span>
      <div className="admin-loading-state__rows" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <span
            key={index}
            className="admin-loading-state__row"
            style={{ width: `${100 - (index % 3) * 11}%` }}
          />
        ))}
      </div>
    </div>
  );
}


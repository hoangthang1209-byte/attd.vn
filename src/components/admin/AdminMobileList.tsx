import type { HTMLAttributes, KeyboardEvent, MouseEvent, ReactNode } from "react";
import Link from "next/link";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type AdminListCardField = {
  label: string;
  value: ReactNode;
};

type AdminListCardProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  fields?: AdminListCardField[];
  actions?: ReactNode;
  media?: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  "aria-label"?: string;
};

function handleCardKeyDown(
  event: KeyboardEvent<HTMLElement>,
  onActivate?: () => void,
) {
  if (!onActivate) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onActivate();
  }
}

export function AdminListCard({
  title,
  subtitle,
  badges,
  fields,
  actions,
  media,
  onClick,
  href,
  className,
  "aria-label": ariaLabel,
}: AdminListCardProps) {
  const interactive = Boolean(onClick || href);
  const activate = onClick;

  const body = (
    <>
      <div className="admin-list-card__head">
        {media && <div className="admin-list-card__media">{media}</div>}
        <div className="admin-list-card__title-block">
          <div className="admin-list-card__title">{title}</div>
          {subtitle && <div className="admin-list-card__subtitle">{subtitle}</div>}
          {badges && <div className="admin-list-card__badges">{badges}</div>}
        </div>
      </div>
      {fields && fields.length > 0 && (
        <dl className="admin-list-card__fields">
          {fields.map((field) => (
            <div key={field.label} className="admin-list-card__field">
              <dt>{field.label}</dt>
              <dd>{field.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {actions && <div className="admin-list-card__actions">{actions}</div>}
    </>
  );

  const cardClass = joinClasses(
    "admin-list-card",
    interactive && "admin-list-card--interactive",
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cardClass}
        aria-label={ariaLabel}
        onClick={(event: MouseEvent<HTMLAnchorElement>) => {
          if (onClick) {
            event.preventDefault();
            onClick();
          }
        }}
      >
        {body}
      </Link>
    );
  }

  if (onClick) {
    return (
      <article
        className={cardClass}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        onClick={onClick}
        onKeyDown={(event) => handleCardKeyDown(event, activate)}
      >
        {body}
      </article>
    );
  }

  return <article className={cardClass}>{body}</article>;
}

type AdminResponsiveListProps = HTMLAttributes<HTMLDivElement> & {
  desktop: ReactNode;
  mobile: ReactNode;
};

/**
 * Renders a desktop table (or list) and a mobile card stack from the same data.
 * Visibility is controlled via CSS — no viewport JS branching.
 */
export function AdminResponsiveList({
  desktop,
  mobile,
  className,
  ...props
}: AdminResponsiveListProps) {
  return (
    <div className={joinClasses("admin-responsive-list", className)} {...props}>
      <div className="admin-responsive-list__desktop">{desktop}</div>
      <div className="admin-responsive-list__mobile">{mobile}</div>
    </div>
  );
}

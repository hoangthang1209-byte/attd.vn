import Link from "next/link";

type PortalActionCardProps = {
  title: string;
  description: string;
  href?: string;
  disabled?: boolean;
};

export default function PortalActionCard({
  title,
  description,
  href,
  disabled,
}: PortalActionCardProps) {
  const className = `portal-action-card${disabled ? " portal-action-card--disabled" : ""}`;

  if (!href || disabled) {
    return (
      <div className={className} aria-disabled={disabled}>
        <h3 className="portal-action-card__title">{title}</h3>
        <p className="portal-action-card__desc">{description}</p>
      </div>
    );
  }

  return (
    <Link href={href} className={className}>
      <h3 className="portal-action-card__title">{title}</h3>
      <p className="portal-action-card__desc">{description}</p>
    </Link>
  );
}

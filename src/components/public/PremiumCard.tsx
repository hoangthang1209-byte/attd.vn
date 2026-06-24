import Link from "next/link";
import type { ReactNode } from "react";

type PremiumCardProps = {
  href?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  interactive?: boolean;
  className?: string;
};

export default function PremiumCard({
  href,
  title,
  description,
  icon,
  interactive = true,
  className = "",
}: PremiumCardProps) {
  const cardClass = interactive ? "premium-card" : "premium-card-static";
  const content = (
    <>
      {icon && (
        <div className="premium-card__icon">
          {icon}
        </div>
      )}
      <div className={`premium-card__title${description ? " has-description" : ""}`}>
        {title}
      </div>
      {description && (
        <div className="premium-card__description">
          {description}
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${cardClass} ${className}`}>
        {content}
      </Link>
    );
  }

  return <div className={`${cardClass} ${className}`}>{content}</div>;
}

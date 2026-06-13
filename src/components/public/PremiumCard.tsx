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
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
            color: "#111827",
          }}
        >
          {icon}
        </div>
      )}
      <div
        style={{
          fontWeight: 600,
          fontSize: "16px",
          color: "#111827",
          marginBottom: description ? 8 : 0,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </div>
      {description && (
        <div style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.65 }}>
          {description}
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${cardClass} ${className}`} style={{ color: "inherit" }}>
        {content}
      </Link>
    );
  }

  return <div className={`${cardClass} ${className}`}>{content}</div>;
}

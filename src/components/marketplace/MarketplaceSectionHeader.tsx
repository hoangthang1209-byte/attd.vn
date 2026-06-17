import Link from "next/link";

type MarketplaceSectionHeaderProps = {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  align?: "left" | "center";
};

export default function MarketplaceSectionHeader({
  title,
  description,
  actionHref,
  actionLabel,
  align = "left",
}: MarketplaceSectionHeaderProps) {
  return (
    <div className={`mp-section-header mp-section-header--${align}`}>
      <div className="mp-section-header-copy">
        <h2 className="mp-section-title">{title}</h2>
        {description && <p className="mp-section-desc">{description}</p>}
      </div>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="mp-section-action">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

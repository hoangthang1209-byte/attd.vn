import { COMPANY_FACTS } from "@/lib/company-trust";
import { Building2, Factory, Package, Timer } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const FACT_ICONS: Record<string, LucideIcon> = {
  experience: Timer,
  oem: Package,
  showroom: Building2,
  manufacturing: Factory,
};

type Props = {
  title?: string;
  description?: string;
  className?: string;
  variant?: "default" | "compact";
};

export default function CompanyFacts({
  title = "ATTD trong thực tế",
  description = "Những điểm cốt lõi giúp đối tác B2B đánh giá năng lực công ty trước khi hợp tác.",
  className,
  variant = "default",
}: Props) {
  if (COMPANY_FACTS.length === 0) return null;

  const classes = [
    "company-facts",
    variant === "compact" ? "company-facts--compact" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes} aria-label={title}>
      <div className="container">
        <div className="company-facts__header">
          <p className="company-facts__eyebrow">Thông tin công ty</p>
          <h2 className="company-facts__title">{title}</h2>
          {description ? <p className="company-facts__description">{description}</p> : null}
        </div>

        <div className="company-facts__grid">
          {COMPANY_FACTS.map((fact) => {
            const Icon = FACT_ICONS[fact.id] ?? Building2;
            return (
              <article key={fact.id} className="company-facts__card">
                <span className="company-facts__icon" aria-hidden>
                  <Icon size={20} />
                </span>
                <h3 className="company-facts__card-title">{fact.title}</h3>
                <p className="company-facts__card-desc">{fact.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

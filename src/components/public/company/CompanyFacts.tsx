import { COMPANY_FACTS } from "@/lib/company-trust";
import type {
  HomepageCompanyRealityConfig,
  HomepageCompanyRealityItemConfig,
} from "@/features/home/homepage.types";
import { Building2, Factory, Package, Settings, Timer, Truck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const FACT_ICONS: Record<string, LucideIcon> = {
  experience: Timer,
  oem: Package,
  showroom: Building2,
  manufacturing: Factory,
  TIMER: Timer,
  PACKAGE: Package,
  BUILDING: Building2,
  FACTORY: Factory,
  SETTINGS: Settings,
  USERS: Users,
  TRUCK: Truck,
};

function selectPublicCmsFacts(
  cms: HomepageCompanyRealityConfig | undefined,
): HomepageCompanyRealityItemConfig[] | null {
  if (!cms?.enabled) return null;
  const active = cms.items
    .filter((item) => item.active && item.title.trim() && item.description.trim())
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.sortOrder - b.sortOrder || a.itemKey.localeCompare(b.itemKey);
    });
  if (active.length === 0) return null;

  const featured = active.find((item) => item.featured) ?? active[0];
  if (!featured) return null;
  const supporting = active
    .filter((item) => item.itemKey !== featured.itemKey)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.itemKey.localeCompare(b.itemKey))
    .slice(0, 3);
  return [{ ...featured, featured: true }, ...supporting.map((item) => ({ ...item, featured: false }))];
}

type Props = {
  title?: string;
  description?: string;
  className?: string;
  variant?: "default" | "compact";
  cms?: HomepageCompanyRealityConfig;
};

export default function CompanyFacts({
  title = "ATTD trong thực tế",
  description = "Những điểm cốt lõi giúp đối tác B2B đánh giá năng lực công ty trước khi hợp tác.",
  className,
  variant = "default",
  cms,
}: Props) {
  const cmsFacts = selectPublicCmsFacts(cms);
  const facts = cmsFacts ?? COMPANY_FACTS;

  if (cms?.enabled === false || facts.length === 0) return null;

  const classes = [
    "company-facts",
    variant === "compact" ? "company-facts--compact" : null,
    cms?.layout === "FEATURED_PLUS_SUPPORTING" ? "company-facts--editorial" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes} aria-label={cms?.title ?? title}>
      <div className="container">
        <div className="company-facts__header">
          <p className="company-facts__eyebrow">{cms?.eyebrow ?? "Thông tin công ty"}</p>
          <h2 className="company-facts__title">{cms?.title ?? title}</h2>
          {cms?.description || description ? (
            <p className="company-facts__description">{cms?.description ?? description}</p>
          ) : null}
        </div>

        <div className="company-facts__grid">
          {facts.map((fact, index) => {
            const Icon = FACT_ICONS["iconKey" in fact ? fact.iconKey : fact.id] ?? Building2;
            return (
              <article
                key={"itemKey" in fact ? fact.itemKey : fact.id}
                className={`company-facts__card${"featured" in fact && fact.featured ? " company-facts__card--featured" : ""}`}
              >
                <span className="company-facts__icon" aria-hidden>
                  <Icon size={20} />
                </span>
                <h3 className="company-facts__card-title">{fact.title}</h3>
                <p className="company-facts__card-desc">{fact.description}</p>
                {"featured" in fact && fact.featured && index === 0 ? (
                  <span className="company-facts__meta">Năng lực cốt lõi</span>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

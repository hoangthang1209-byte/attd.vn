import { getTrustMetricsSettings } from "@/features/settings/services/settings.service";
import { getVisibleTrustMetricsFromData } from "@/lib/trustData";
import TrustStatisticCard from "@/components/public/company/TrustStatisticCard";

type Props = {
  className?: string;
};

/**
 * Renders configured trust metrics from company settings.
 * Returns null when no verified metrics are configured in the database.
 */
export default async function CompanyTrustMetrics({ className }: Props) {
  const settings = await getTrustMetricsSettings();
  const metrics = getVisibleTrustMetricsFromData(settings).filter(
    (metric) => Boolean(metric.value?.trim()) && Boolean(metric.label?.trim()),
  );

  if (metrics.length === 0) return null;

  const classes = ["company-trust-metrics", "section-compact", "section-alt", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes} aria-label={settings.sectionTitle}>
      <div className="container">
        <h2 className="section-title section-title--center">{settings.sectionTitle}</h2>
        <div className="social-proof-grid">
          {metrics.map((metric) => (
            <TrustStatisticCard key={metric.key} value={metric.value} label={metric.label} />
          ))}
        </div>
      </div>
    </section>
  );
}

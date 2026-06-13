import { getTrustMetricsSettings } from "@/features/settings/services/settings.service";
import { getVisibleTrustMetricsFromData } from "@/lib/trustData";

export default async function SocialProofSection() {
  const settings = await getTrustMetricsSettings();
  const metrics = getVisibleTrustMetricsFromData(settings);

  if (metrics.length === 0) return null;

  return (
    <section className="section-compact section-alt">
      <div className="container">
        <h2 className="section-title section-title--center">
          {settings.sectionTitle}
        </h2>
        <div className="social-proof-grid">
          {metrics.map((metric) => (
            <div key={metric.key} className="social-proof-card">
              <div className="social-proof-value">{metric.value}</div>
              <div className="social-proof-label">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

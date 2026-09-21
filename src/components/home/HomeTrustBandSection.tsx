import CustomerLogoStrip from "@/components/public/company/CustomerLogoStrip";
import CompanyTrustMetrics from "@/components/public/company/CompanyTrustMetrics";
import { getVisibleClientLogosFromDb } from "@/features/client-logos/services/client-logo.service";
import { getTrustMetricsSettings } from "@/features/settings/services/settings.service";
import { getVisibleTrustMetricsFromData } from "@/lib/trustData";
import { isValidImageSrc } from "@/lib/imagePaths";

/**
 * Consolidates customer logos and trust metrics into one visual band
 * so proof appears earlier without repeating section chrome.
 */
export default async function HomeTrustBandSection() {
  const [logos, settings] = await Promise.all([
    getVisibleClientLogosFromDb(),
    getTrustMetricsSettings(),
  ]);

  const visibleLogos = logos.filter((client) => isValidImageSrc(client.imageSrc));
  const visibleMetrics = getVisibleTrustMetricsFromData(settings).filter(
    (metric) => Boolean(metric.value?.trim()) && Boolean(metric.label?.trim()),
  );

  if (visibleLogos.length === 0 && visibleMetrics.length === 0) {
    return null;
  }

  return (
    <section className="home-trust-band" aria-label="Bằng chứng tin cậy">
      <div className="container">
        <header className="home-trust-band__header">
          <p className="home-trust-band__eyebrow">Được tin tưởng bởi doanh nghiệp</p>
          <h2 className="home-trust-band__title">Năng lực cung ứng đã được kiểm chứng</h2>
        </header>
      </div>
      {visibleLogos.length > 0 ? (
        <CustomerLogoStrip variant="strip" className="home-trust-band__logos" />
      ) : null}
      {visibleMetrics.length > 0 ? (
        <CompanyTrustMetrics className="home-trust-band__metrics" />
      ) : null}
    </section>
  );
}

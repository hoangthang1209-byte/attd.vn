import type { SeoInternalLinkCoverage as SeoInternalLinkCoverageData } from "@/features/blog/seo-planning-types";

type SeoInternalLinkCoverageProps = {
  coverage: SeoInternalLinkCoverageData;
};

export default function SeoInternalLinkCoverage({ coverage }: SeoInternalLinkCoverageProps) {
  return (
    <div className="admin-seo-link-coverage">
      <div className="admin-seo-link-pillar">
        <p className="admin-field-hint">Pillar</p>
        <strong>{coverage.pillarTitle}</strong>
      </div>

      <ul className="admin-seo-link-list">
        {coverage.items.map((item) => (
          <li key={item.articleId} className="admin-seo-link-item">
            <div className="admin-seo-link-item-main">
              <strong>{item.title}</strong>
              {item.linksToPillar ? (
                <span className="admin-seo-plan-match admin-seo-plan-match--ok">→ Pillar</span>
              ) : (
                <span className="admin-seo-plan-match admin-seo-plan-match--missing">
                  Missing link to pillar
                </span>
              )}
              {item.linkTargets.length > 1 && (
                <p className="admin-field-hint">
                  Also links: {item.linkTargets.filter((t) => t.title !== coverage.pillarTitle).map((t) => t.title).join(", ")}
                </p>
              )}
            </div>
            {item.warnings.length > 0 && (
              <ul className="admin-seo-link-warnings">
                {item.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      {coverage.warnings.length > 0 && (
        <div className="admin-seo-link-global-warnings">
          <p className="admin-field-hint">Warnings</p>
          <ul>
            {coverage.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

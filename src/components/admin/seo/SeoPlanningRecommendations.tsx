import Link from "next/link";
import type { SeoCampaign, SeoPlanningRecommendation } from "@/features/blog/seo-planning-types";
import { buildSeoPlanningHandoffUrl } from "@/features/blog/seo-planning";

type SeoPlanningRecommendationsProps = {
  recommendations: SeoPlanningRecommendation[];
  campaign: SeoCampaign;
};

function severityClass(severity: SeoPlanningRecommendation["severity"]): string {
  if (severity === "high") return "admin-seo-rec--high";
  if (severity === "medium") return "admin-seo-rec--medium";
  return "admin-seo-rec--low";
}

export default function SeoPlanningRecommendations({
  recommendations,
  campaign,
}: SeoPlanningRecommendationsProps) {
  if (recommendations.length === 0) {
    return <p className="admin-field-hint">Không có gợi ý bổ sung — cụm nội dung đang ổn định.</p>;
  }

  return (
    <ul className="admin-seo-recommendations">
      {recommendations.map((rec) => {
        const relatedItem = rec.relatedItemId
          ? campaign.items.find((item) => item.id === rec.relatedItemId)
          : undefined;

        return (
          <li key={rec.id} className={`admin-seo-rec ${severityClass(rec.severity)}`}>
            <p>{rec.message}</p>
            {relatedItem && !relatedItem.matchedPost && (
              <Link
                href={buildSeoPlanningHandoffUrl(relatedItem, campaign)}
                className="admin-btn admin-btn--secondary admin-btn--small"
              >
                Tạo bài viết
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

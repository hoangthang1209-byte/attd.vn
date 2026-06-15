"use client";

type Props = {
  relatedProductIds: string[];
  relatedLandingPageSlugs: string[];
  relatedBlogPostIds: string[];
  onChange: (value: {
    relatedProductIds: string[];
    relatedLandingPageSlugs: string[];
    relatedBlogPostIds: string[];
  }) => void;
};

function parseLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function KnowledgeBaseRelatedItemsPicker({
  relatedProductIds,
  relatedLandingPageSlugs,
  relatedBlogPostIds,
  onChange,
}: Props) {
  return (
    <div className="admin-kb-related">
      <div className="admin-field">
        <label className="admin-label">Sản phẩm liên quan (ID, mỗi dòng một ID)</label>
        <textarea
          className="admin-textarea"
          rows={3}
          value={relatedProductIds.join("\n")}
          onChange={(e) =>
            onChange({
              relatedProductIds: parseLines(e.target.value),
              relatedLandingPageSlugs,
              relatedBlogPostIds,
            })
          }
        />
      </div>
      <div className="admin-field">
        <label className="admin-label">Landing page liên quan (slug)</label>
        <textarea
          className="admin-textarea"
          rows={3}
          value={relatedLandingPageSlugs.join("\n")}
          onChange={(e) =>
            onChange({
              relatedProductIds,
              relatedLandingPageSlugs: parseLines(e.target.value),
              relatedBlogPostIds,
            })
          }
        />
      </div>
      <div className="admin-field">
        <label className="admin-label">Blog post liên quan (ID)</label>
        <textarea
          className="admin-textarea"
          rows={3}
          value={relatedBlogPostIds.join("\n")}
          onChange={(e) =>
            onChange({
              relatedProductIds,
              relatedLandingPageSlugs,
              relatedBlogPostIds: parseLines(e.target.value),
            })
          }
        />
      </div>
    </div>
  );
}

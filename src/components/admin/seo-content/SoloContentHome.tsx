"use client";

import Link from "next/link";

/**
 * Sprint 19.0 — Solo Founder home. Static shape of the "calm" Content home:
 * at most 7 cards, each one click away from the underlying workspace
 * (topic / media / knowledge / publishing). Kept as a plain data array so
 * the card budget and hrefs are a source-level contract, independent from
 * whatever copy/description is filled in at render time.
 */
export type SoloHomeCardKey =
  | "continue-writing"
  | "recent-drafts"
  | "recently-published"
  | "generate-topic"
  | "refresh-article"
  | "media-library"
  | "knowledge-library";

export const SOLO_HOME_CARD_DEFINITIONS: ReadonlyArray<{
  key: SoloHomeCardKey;
  title: string;
  fallbackHref: string;
  cta: string;
}> = [
  { key: "continue-writing", title: "Tiếp tục viết", fallbackHref: "/admin/content/seo-topics?view=drafting", cta: "Mở bài viết" },
  { key: "recent-drafts", title: "Bản nháp gần đây", fallbackHref: "/admin/content/seo-topics?view=drafting", cta: "Xem bản nháp" },
  { key: "recently-published", title: "Đã xuất bản gần đây", fallbackHref: "/admin/content/publishing", cta: "Xem xuất bản" },
  { key: "generate-topic", title: "Tạo chủ đề mới", fallbackHref: "/admin/content/seo-topics", cta: "Tạo chủ đề" },
  { key: "refresh-article", title: "Làm mới bài viết", fallbackHref: "/admin/content/seo-topics?view=missing-media", cta: "Xem bài cần làm mới" },
  { key: "media-library", title: "Thư viện Media", fallbackHref: "/admin/media", cta: "Mở Media" },
  { key: "knowledge-library", title: "Thư viện Knowledge", fallbackHref: "/admin/knowledge-base", cta: "Mở Knowledge" },
];

export type SoloContentHomeProps = {
  continueTopic: { id: string; title: string } | null;
  draftingCount: number;
  recentlyPublishedCount: number;
  recentlyPublishedTitles: string[];
  missingMediaCount: number;
};

/**
 * Max-7-card, calm Content home for Solo mode. Every card is a plain link —
 * no new fetches, no BI charts, no workload panels. Data comes from the
 * same dashboard summary `SeoDashboardClient` already loads.
 */
export default function SoloContentHome({
  continueTopic,
  draftingCount,
  recentlyPublishedCount,
  recentlyPublishedTitles,
  missingMediaCount,
}: SoloContentHomeProps) {
  const cardContent: Record<SoloHomeCardKey, { description: string; href: string }> = {
    "continue-writing": continueTopic
      ? { description: continueTopic.title, href: `/admin/content/topics/${continueTopic.id}` }
      : { description: "Chưa có bài đang viết dở.", href: "/admin/content/seo-topics?view=drafting" },
    "recent-drafts": {
      description: draftingCount > 0 ? `${draftingCount} bản nháp đang chờ viết tiếp.` : "Không có bản nháp nào.",
      href: "/admin/content/seo-topics?view=drafting",
    },
    "recently-published": {
      description:
        recentlyPublishedCount > 0
          ? `${recentlyPublishedCount} bài vừa đăng${recentlyPublishedTitles[0] ? `: ${recentlyPublishedTitles[0]}` : ""}`
          : "Chưa có bài xuất bản gần đây.",
      href: "/admin/content/publishing",
    },
    "generate-topic": {
      description: "Bắt đầu một chủ đề mới cho bài viết tiếp theo.",
      href: "/admin/content/seo-topics",
    },
    "refresh-article": {
      description:
        missingMediaCount > 0 ? `${missingMediaCount} bài thiếu hình cần làm mới.` : "Cập nhật bài cũ cần refresh.",
      href: "/admin/content/seo-topics?view=missing-media",
    },
    "media-library": {
      description: "Quản lý ảnh và tài sản dùng cho bài viết.",
      href: "/admin/media",
    },
    "knowledge-library": {
      description: "Tra cứu kiến thức nội bộ hỗ trợ viết bài.",
      href: "/admin/knowledge-base",
    },
  };

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {SOLO_HOME_CARD_DEFINITIONS.map((card) => {
          const content = cardContent[card.key];
          const href = content.href || card.fallbackHref;
          return (
            <Link
              key={card.key}
              href={href}
              className="admin-sidebar-card"
              style={{
                margin: 0,
                textDecoration: "none",
                display: "grid",
                gap: 6,
                border: "1px solid #f1f5f9",
                boxShadow: "none",
              }}
            >
              <h3 className="admin-sidebar-title" style={{ margin: 0 }}>
                {card.title}
              </h3>
              <p className="admin-field-hint" style={{ margin: 0 }}>
                {content.description}
              </p>
              <span className="admin-link">{card.cta} →</span>
            </Link>
          );
        })}
      </div>

      <p className="admin-field-hint" style={{ marginTop: 18 }}>
        Nâng cao → <Link href="/admin/content/operations" className="admin-link">Trung tâm vận hành</Link>
      </p>
    </div>
  );
}

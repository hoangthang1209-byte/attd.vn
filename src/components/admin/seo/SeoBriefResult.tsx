"use client";

import Link from "next/link";
import type { SeoBrief, SeoBriefMetadata } from "@/features/seo/seo-brief-types";
import { SEARCH_INTENT_LABELS } from "@/features/seo/seo-brief-types";

type Props = {
  brief: SeoBrief;
  metadata: SeoBriefMetadata;
  prompt: string;
  onUseForArticle: () => void;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="admin-seo-brief-section">
      <h3 className="admin-seo-brief-section-title">{title}</h3>
      {children}
    </section>
  );
}

function Tag({ label }: { label: string }) {
  return <span className="admin-kb-tag">{label}</span>;
}

export default function SeoBriefResult({ brief, metadata, prompt, onUseForArticle }: Props) {
  async function copyBrief() {
    const text = formatBriefAsText(brief, metadata);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      /* ignore */
    }
  }

  const articleUrl = buildArticleUrl(brief);

  return (
    <div className="admin-seo-brief-result">
      {/* Action bar */}
      <div className="admin-seo-brief-actions">
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          onClick={onUseForArticle}
        >
          Dùng brief để tạo bài viết
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          onClick={() => void copyBrief()}
        >
          Sao chép brief
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--small"
          onClick={() => void copyPrompt()}
        >
          Copy prompt AI
        </button>
        <Link
          href={articleUrl}
          className="admin-btn admin-btn--secondary admin-btn--small"
          target="_blank"
        >
          Tạo bài viết →
        </Link>
      </div>

      {/* Overview */}
      <Section title="Tổng quan SEO">
        <div className="admin-seo-brief-overview-grid">
          <div>
            <p className="admin-field-hint">Từ khóa chính</p>
            <strong>{brief.targetKeyword}</strong>
          </div>
          <div>
            <p className="admin-field-hint">Search intent</p>
            <strong>{SEARCH_INTENT_LABELS[brief.searchIntent]}</strong>
          </div>
          <div>
            <p className="admin-field-hint">Từ khóa phụ</p>
            <div className="admin-kb-tags">
              {brief.secondaryKeywords.map((k) => <Tag key={k} label={k} />)}
            </div>
          </div>
          <div>
            <p className="admin-field-hint">Độ dài ước tính</p>
            <strong>{brief.estimatedWordCount?.toLocaleString("vi-VN") ?? "~1.800"} từ</strong>
          </div>
        </div>
        <div className="admin-field" style={{ marginTop: 10 }}>
          <p className="admin-field-hint">Đối tượng đọc</p>
          <p>{brief.audience}</p>
        </div>
        <div className="admin-field" style={{ marginTop: 8 }}>
          <p className="admin-field-hint">Mục tiêu nội dung</p>
          <p>{brief.contentGoal}</p>
        </div>
      </Section>

      {/* Content angle */}
      <Section title="Góc tiếp cận nội dung">
        <p>{brief.contentAngle}</p>
      </Section>

      {/* Title */}
      <Section title="Tiêu đề đề xuất">
        <p className="admin-seo-brief-title-main">{brief.recommendedTitle}</p>
      </Section>

      {/* Meta titles */}
      <Section title="Meta title">
        <ul className="admin-seo-brief-list">
          {brief.metaTitleIdeas.map((t, i) => (
            <li key={i}>
              <span className={`admin-seo-brief-char-count ${t.length > 60 ? "is-over" : ""}`}>
                {t.length}
              </span>
              {t}
            </li>
          ))}
        </ul>
      </Section>

      {/* Meta descriptions */}
      <Section title="Meta description">
        <ul className="admin-seo-brief-list">
          {brief.metaDescriptionIdeas.map((d, i) => (
            <li key={i}>
              <span className={`admin-seo-brief-char-count ${d.length > 160 ? "is-over" : ""}`}>
                {d.length}
              </span>
              {d}
            </li>
          ))}
        </ul>
      </Section>

      {/* Outline */}
      <Section title="Dàn ý H2/H3">
        <ol className="admin-seo-brief-outline">
          {brief.outline.map((item, i) => (
            <li key={i} className={`admin-seo-brief-outline-item admin-seo-brief-outline--${item.level.toLowerCase()}`}>
              <span className="admin-seo-brief-outline-level">{item.level}</span>
              <span className="admin-seo-brief-outline-heading">{item.heading}</span>
              {item.notes && (
                <span className="admin-seo-brief-outline-notes">{item.notes}</span>
              )}
            </li>
          ))}
        </ol>
      </Section>

      {/* FAQ */}
      <Section title="FAQ">
        <ul className="admin-seo-brief-faq-list">
          {brief.faq.map((faq, i) => (
            <li key={i} className="admin-seo-brief-faq-item">
              <p className="admin-seo-brief-faq-q">{faq.question}</p>
              <p className="admin-seo-brief-faq-a">{faq.answerDirection}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Internal links */}
      <Section title="Internal link gợi ý">
        <ul className="admin-seo-brief-list">
          {brief.internalLinkSuggestions.map((link, i) => (
            <li key={i}>
              <strong>{link.anchorText}</strong>
              {link.targetUrl && <span className="admin-field-hint"> → {link.targetUrl}</span>}
              {link.reason && <span className="admin-field-hint"> — {link.reason}</span>}
            </li>
          ))}
        </ul>
      </Section>

      {/* CTA */}
      <Section title="CTA gợi ý">
        <ul className="admin-seo-brief-list">
          {brief.ctaSuggestions.map((cta, i) => (
            <li key={i}>{cta}</li>
          ))}
        </ul>
      </Section>

      {/* KB facts */}
      <Section title="Dữ kiện Knowledge Base cần dùng">
        {brief.requiredKnowledgeFacts.length === 0 ? (
          <p className="admin-field-hint">Không có dữ liệu Knowledge Base được chọn.</p>
        ) : (
          <ul className="admin-seo-brief-facts-list">
            {brief.requiredKnowledgeFacts.map((fact, i) => (
              <li key={i} className="admin-seo-brief-fact-item">
                <p className="admin-seo-brief-fact-title">{fact.title}</p>
                <p className="admin-seo-brief-fact-body">{fact.fact}</p>
                {fact.entryId && (
                  <Link
                    href={`/admin/knowledge-base/${fact.entryId}`}
                    className="admin-field-hint admin-link"
                    target="_blank"
                  >
                    Xem KB entry →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Warnings */}
      {brief.contentWarnings && brief.contentWarnings.length > 0 && (
        <Section title="Cảnh báo nội dung">
          <ul className="admin-kb-warning-list">
            {brief.contentWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Metadata audit */}
      <details className="admin-seo-brief-metadata">
        <summary>Thông tin audit</summary>
        <div className="admin-seo-brief-metadata-body">
          <p>
            <strong>Điểm sẵn sàng KB trung bình:</strong>{" "}
            {metadata.knowledgeReadinessAverage}/100
          </p>
          <p>
            <strong>Số KB entry đã dùng:</strong> {metadata.usedKnowledgeEntryIds.length}
          </p>
          <p>
            <strong>Tạo lúc:</strong>{" "}
            {new Date(metadata.generatedAt).toLocaleString("vi-VN")}
          </p>
          {metadata.knowledgeWarnings.length > 0 && (
            <ul className="admin-kb-warning-list">
              {metadata.knowledgeWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </div>
  );
}

function buildArticleUrl(brief: SeoBrief): string {
  const params = new URLSearchParams({
    keyword: brief.targetKeyword,
    goal: "seo-traffic",
    blueprint: "source-supplier",
    source: "seo-brief",
  });
  return `/admin/blog/new?${params.toString()}`;
}

function formatBriefAsText(brief: SeoBrief, metadata: SeoBriefMetadata): string {
  const lines: string[] = [
    `=== SEO BRIEF: ${brief.targetKeyword} ===`,
    `Tạo lúc: ${new Date(metadata.generatedAt).toLocaleString("vi-VN")}`,
    "",
    `TỔNG QUAN`,
    `Search intent: ${SEARCH_INTENT_LABELS[brief.searchIntent]}`,
    `Đối tượng: ${brief.audience}`,
    `Mục tiêu: ${brief.contentGoal}`,
    `Độ dài ước tính: ${brief.estimatedWordCount ?? 1800} từ`,
    "",
    `GÓC TIẾP CẬN`,
    brief.contentAngle,
    "",
    `TIÊU ĐỀ ĐỀ XUẤT`,
    brief.recommendedTitle,
    "",
    `META TITLE`,
    ...brief.metaTitleIdeas.map((t, i) => `${i + 1}. ${t}`),
    "",
    `META DESCRIPTION`,
    ...brief.metaDescriptionIdeas.map((d, i) => `${i + 1}. ${d}`),
    "",
    `DÀN Ý`,
    ...brief.outline.map((item) => `${item.level}: ${item.heading}${item.notes ? ` — ${item.notes}` : ""}`),
    "",
    `FAQ`,
    ...brief.faq.flatMap((f) => [`Q: ${f.question}`, `Hướng trả lời: ${f.answerDirection}`, ""]),
    `CTA GỢI Ý`,
    ...brief.ctaSuggestions.map((c) => `- ${c}`),
    "",
    `INTERNAL LINKS`,
    ...brief.internalLinkSuggestions.map(
      (l) => `- ${l.anchorText}${l.targetUrl ? ` → ${l.targetUrl}` : ""}${l.reason ? ` (${l.reason})` : ""}`
    ),
    "",
    `DỮ KIỆN KB CẦN DÙNG`,
    ...brief.requiredKnowledgeFacts.map((f) => `- ${f.title}: ${f.fact}`),
  ];

  if (brief.contentWarnings?.length) {
    lines.push("", `CẢNH BÁO`, ...brief.contentWarnings.map((w) => `- ${w}`));
  }

  return lines.join("\n");
}

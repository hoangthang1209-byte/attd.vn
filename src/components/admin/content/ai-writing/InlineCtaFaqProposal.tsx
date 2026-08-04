"use client";

import styles from "@/components/admin/content/ai-writing/AiWriting.module.css";
import type { CtaResult, FaqResult } from "@/features/content-generation/contracts/generation.types";

type Props =
  | { kind: "cta"; data: CtaResult; onApply: () => void; busy?: boolean }
  | { kind: "faq"; data: FaqResult; onApply: () => void; busy?: boolean };

/** Preview-only CTA/FAQ proposal with a single Apply callback (parent decides how/where it's recorded). */
export default function InlineCtaFaqProposal(props: Props) {
  if (props.kind === "cta") {
    const { data, onApply, busy } = props;
    return (
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{data.ctaText}</p>
        <p className="admin-field-hint" style={{ margin: "2px 0" }}>
          {data.ctaType} {data.destination ? `→ ${data.destination}` : ""}
        </p>
        <div className={styles.panelActions}>
          <button type="button" className="admin-btn admin-btn--primary admin-btn--small" disabled={busy} onClick={onApply}>
            Apply
          </button>
        </div>
      </div>
    );
  }

  const { data, onApply, busy } = props;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.items.map((item, idx) => (
        <div key={idx} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{item.question}</p>
          <div className="admin-field-hint" style={{ margin: "2px 0" }} dangerouslySetInnerHTML={{ __html: item.answerHtml }} />
        </div>
      ))}
      <div className={styles.panelActions}>
        <button type="button" className="admin-btn admin-btn--primary admin-btn--small" disabled={busy} onClick={onApply}>
          Apply
        </button>
      </div>
    </div>
  );
}

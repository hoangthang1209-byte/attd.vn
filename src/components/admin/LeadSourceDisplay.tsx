import { getLeadSourceLabel } from "@/features/crm/labels";
import type { CrmLeadRecord } from "@/features/crm/types";

function getSecondaryLines(lead: CrmLeadRecord): string[] {
  const lines: string[] = [];

  if (lead.landingPage?.trim()) {
    lines.push(lead.landingPage.trim());
  }

  if (lead.utmSource?.trim()) {
    const utm = lead.utmMedium?.trim()
      ? `${lead.utmSource.trim()} / ${lead.utmMedium.trim()}`
      : lead.utmSource.trim();
    lines.push(utm);
  } else if (lead.referrer?.trim()) {
    try {
      const host = new URL(lead.referrer).hostname.replace(/^www\./, "");
      lines.push(host || "referral");
    } catch {
      lines.push("referral");
    }
  }

  if (lead.utmCampaign?.trim()) {
    lines.push(lead.utmCampaign.trim());
  }

  if (lines.length === 0 && lead.source === "CONTACT") {
    lines.push("Direct");
  }

  return lines;
}

export default function LeadSourceDisplay({ lead }: { lead: CrmLeadRecord }) {
  const secondary = getSecondaryLines(lead);

  return (
    <div className="admin-lead-source">
      <span className="admin-lead-source__primary">{getLeadSourceLabel(lead.source)}</span>
      {secondary.map((line) => (
        <span key={line} className="admin-lead-source__secondary">
          {line}
        </span>
      ))}
    </div>
  );
}

/**
 * Sprint 18.0 — pure staleness gate for section-proposal apply. Extracted
 * from applySectionProposalAdapter (proposal.wiring.ts) so the two checks
 * (draft-created-at-time-of-generation, and the finer-grained text
 * selection anchor) are unit-testable without a database.
 */

import { ContentGenerationError } from "@/features/content-generation/contracts/generation.types";

export type StaleCheckInputSummary = {
  draftVersionAtCreation?: number | null;
  selection?: { draftVersion?: number | null } | null;
};

/**
 * Throws GENERATION_STALE when the current draft version no longer matches
 * either the version captured at proposal-creation time, or (finer-grained)
 * the version the editor's original text selection was taken from. Never
 * silently applies a proposal onto content that moved since it was
 * generated.
 */
export function assertSelectionNotStale(inputSummary: StaleCheckInputSummary, currentDraftVersion: number): void {
  if (inputSummary.draftVersionAtCreation != null && inputSummary.draftVersionAtCreation !== currentDraftVersion) {
    throw new ContentGenerationError(
      "Bản nháp đã thay đổi kể từ khi tạo đề xuất — cần tạo lại đề xuất mới.",
      "GENERATION_STALE",
    );
  }

  if (inputSummary.selection?.draftVersion != null && inputSummary.selection.draftVersion !== currentDraftVersion) {
    throw new ContentGenerationError(
      "Vùng chọn văn bản đã lỗi thời so với bản nháp hiện tại — cần tạo lại đề xuất mới.",
      "GENERATION_STALE",
    );
  }
}

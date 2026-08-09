/**
 * Sprint 16.1 — maps the inline "✨ AI" section menu (Vietnamese labels) to
 * ContentGenerationType + an optional editor instruction. Pure mapping only
 * — no fetch/network here; `WritingSectionAiAssistant` does the calling.
 */

import type { ContentGenerationType } from "@/features/content-generation/contracts/generation.types";
import { readAiWritingPreferences } from "@/features/content-generation/ux/ai-writing-preferences";
import { ATTD_REWRITE_ACTIONS_VI } from "@/features/content/editorial/attd-editorial-voice";

export type AiSectionMenuActionId =
  | "draft"
  | "rewrite"
  | "shorten"
  | "expand"
  | "tone-change"
  | "natural"
  | "practical"
  | "attd-voice"
  | "example"
  | "table"
  | "faq"
  | "cta"
  | "internal-link"
  | "media";

export type AiSectionMenuAction = {
  id: AiSectionMenuActionId;
  label: string;
  type: ContentGenerationType;
  /** Section-scoped types only — non-section types (FAQ/CTA/link/media) run at document scope. */
  sectionScoped: boolean;
  /** Resolves a default editorInstruction for this action, e.g. from stored tone preference. */
  buildInstruction?: () => string | null;
};

const TONE_INSTRUCTION_VI: Record<string, string> = {
  professional: "Viết theo giọng văn chuyên nghiệp, đáng tin cậy, phù hợp khách hàng doanh nghiệp B2B.",
  direct: "Viết theo giọng văn trực tiếp, ngắn gọn, đi thẳng vào vấn đề.",
  consultative: "Viết theo giọng văn tư vấn, đồng hành và giải thích rõ lợi ích cho khách hàng.",
};

export const AI_SECTION_MENU_ACTIONS: AiSectionMenuAction[] = [
  { id: "draft", label: "Viết bản nháp", type: "SECTION_DRAFT", sectionScoped: true },
  { id: "rewrite", label: "Viết lại", type: "SECTION_REWRITE", sectionScoped: true },
  {
    id: "natural",
    label: "Viết tự nhiên hơn",
    type: "SECTION_REWRITE",
    sectionScoped: true,
    buildInstruction: () => ATTD_REWRITE_ACTIONS_VI.natural,
  },
  {
    id: "shorten",
    label: "Ngắn gọn hơn",
    type: "SECTION_SHORTEN",
    sectionScoped: true,
    buildInstruction: () => ATTD_REWRITE_ACTIONS_VI.shorter,
  },
  {
    id: "practical",
    label: "Giải thích thực tế hơn",
    type: "SECTION_REWRITE",
    sectionScoped: true,
    buildInstruction: () => ATTD_REWRITE_ACTIONS_VI.practical,
  },
  { id: "expand", label: "Mở rộng", type: "SECTION_EXPAND", sectionScoped: true },
  {
    id: "tone-change",
    label: "Đổi giọng văn",
    type: "SECTION_TONE_CHANGE",
    sectionScoped: true,
    buildInstruction: () => {
      const prefs = readAiWritingPreferences();
      return TONE_INSTRUCTION_VI[prefs.tone] ?? null;
    },
  },
  {
    id: "attd-voice",
    label: "Viết lại theo giọng ATTD",
    type: "SECTION_TONE_CHANGE",
    sectionScoped: true,
    buildInstruction: () => ATTD_REWRITE_ACTIONS_VI.voice,
  },
  {
    id: "example",
    label: "Thêm ví dụ",
    type: "SECTION_EXAMPLE",
    sectionScoped: true,
    buildInstruction: () => ATTD_REWRITE_ACTIONS_VI.example,
  },
  {
    id: "table",
    label: "Thêm bảng",
    type: "SECTION_EXPAND",
    sectionScoped: true,
    buildInstruction: () => "Thêm bảng so sánh hữu ích dạng HTML table",
  },
  { id: "faq", label: "Thêm FAQ", type: "FAQ_SUGGESTION", sectionScoped: false },
  { id: "cta", label: "Gợi ý CTA", type: "CTA_SUGGESTION", sectionScoped: false },
  { id: "internal-link", label: "Gợi ý liên kết", type: "INTERNAL_LINK_SUGGESTION", sectionScoped: false },
  { id: "media", label: "Gợi ý hình ảnh", type: "MEDIA_SUGGESTION", sectionScoped: false },
];

export function resolveAiMenuAction(id: string): AiSectionMenuAction | null {
  return AI_SECTION_MENU_ACTIONS.find((action) => action.id === id) ?? null;
}

/** Convenience: resolves the default instruction text (if any) for a menu action id. */
export function resolveAiMenuInstruction(id: string): string | null {
  const action = resolveAiMenuAction(id);
  return action?.buildInstruction ? action.buildInstruction() : null;
}

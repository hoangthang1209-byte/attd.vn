import { createHash } from "node:crypto";
import type { WritingSectionType } from "@/features/writing-engine/writing-engine.types";

export function stableId(prefix: string, seed: string): string {
  return `${prefix}_${createHash("sha256").update(seed).digest("hex").slice(0, 12)}`;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function sectionKeyFromHeading(heading: string, sortOrder: number): string {
  const base = slugify(heading) || "section";
  return `${base}-${sortOrder}`;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const PURPOSE_TYPE_MAP: Array<{ pattern: RegExp; type: WritingSectionType }> = [
  { pattern: /process|quy trình|workflow/i, type: "PROCESS" },
  { pattern: /moq|giá|pricing|commercial|đặt hàng|\border\b/i, type: "COMMERCIAL" },
  { pattern: /material|vải|gsm|fabric|chất liệu/i, type: "MATERIAL" },
  { pattern: /manufactur|factory|xưởng|sản xuất/i, type: "MANUFACTURING" },
  { pattern: /product|sản phẩm/i, type: "PRODUCT" },
  { pattern: /technique|in |thêu|embroidery|printing/i, type: "TECHNIQUE" },
  { pattern: /faq|câu hỏi/i, type: "FAQ" },
  { pattern: /cta|liên hệ|contact/i, type: "CTA" },
  { pattern: /case study|dự án/i, type: "CASE_STUDY" },
  { pattern: /intro|tổng quan|overview/i, type: "INTRODUCTION" },
  { pattern: /kết luận|conclusion|tóm tắt|summary/i, type: "CONCLUSION" },
];

export function inferSectionType(purpose: string, heading: string): WritingSectionType {
  const hay = `${purpose} ${heading}`;
  for (const entry of PURPOSE_TYPE_MAP) {
    if (entry.pattern.test(hay)) return entry.type;
  }
  return "INFORMATIONAL";
}

export function isExactValueFactKey(key: string): boolean {
  return /moq|lead[_-]?time|gsm|capacity|price|pricing|margin|turnaround/i.test(key);
}

export function stripUnsafeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

export function isPublicUrl(url: string): boolean {
  if (!url || url.startsWith("javascript:")) return false;
  if (url.startsWith("/")) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function hashObject(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

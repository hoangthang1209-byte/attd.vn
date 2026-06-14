import { stripHtml } from "@/features/blog/content-processor";

const WORDS_PER_MINUTE = 200;

export function countWords(text: string): number {
  const normalized = text.trim();
  if (!normalized) return 0;
  return normalized.split(/\s+/).filter(Boolean).length;
}

export function calculateReadingTime(content: string | null | undefined): number {
  if (!content?.trim()) return 1;
  const words = countWords(stripHtml(content));
  if (words === 0) return 1;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export function formatReadingTime(minutes: number): string {
  return `${minutes} phút đọc`;
}

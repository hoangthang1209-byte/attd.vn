import { parseFaqJson, parseTagsInput, parseTagsJson } from "@/features/blog/content-processor";
import type { BlogFaqItem } from "@/features/blog/types";

export function parseBlogFaqInput(value: unknown): BlogFaqItem[] | undefined {
  if (value === undefined) return undefined;
  return parseFaqJson(value);
}

export function parseBlogTagsInput(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return parseTagsJson(value);
  if (typeof value === "string") return parseTagsInput(value);
  return [];
}

export function sanitizeBlogFaq(items: BlogFaqItem[]): BlogFaqItem[] {
  return items
    .map((item) => ({
      question: item.question.trim(),
      answer: item.answer.trim(),
    }))
    .filter((item) => item.question && item.answer);
}

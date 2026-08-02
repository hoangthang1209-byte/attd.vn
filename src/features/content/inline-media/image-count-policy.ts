export type ImageCountPolicy = {
  min: number;
  max: number;
  recommended: number;
};

/**
 * Deterministic inline image count targets by article word count.
 * Never force weak images merely to hit the ceiling.
 */
export function resolveImageCountPolicy(wordCount: number): ImageCountPolicy {
  if (wordCount < 1000) return { min: 1, max: 2, recommended: 2 };
  if (wordCount < 2000) return { min: 2, max: 4, recommended: 3 };
  if (wordCount < 3000) return { min: 3, max: 6, recommended: 4 };
  return { min: 5, max: 8, recommended: 6 };
}

/** Minimum plain-text / HTML offset characters between two inline figures. */
export const MIN_TEXT_DISTANCE_BETWEEN_IMAGES = 900;

/** Short sections get at most one image. */
export const SHORT_SECTION_CHAR_LIMIT = 280;

/** Score below this is skipped rather than forced. */
export const MIN_INLINE_SCORE_THRESHOLD = 30;

export function countWordsFromHtml(html: string): number {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 0;
  return text.split(" ").filter(Boolean).length;
}

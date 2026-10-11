/** Max bytes accepted at ingest (original kept in storage). */
export const MEDIA_INGEST_MAX_BYTES = 25 * 1024 * 1024;

/** Target web delivery warning threshold (staff hint only). */
export const MEDIA_WEB_DELIVERY_WARN_BYTES = 500 * 1024;

/** Legacy hard cap retained for picker embeds that must stay lightweight. */
export const MEDIA_PICKER_EMBED_MAX_BYTES = 2 * 1024 * 1024;

/** High-confidence ingest suggestions auto-fill semantic fields. */
export const MEDIA_INGEST_AUTO_APPLY_CONFIDENCE = 0.72;

/** Low-confidence suggestions stay in review bag only. */
export const MEDIA_INGEST_REVIEW_ONLY_CONFIDENCE = 0.45;

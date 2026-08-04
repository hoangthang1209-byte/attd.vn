/**
 * Sprint 16.1 — streaming architecture placeholder.
 *
 * No provider streams tokens today (Sprint 16.0 providers return a single
 * completed result). This module exists so the proposal panel/queue can be
 * written against a stable "streaming" shape now, without any behavior
 * change: `isStreamingEnabled()` always returns false and the placeholder
 * handlers are silent no-ops. Wiring a real SSE/streaming provider later
 * only needs to flip this switch and feed chunks into `onChunk`.
 */

export type StreamingSupport = {
  supported: boolean;
  reason: string;
};

export const DEFAULT_STREAMING_SUPPORT: StreamingSupport = { supported: false, reason: "not_enabled" };

/** Always false until a provider implements token streaming. */
export function isStreamingEnabled(): false {
  return false;
}

export function getStreamingSupport(): StreamingSupport {
  return DEFAULT_STREAMING_SUPPORT;
}

export type StreamingPlaceholder = {
  onChunk: (chunk: string) => void;
  onDone: () => void;
};

/**
 * Returns no-op handlers a UI can safely call today. When a streaming
 * provider exists, callers should check `isStreamingEnabled()` first and
 * fall back to the existing request/response flow when it's false — this
 * placeholder never throws and never partially updates UI state.
 */
export function createStreamingPlaceholder(): StreamingPlaceholder {
  return {
    onChunk: () => {},
    onDone: () => {},
  };
}

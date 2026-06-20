/** Chromium PDF failure with server-side trace ID for Vercel log correlation. */
export class QuotePdfChromiumError extends Error {
  readonly traceId: string;

  constructor(traceId: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "QuotePdfChromiumError";
    this.traceId = traceId;
  }
}

export function getQuotePdfTraceId(error: unknown): string | undefined {
  if (error instanceof QuotePdfChromiumError) {
    return error.traceId;
  }
  return undefined;
}

export function createQuotePdfTraceId(): string {
  return `quote-pdf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

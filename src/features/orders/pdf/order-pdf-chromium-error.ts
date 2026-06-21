export class OrderPdfChromiumError extends Error {
  readonly traceId: string;

  constructor(traceId: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "OrderPdfChromiumError";
    this.traceId = traceId;
  }
}

export function getOrderPdfTraceId(error: unknown): string | undefined {
  if (error instanceof OrderPdfChromiumError) {
    return error.traceId;
  }
  return undefined;
}

export function createOrderPdfTraceId(): string {
  return `order-pdf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

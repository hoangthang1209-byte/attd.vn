/** Retry transient Prisma connection-pool timeouts (P2024) during SSG/ISR. */

function isPrismaPoolTimeout(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  if (code === "P2024") return true;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return /Timed out fetching a new connection from the connection pool/i.test(message);
}

export async function withPrismaPoolRetry<T>(
  operation: () => Promise<T>,
  options?: { attempts?: number; baseDelayMs?: number },
): Promise<T> {
  const attempts = Math.max(1, options?.attempts ?? 4);
  const baseDelayMs = Math.max(50, options?.baseDelayMs ?? 250);
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isPrismaPoolTimeout(error) || attempt === attempts) {
        throw error;
      }
      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

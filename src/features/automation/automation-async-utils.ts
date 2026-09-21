export const AUTOMATION_COMMENT_FETCH_CONCURRENCY = 8;
export const AUTOMATION_LINKED_PR_FETCH_CONCURRENCY = 5;

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];

  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await fn(items[index], index);
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export function isRecoverableGitHubLookupError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("status" in error)) return false;
  const status = (error as { status: unknown }).status;
  return (
    status === 403 ||
    status === 404 ||
    status === 429 ||
    (typeof status === "number" && status >= 500)
  );
}

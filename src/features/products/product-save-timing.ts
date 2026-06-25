type TimingEntry = {
  stage: string;
  durationMs: number;
};

const enabled = (): boolean =>
  process.env.NODE_ENV === "development" || process.env.PRODUCT_SAVE_TIMING === "1";

export function createProductSaveTimer(label: string) {
  const entries: TimingEntry[] = [];
  let closed = false;

  async function measure<T>(stage: string, fn: () => Promise<T>): Promise<T> {
    if (!enabled()) return fn();
    const started = performance.now();
    try {
      return await fn();
    } finally {
      entries.push({ stage, durationMs: Math.round(performance.now() - started) });
    }
  }

  function sync<T>(stage: string, fn: () => T): T {
    if (!enabled()) return fn();
    const started = performance.now();
    try {
      return fn();
    } finally {
      entries.push({ stage, durationMs: Math.round(performance.now() - started) });
    }
  }

  function flush(): TimingEntry[] {
    if (!enabled() || closed) return entries;
    closed = true;
    const total = entries.reduce((sum, row) => sum + row.durationMs, 0);
    console.info(`[product-save-timing] ${label} total=${total}ms`);
    for (const row of entries) {
      console.info(`  ${row.stage}: ${row.durationMs}ms`);
    }
    return entries;
  }

  return { measure, sync, flush, entries };
}

export type ProductSaveTimer = ReturnType<typeof createProductSaveTimer>;

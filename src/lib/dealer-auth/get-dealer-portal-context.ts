export type DealerPortalContext =
  | { kind: "anonymous" }
  | { kind: "pending"; companyName: string }
  | { kind: "approved"; companyName: string; priceGroupName?: string | null };

/**
 * Dealer portal session — full auth lands in Sprint D2.
 * D0+D1 returns anonymous until dealer login is implemented.
 */
export async function getDealerPortalContext(): Promise<DealerPortalContext> {
  return { kind: "anonymous" };
}

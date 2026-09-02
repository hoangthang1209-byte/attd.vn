function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export type SellingPriceCommercials = {
  quantity: number;
  costEstimate: number;
  costPerUnit: number;
  sellingPricePerUnit: number;
  revenue: number;
  profit: number;
  marginRate: number;
};

export function computeSellingPriceCommercials(params: {
  quantity: number;
  costEstimate: number;
  sellingPricePerUnit: number;
}): SellingPriceCommercials {
  const quantity = Math.max(1, Math.round(params.quantity));
  const costEstimate = Math.max(0, params.costEstimate);
  const sellingPricePerUnit = Math.max(0, params.sellingPricePerUnit);
  const revenue = roundMoney(sellingPricePerUnit * quantity);
  const profit = roundMoney(revenue - costEstimate);
  const marginRate = revenue > 0 ? roundMoney((profit / revenue) * 100) : 0;
  const costPerUnit = roundMoney(costEstimate / quantity);

  return {
    quantity,
    costEstimate,
    costPerUnit,
    sellingPricePerUnit,
    revenue,
    profit,
    marginRate,
  };
}

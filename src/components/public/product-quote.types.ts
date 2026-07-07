export type ProductQuoteContext = {
  id: string;
  slug: string;
  name: string;
  category?: string | null;
  imageUrl?: string | null;
  moq?: number | null;
  leadTime?: string | null;
  variantId?: string | null;
  variantLabel?: string | null;
  variantSku?: string | null;
  optionSummary?: string | null;
  optionSelections?: Record<string, string | null>;
};

export type ProductInquiryPayload = {
  name: string;
  phone: string;
  company?: string | null;
  email?: string | null;
  expectedQty?: string | null;
  note?: string | null;
  product: ProductQuoteContext;
  productUrl: string;
};

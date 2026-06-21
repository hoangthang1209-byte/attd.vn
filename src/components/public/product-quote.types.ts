export type ProductQuoteContext = {
  id: string;
  slug: string;
  name: string;
  category?: string | null;
  imageUrl?: string | null;
  moq?: number | null;
};

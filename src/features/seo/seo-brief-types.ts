export type SearchIntent =
  | "informational"
  | "commercial"
  | "transactional"
  | "navigational"
  | "mixed";

export const SEARCH_INTENT_LABELS: Record<SearchIntent, string> = {
  informational: "Thông tin (informational)",
  commercial: "Thương mại (commercial)",
  transactional: "Giao dịch (transactional)",
  navigational: "Điều hướng (navigational)",
  mixed: "Hỗn hợp (mixed)",
};

export type OutlineItem = {
  level: "H2" | "H3";
  heading: string;
  notes?: string;
};

export type FaqItem = {
  question: string;
  answerDirection: string;
};

export type InternalLinkSuggestion = {
  anchorText: string;
  targetUrl?: string;
  reason?: string;
};

export type RequiredKnowledgeFact = {
  entryId?: string;
  title: string;
  fact: string;
};

export type SeoBrief = {
  targetKeyword: string;
  secondaryKeywords: string[];
  searchIntent: SearchIntent;
  audience: string;
  contentGoal: string;
  recommendedTitle: string;
  metaTitleIdeas: string[];
  metaDescriptionIdeas: string[];
  contentAngle: string;
  outline: OutlineItem[];
  faq: FaqItem[];
  internalLinkSuggestions: InternalLinkSuggestion[];
  ctaSuggestions: string[];
  requiredKnowledgeFacts: RequiredKnowledgeFact[];
  contentWarnings: string[];
  estimatedWordCount?: number;
};

export type SeoBriefInput = {
  targetKeyword: string;
  secondaryKeywords?: string[];
  searchIntent?: SearchIntent;
  audience?: string;
  contentGoal?: string;
  knowledgeContext?: {
    selectedEntryIds?: string[];
    contextText?: string;
    averageReadinessScore?: number;
    warnings?: string[];
  };
};

export type SeoBriefMetadata = {
  targetKeyword: string;
  usedKnowledgeEntryIds: string[];
  knowledgeReadinessAverage: number;
  knowledgeWarnings: string[];
  generatedAt: string;
};

export type SeoBriefResponse = {
  brief: SeoBrief;
  prompt: string;
  metadata: SeoBriefMetadata;
};

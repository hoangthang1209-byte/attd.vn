export type ContentLaunchStatus = {
  aiGeneration: {
    enabled: boolean;
    providerConfigured: boolean;
    provider: string | null;
    model: string | null;
    apiKeyConfigured: boolean;
    sectionGenerationReady: boolean;
    maxOutputTokensPerSection: number | null;
    dailyRunLimit: number | null;
    monthlyBudgetUsd: number | null;
    maxSectionsPerRun: number | null;
    errors: string[];
    warnings: string[];
  };

  publishing: {
    immediatePublishReady: boolean;
    schedulingConfigured: boolean;
    cronSecretConfigured: boolean;
    cronRouteRegistered: boolean;
    cronScheduleConfigured: boolean;
    cronSchedule: string | null;
    lastSuccessfulDueRunAt: string | null;
    errors: string[];
    warnings: string[];
  };

  knowledge: {
    publicApprovedFacts: number;
    retrievalReadyFacts: number;
    blockingConflicts: number;
    warnings: string[];
  };

  media: {
    poloBundleId: string | null;
    poloBundleStatus: string | null;
    publicAssetCount: number;
    requiredSlotsFilled: number;
    requiredSlotsTotal: number;
    warnings: string[];
  };

  graph: {
    globalExpansionEnabled: boolean;
    consumerFlagsEnabled: string[];
    rolloutMode: string;
  };

  readyForManualContentLaunch: boolean;
  readyForAiAssistedLaunch: boolean;
  readyForScheduledPublishing: boolean;
};

export type ContentLaunchStepStatus =
  | "not_started"
  | "in_progress"
  | "ready"
  | "blocked"
  | "completed"
  | "skipped_optional";

export type ContentLaunchWorkflowStep = {
  id: string;
  label: string;
  status: ContentLaunchStepStatus;
  entityType: string | null;
  entityId: string | null;
  openHref: string | null;
  actionLabel: string;
  blocker: string | null;
  nextAction: string | null;
};

export type ContentLaunchChecklistItem = {
  id: string;
  group: "system" | "content" | "media" | "seo" | "publishing";
  label: string;
  done: boolean;
  required: boolean;
  detail: string | null;
  href: string | null;
};

export type ContentLaunchKnowledgeDomainResult = {
  key: string;
  label: string;
  required: boolean;
  available: boolean;
  publicApprovedCount: number;
  entryIds: string[];
  entryTitles: string[];
};

export type ContentLaunchKnowledgeReadiness = {
  availableFacts: number;
  publicApprovedFacts: number;
  retrievalReadyFacts: number;
  missingDomains: ContentLaunchKnowledgeDomainResult[];
  coveredDomains: ContentLaunchKnowledgeDomainResult[];
  conflicts: Array<{ id: string; title: string; reason: string }>;
  staleFacts: Array<{ id: string; title: string }>;
  evidenceGaps: Array<{ id: string; title: string }>;
  sourceLinks: Array<{ id: string; title: string; href: string }>;
  hardBlockers: string[];
  warnings: string[];
  readyForInformationalArticle: boolean;
};

export type ContentLaunchMediaSlotHealth = {
  slotId: string;
  slotType: string;
  label: string;
  required: boolean;
  assetCount: number;
  publicAssetCount: number;
  missingAlt: number;
  missingTitle: number;
  missingCaption: number;
  filled: boolean;
};

export type ContentLaunchMediaReadiness = {
  bundleId: string | null;
  bundleCode: string;
  bundleName: string | null;
  bundleStatus: string | null;
  editorHref: string | null;
  publicAssetCount: number;
  requiredSlotsFilled: number;
  requiredSlotsTotal: number;
  slots: ContentLaunchMediaSlotHealth[];
  missingRequiredSlots: string[];
  warnings: string[];
  readyEnoughForDraft: boolean;
};

export type ContentLaunchFirstArticle = {
  topicId: string | null;
  topicTitle: string | null;
  topicStatus: string | null;
  topicHref: string | null;
  strategyId: string | null;
  strategyName: string | null;
  clusterId: string | null;
  clusterName: string | null;
  briefId: string | null;
  briefApproved: boolean;
  contextBuildId: string | null;
  contextStatus: string | null;
  writingPlanId: string | null;
  writingDraftId: string | null;
  reviewSessionId: string | null;
  reviewStatus: string | null;
  handoffId: string | null;
  blogPostId: string | null;
  blogStatus: string | null;
  blogHref: string | null;
  matchingExistingBlogs: Array<{ id: string; title: string; status: string; slug: string | null }>;
  keywordSuggestions: {
    primary: string;
    secondary: readonly string[];
    questions: readonly string[];
  };
  briefTemplate: typeof import("./content-launch.constants").CONTENT_LAUNCH_BRIEF_TEMPLATE;
  factPolicy: typeof import("./content-launch.constants").CONTENT_LAUNCH_FACT_POLICY;
  qaPresetChecks: readonly string[];
};

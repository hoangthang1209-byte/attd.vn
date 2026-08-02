export * from "@/features/media/lifecycle/lifecycle.types";
export {
  transitionMediaLifecycle,
  selectReplacementAsset,
  setMediaAssetRights,
  setSupersedesRelation,
  assertLifecycleTransition,
  assertValidReplacementTarget,
  writeLifecycleEvent,
} from "@/features/media/lifecycle/lifecycle-transition.service";
export {
  resolveMediaDependencies,
  countMediaDependenciesBatch,
  isLifecycleEligibleForSuggestion,
} from "@/features/media/lifecycle/media-dependency.service";
export {
  planMediaAssetReplacement,
  applyMediaAssetReplacement,
} from "@/features/media/lifecycle/media-replacement.service";
export {
  listLifecycleQueue,
  getLifecycleDashboardCounts,
  bulkLifecycleUpdate,
  classifyUnusedAsset,
} from "@/features/media/lifecycle/lifecycle-queue.service";

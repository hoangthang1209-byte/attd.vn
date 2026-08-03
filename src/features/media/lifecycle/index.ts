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
  assertReplacementPlanFresh,
  rewriteBlogHtmlMediaId,
} from "@/features/media/lifecycle/media-replacement.service";
export { recommendAssetNextAction } from "@/features/media/lifecycle/next-action.service";
export {
  listLifecycleQueue,
  getLifecycleDashboardCounts,
  bulkLifecycleUpdate,
  classifyUnusedAsset,
} from "@/features/media/lifecycle/lifecycle-queue.service";

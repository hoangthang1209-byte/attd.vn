/**
 * Consumer-specific Knowledge Graph expansion flags and rollout guard.
 * All production defaults: OFF / false. Evaluation override is separate.
 */

import type { AiRetrievalConsumer } from "@/features/ai-retrieval/ai-retrieval-types";

export type KnowledgeGraphRolloutMode = "OFF" | "EVALUATION_ONLY" | "ADMIN_PILOT" | "ENABLED";

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

/** Global kill switch — default false. */
export function isKnowledgeGraphExpansionGlobalEnabled(): boolean {
  return envBool("KNOWLEDGE_GRAPH_EXPANSION_ENABLED", false);
}

/** Prepared consumer flags — all default false. Do not set in production without explicit decision. */
export function isKnowledgeGraphExpansionConsumerFlagEnabled(
  consumer: AiRetrievalConsumer
): boolean {
  switch (consumer) {
    case "SEO_TOPIC_PLANNER":
      return envBool("KNOWLEDGE_GRAPH_EXPANSION_SEO_TOPIC_PLANNER", false);
    case "SEO_BRIEF":
      return envBool("KNOWLEDGE_GRAPH_EXPANSION_SEO_BRIEF", false);
    case "SEO_CONTENT":
      return envBool("KNOWLEDGE_GRAPH_EXPANSION_SEO_CONTENT", false);
    case "ADMIN":
      return envBool("KNOWLEDGE_GRAPH_EXPANSION_ADMIN", false);
    default:
      return false;
  }
}

/**
 * Precedence:
 * 1. Global kill switch false → all false (unless evaluation-only override)
 * 2. Consumer flag true → enabled only for that consumer
 * 3. Admin evaluation override is separate (not via env mutation)
 */
export function isKnowledgeGraphExpansionEnabledForConsumer(
  consumer: AiRetrievalConsumer,
  opts?: { enabledForEvaluation?: boolean }
): boolean {
  if (opts?.enabledForEvaluation) return true;
  if (!isKnowledgeGraphExpansionGlobalEnabled()) return false;
  return isKnowledgeGraphExpansionConsumerFlagEnabled(consumer);
}

export function resolveKnowledgeGraphRolloutMode(): KnowledgeGraphRolloutMode {
  const raw = (process.env.KNOWLEDGE_GRAPH_ROLLOUT_MODE ?? "OFF").trim().toUpperCase();
  if (raw === "EVALUATION_ONLY" || raw === "ADMIN_PILOT" || raw === "ENABLED") {
    return raw;
  }
  return "OFF";
}

export function getKnowledgeGraphExpansionFlagSnapshot() {
  return {
    global: isKnowledgeGraphExpansionGlobalEnabled(),
    SEO_TOPIC_PLANNER: isKnowledgeGraphExpansionConsumerFlagEnabled("SEO_TOPIC_PLANNER"),
    SEO_BRIEF: isKnowledgeGraphExpansionConsumerFlagEnabled("SEO_BRIEF"),
    SEO_CONTENT: isKnowledgeGraphExpansionConsumerFlagEnabled("SEO_CONTENT"),
    rolloutMode: resolveKnowledgeGraphRolloutMode(),
  };
}

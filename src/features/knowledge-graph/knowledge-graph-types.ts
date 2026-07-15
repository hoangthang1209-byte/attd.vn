import type {
  KnowledgeBaseVisibility,
  KnowledgeGraphEntityStatus,
  KnowledgeGraphEntityType,
  KnowledgeGraphRelationshipOrigin,
  KnowledgeGraphRelationshipStatus,
  KnowledgeGraphRelationshipType,
} from "@prisma/client";

export type KnowledgeGraphNodeResult = {
  id: string;
  entityType: KnowledgeGraphEntityType;
  sourceType: string;
  sourceId: string;
  canonicalKey: string;
  displayName: string;
  visibility: KnowledgeBaseVisibility;
  status: KnowledgeGraphEntityStatus;
  adminRoute?: string | null;
  publicRoute?: string | null;
};

export type KnowledgeGraphEdgeResult = {
  id: string;
  relationshipType: KnowledgeGraphRelationshipType;
  fromEntityId: string;
  toEntityId: string;
  status: KnowledgeGraphRelationshipStatus;
  origin: KnowledgeGraphRelationshipOrigin;
  visibility: KnowledgeBaseVisibility;
  authorityRank: number;
  confidence?: number | null;
  evidenceUrl?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  lastVerifiedAt?: string | null;
};

export type KnowledgeGraphNeighbourResult = {
  root: KnowledgeGraphNodeResult;
  nodes: KnowledgeGraphNodeResult[];
  edges: KnowledgeGraphEdgeResult[];
  paths?: {
    entityIds: string[];
    relationshipIds: string[];
  }[];
  truncated: boolean;
  warnings: string[];
};

export type KnowledgeGraphSyncOptions = {
  dryRun?: boolean;
  batchSize?: number;
  sourceTypes?: string[];
};

export type KnowledgeGraphSyncReport = {
  dryRun: boolean;
  scanned: number;
  created: number;
  updated: number;
  unchanged: number;
  orphaned: number;
  skipped: number;
  errors: string[];
};

export type KnowledgeGraphRelationSyncReport = {
  dryRun: boolean;
  scanned: number;
  created: number;
  updated: number;
  existing: number;
  archived: number;
  missingTargets: number;
  invalidPairs: number;
  errors: string[];
};

export const GRAPH_TRAVERSAL_LIMITS = {
  defaultDepth: 1,
  maxDepth: 2,
  maxNeighboursPerNode: 40,
  maxTotalEntities: 100,
  maxTotalEdges: 150,
} as const;

/** Deterministic scoring bonuses — only applied when expansion is enabled. */
export const GRAPH_SCORING_BONUSES = {
  oneHop: 8,
  twoHop: 4,
  evidenceBackedCurated: 4,
  systemDerivedAuthoritative: 3,
} as const;

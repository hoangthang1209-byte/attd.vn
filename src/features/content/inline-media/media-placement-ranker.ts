import { scoreInlineMediaCandidate } from "@/features/content/inline-media/inline-media-scoring";
import type { ScoreInlineCandidateInput } from "@/features/content/inline-media/inline-media-scoring";
import type {
  InlineMediaCandidate,
  RankedInlineCandidate,
} from "@/features/content/inline-media/inline-media.types";

/**
 * Optional ranking hook. Sprint 14.2 ships only the deterministic
 * implementation — no paid AI provider is registered.
 */
export interface MediaPlacementRanker {
  rank(input: {
    candidates: InlineMediaCandidate[];
    scoreInput: Omit<ScoreInlineCandidateInput, "candidate">;
  }): Promise<RankedInlineCandidate[]>;
}

export class DeterministicMediaPlacementRanker implements MediaPlacementRanker {
  async rank(input: {
    candidates: InlineMediaCandidate[];
    scoreInput: Omit<ScoreInlineCandidateInput, "candidate">;
  }): Promise<RankedInlineCandidate[]> {
    const ranked: RankedInlineCandidate[] = input.candidates.map((candidate) => ({
      candidate,
      score: scoreInlineMediaCandidate({ ...input.scoreInput, candidate }),
    }));

    ranked.sort((a, b) => {
      if (b.score.total !== a.score.total) return b.score.total - a.score.total;
      return a.candidate.mediaAssetId.localeCompare(b.candidate.mediaAssetId);
    });

    return ranked;
  }
}

export const defaultMediaPlacementRanker = new DeterministicMediaPlacementRanker();

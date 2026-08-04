import { ContentGenerationError } from "@/features/content-generation/contracts/generation.types";
import type { ContentGenerationProvider } from "@/features/content-generation/providers/content-generation-provider";

/**
 * CONTENT_GENERATION_PROVIDER=manual — an explicit opt-out that never calls a
 * paid API even when the master switch is enabled. Useful for staging where
 * editors want the proposal UI wired but no generation should ever run.
 */
export class ManualContentGenerationProvider implements ContentGenerationProvider {
  readonly name = "manual";

  async generate(): Promise<never> {
    throw new ContentGenerationError(
      "Chế độ thủ công đang bật (CONTENT_GENERATION_PROVIDER=manual) — hãy soạn nội dung trực tiếp, không gọi AI.",
      "GENERATION_DISABLED",
    );
  }
}

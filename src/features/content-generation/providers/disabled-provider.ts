import { ContentGenerationError } from "@/features/content-generation/contracts/generation.types";
import type { ContentGenerationProvider } from "@/features/content-generation/providers/content-generation-provider";

/** Default provider when CONTENT_GENERATION_ENABLED=false or provider=disabled. */
export class DisabledContentGenerationProvider implements ContentGenerationProvider {
  readonly name = "disabled";

  async generate(): Promise<never> {
    throw new ContentGenerationError(
      "Tính năng tạo nội dung AI đang tắt. Bạn vẫn có thể viết và chỉnh sửa nội dung thủ công.",
      "GENERATION_DISABLED",
    );
  }
}

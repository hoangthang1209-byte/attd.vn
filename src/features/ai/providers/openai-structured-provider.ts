import type {
  AiGenerationResult,
  AiGenerationUsage,
  AiProvider,
  AiStructuredGenerateParams,
} from "@/features/ai/providers/ai-provider";
import { emptyUsage } from "@/features/ai/providers/ai-provider";
import { estimateGenerationCost } from "@/features/content-generation/services/cost-engine.service";

/**
 * Official OpenAI Chat Completions + strict json_schema.
 *
 * Audit note (OpenAI production enablement):
 * - Chat Completions with `response_format.json_schema` is already the supported
 *   structured-output path used across Content Generation / Writing / SEO Brief.
 * - Responses API (`/v1/responses`, `store: false`) was evaluated; we keep Chat
 *   Completions to avoid a risky adapter rewrite on the first paid rollout.
 * - Data retention follows the OpenAI organization account setting (Zero Data
 *   Retention if enabled on the account). Chat Completions has no per-request
 *   `store` flag; do not log prompts, keys, or raw provider payloads to clients.
 */
type OpenAiChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
  };
  error?: { message?: string };
};

function usageFromResponse(
  usage: OpenAiChatCompletionResponse["usage"],
  model: string,
): AiGenerationUsage {
  const inputTokens = usage?.prompt_tokens ?? null;
  const outputTokens = usage?.completion_tokens ?? null;
  const totalTokens =
    usage?.total_tokens ??
    (inputTokens != null && outputTokens != null ? inputTokens + outputTokens : null);
  const cachedTokens = usage?.prompt_tokens_details?.cached_tokens ?? null;

  const priced = estimateGenerationCost({
    provider: "OPENAI",
    model,
    inputTokens,
    outputTokens,
    cachedTokens,
  });

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUsd: priced.estimatedCostUsd,
  };
}

export class OpenAiStructuredProvider implements AiProvider {
  readonly name = "openai";

  constructor(private readonly apiKey: string) {
    if (!apiKey?.trim()) {
      throw new Error(
        "OPENAI_API_KEY chưa được cấu hình. Không thể gọi OpenAI structured provider.",
      );
    }
  }

  async generateStructured(params: AiStructuredGenerateParams): Promise<AiGenerationResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), params.timeoutMs);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: params.model,
          temperature: params.temperature ?? 0.2,
          max_tokens: params.maxOutputTokens,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: params.schemaName,
              strict: true,
              schema: params.jsonSchema,
            },
          },
          messages: [
            { role: "system", content: params.systemPrompt },
            { role: "user", content: params.userPrompt },
          ],
        }),
      });

      const payload = (await response.json()) as OpenAiChatCompletionResponse;
      if (!response.ok) {
        const short =
          typeof payload.error?.message === "string" && payload.error.message.trim()
            ? payload.error.message.trim().slice(0, 180)
            : `OpenAI request failed (${response.status})`;
        throw new Error(short);
      }

      const rawText = payload.choices?.[0]?.message?.content?.trim() ?? "";
      if (!rawText) {
        throw new Error("OpenAI returned empty structured content");
      }

      let output: unknown;
      try {
        output = JSON.parse(rawText);
      } catch {
        throw new Error("OpenAI returned non-JSON structured content");
      }

      return {
        output,
        rawText,
        usage: usageFromResponse(payload.usage, params.model),
        provider: this.name,
        model: params.model,
      };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`OpenAI request timed out after ${params.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

export function createOpenAiStructuredProvider(apiKey = process.env.OPENAI_API_KEY): OpenAiStructuredProvider {
  if (!apiKey?.trim()) {
    throw new Error(
      "OPENAI_API_KEY chưa được cấu hình. Đặt biến môi trường trước khi bật AI SEO Brief.",
    );
  }
  return new OpenAiStructuredProvider(apiKey);
}

/** @internal for typing when provider construction fails before call */
export function unusedEmptyUsage(): AiGenerationUsage {
  return emptyUsage();
}

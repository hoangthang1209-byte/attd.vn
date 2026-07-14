export type AiGenerationUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
};

export type AiGenerationResult = {
  /** Parsed JSON object from structured output. */
  output: unknown;
  rawText: string;
  usage: AiGenerationUsage;
  provider: string;
  model: string;
};

export type AiStructuredGenerateParams = {
  systemPrompt: string;
  userPrompt: string;
  /** OpenAI json_schema schema object (the inner schema, not the wrapper). */
  jsonSchema: Record<string, unknown>;
  schemaName: string;
  model: string;
  maxOutputTokens: number;
  timeoutMs: number;
  temperature?: number;
};

export interface AiProvider {
  readonly name: string;
  generateStructured(params: AiStructuredGenerateParams): Promise<AiGenerationResult>;
}

export function emptyUsage(): AiGenerationUsage {
  return {
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    estimatedCostUsd: null,
  };
}

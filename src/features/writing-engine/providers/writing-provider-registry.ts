import type { WritingSectionProvider } from "@/features/writing-engine/writing-engine.types";

const providers = new Map<string, WritingSectionProvider>();

export function registerWritingSectionProvider(name: string, provider: WritingSectionProvider): void {
  providers.set(name, provider);
}

export function getWritingSectionProvider(name: string): WritingSectionProvider | null {
  return providers.get(name) ?? null;
}

export function listWritingSectionProviders(): string[] {
  return [...providers.keys()];
}

import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  ContentContextPackage,
  ContentWriterInput,
} from "@/features/content-context/content-context.types";

export class ContentWriterGuardError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "ContentWriterGuardError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Future writer entrypoint — validates package only. Does not generate content.
 */
export async function getContextPackageForWriter(
  input: ContentWriterInput,
): Promise<ContentContextPackage> {
  const build = await prisma.contentContextBuild.findUnique({
    where: { id: input.contextBuildId },
  });
  if (!build) {
    throw new ContentWriterGuardError("Context build not found", "BUILD_NOT_FOUND", 404);
  }
  if (build.status === "SUPERSEDED") {
    throw new ContentWriterGuardError("Context build superseded", "BUILD_SUPERSEDED", 409);
  }
  if (build.status !== "COMPLETED") {
    throw new ContentWriterGuardError("Context build not completed", "BUILD_INCOMPLETE", 409);
  }

  const errors = Array.isArray(build.readinessErrors)
    ? (build.readinessErrors as string[])
    : [];
  if (errors.length > 0) {
    throw new ContentWriterGuardError(
      `Context not writer-ready: ${errors.join(" ")}`,
      "READINESS_BLOCKED",
      422,
    );
  }

  const pkg = build.packageJson as ContentContextPackage | null;
  if (!pkg || typeof pkg !== "object") {
    throw new ContentWriterGuardError("Package missing", "PACKAGE_MISSING", 422);
  }

  if (!pkg.outputRules?.publicOutputOnly) {
    throw new ContentWriterGuardError("Package not marked public-output safe", "NOT_PUBLIC_SAFE", 422);
  }

  if (pkg.facts.some((f) => f.visibility !== "PUBLIC" || !f.publicOutputAllowed)) {
    throw new ContentWriterGuardError("Non-public facts in package", "CONFIDENTIAL_FACTS", 422);
  }

  if (pkg.conflicts.some((c) => !c.publicUseAllowed)) {
    throw new ContentWriterGuardError("Unresolved blocking conflicts", "BLOCKING_CONFLICTS", 422);
  }

  const briefVersion = pkg.entity.briefVersion ?? pkg.brief.version ?? null;
  if (
    briefVersion != null &&
    input.approvedBriefVersion != null &&
    Number(briefVersion) !== Number(input.approvedBriefVersion)
  ) {
    throw new ContentWriterGuardError(
      "Brief version mismatch — rebuild context",
      "BRIEF_VERSION_MISMATCH",
      409,
    );
  }

  void input.outputFormat;
  return pkg;
}

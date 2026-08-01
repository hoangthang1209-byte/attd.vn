"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  evaluateBlogReadiness,
  type BlogReadinessResult,
  type ServerReadinessInput,
} from "@/features/blog/blog-readiness";
import type { BlogFaqItem } from "@/features/blog/types";

export type ServerPublishReadiness = ServerReadinessInput & {
  governed: boolean;
  contentHash: string;
  materiallyChangedAfterHandoff: boolean;
  checks: Record<string, boolean>;
  sourceWritingDraftId?: string | null;
  sourceDraftVersion?: number | null;
  approvedReviewSessionId?: string | null;
  handoffRecordId?: string | null;
};

type UseBlogReadinessInput = {
  postId: string | null;
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  featuredImageUrl: string | null;
  ogImageUrl: string | null;
  content: string;
  faqJson: BlogFaqItem[];
  tags: string[];
  dirty: boolean;
};

export type BlogReadinessState = {
  readiness: BlogReadinessResult;
  server: ServerPublishReadiness | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

async function fetchPublishReadiness(postId: string): Promise<ServerPublishReadiness | null> {
  const res = await fetch(`/api/content/blog/${postId}/publish-readiness`);
  const json = await res.json();
  if (res.ok && json.readiness) {
    return json.readiness as ServerPublishReadiness;
  }
  return null;
}

/**
 * One readiness fetch per workspace, one evaluation, shared by every panel.
 * This is what keeps the SEO sidebar and the Publishing panel from telling
 * the editor two different stories.
 */
export function useBlogReadiness(input: UseBlogReadinessInput): BlogReadinessState {
  const { postId } = input;
  const [server, setServer] = useState<ServerPublishReadiness | null>(null);
  const [loading, setLoading] = useState(Boolean(postId));
  const [requestId, setRequestId] = useState(0);

  const refresh = useCallback(async () => {
    if (!postId) {
      setServer(null);
      setLoading(false);
      return;
    }
    setRequestId((value) => value + 1);
  }, [postId]);

  useEffect(() => {
    if (!postId) {
      queueMicrotask(() => {
        setServer(null);
        setLoading(false);
      });
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });

    void fetchPublishReadiness(postId).then((next) => {
      if (cancelled) return;
      if (next) setServer(next);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [postId, requestId]);

  const readiness = useMemo(
    () =>
      evaluateBlogReadiness({
        title: input.title,
        slug: input.slug,
        metaTitle: input.metaTitle,
        metaDescription: input.metaDescription,
        excerpt: input.excerpt,
        featuredImageUrl: input.featuredImageUrl,
        ogImageUrl: input.ogImageUrl,
        content: input.content,
        faqJson: input.faqJson,
        tags: input.tags,
        server: server
          ? { ready: server.ready, errors: server.errors, warnings: server.warnings }
          : null,
        dirty: input.dirty,
      }),
    [
      input.title,
      input.slug,
      input.metaTitle,
      input.metaDescription,
      input.excerpt,
      input.featuredImageUrl,
      input.ogImageUrl,
      input.content,
      input.faqJson,
      input.tags,
      input.dirty,
      server,
    ]
  );

  return { readiness, server, loading, refresh };
}

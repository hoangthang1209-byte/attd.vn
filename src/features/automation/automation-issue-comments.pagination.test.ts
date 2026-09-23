import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ISSUE_COMMENTS_PAGE_SIZE,
  mergeIssueCommentPages,
  shouldFetchNextCommentPage,
} from "@/features/automation/automation-issue-comments.pagination";

describe("automation issue comment pagination", () => {
  it("stops merging when BUILD_APPROVED is found on a later page", () => {
    const pageOne = Array.from({ length: ISSUE_COMMENTS_PAGE_SIZE }, (_, index) => ({
      body: `note-${index}`,
    }));
    const pageTwo = [{ body: "BUILD_APPROVED" }];

    const comments = mergeIssueCommentPages([pageOne, pageTwo]);
    assert.equal(comments.length, ISSUE_COMMENTS_PAGE_SIZE + 1);
    assert.ok(comments.some((comment) => comment.body === "BUILD_APPROVED"));
  });

  it("requests another page only while pages are full and approval is absent", () => {
    const fullPage = Array.from({ length: ISSUE_COMMENTS_PAGE_SIZE }, () => ({ body: "note" }));

    assert.equal(shouldFetchNextCommentPage(fullPage, fullPage, 1), true);
    assert.equal(
      shouldFetchNextCommentPage([{ body: "BUILD_APPROVED" }], [{ body: "BUILD_APPROVED" }], 2),
      false,
    );
    assert.equal(shouldFetchNextCommentPage([{ body: "tail" }], [{ body: "tail" }], 1), false);
  });
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  EDITOR_COMMANDS,
  filterEditorCommands,
} from "@/components/admin/blog-editor/editor-commands";
import {
  EDITOR_PREF_KEYS,
  pushRecent,
  readListPref,
  toggleInList,
  writeListPref,
} from "@/features/blog/editor-preferences";
import { renderBlogPreviewFromMarkdown } from "@/features/blog/preview-content";

function read(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const EDITOR = read("src/components/admin/BlogPostEditor.tsx");
const TABS = read("src/components/admin/blog-editor/BlogWorkspaceTabs.tsx");
const SIDEBAR = read("src/components/admin/blog-editor/BlogReadinessSidebar.tsx");
const SAVE_STATUS = read("src/components/admin/blog-editor/BlogSaveStatus.tsx");
const PREVIEW = read("src/components/admin/blog-editor/BlogEditorPreview.tsx");
const SLASH_MENU = read("src/components/admin/blog-editor/BlogSlashMenu.tsx");
const PALETTE = read("src/components/admin/blog-editor/BlogCommandPalette.tsx");
const BLOCK_ASSISTANT = read("src/components/admin/blog-editor/BlogBlockAssistant.tsx");
const VISUAL_EDITOR = read("src/components/admin/blog-editor/BlogVisualModeEditor.tsx");
const FAQ_BUILDER = read("src/components/admin/BlogFaqBuilder.tsx");
const TAG_INPUT = read("src/components/admin/BlogTagInput.tsx");
const CATEGORY_SELECTOR = read("src/components/admin/blog-editor/BlogCategorySelector.tsx");
const CTA_PREVIEW = read("src/components/admin/blog-editor/BlogCtaPreview.tsx");
const SHORTCUTS = read("src/components/admin/blog-editor/useEditorShortcuts.ts");
const FOCUS_HOOK = read("src/components/admin/blog-editor/useEditorFocusMode.ts");
const GLOBAL_CSS = read("src/app/globals.css");
const SHELL_CSS = read("src/components/admin/AdminShell.module.css");

describe("Sprint 14.0 — editorial UX polish", () => {
  it("1. offers a Normal / Focus switch on the workspace toolbar", () => {
    assert.match(EDITOR, /blog-focus-switch/);
    assert.match(EDITOR, />\s*Normal\s*</);
    assert.match(EDITOR, />\s*Focus\s*</);
    assert.match(EDITOR, /useEditorFocusMode/);
  });

  it("2. focus mode keeps only title, summary, editor and a floating save", () => {
    const focusBranch = EDITOR.slice(
      EDITOR.indexOf("if (focusMode) {"),
      EDITOR.indexOf("return (\n    <div className=\"admin-panel blog-workspace\">"),
    );
    assert.ok(focusBranch.length > 0, "focus branch missing");
    assert.match(focusBranch, /blog-focus-title/);
    assert.match(focusBranch, /blog-focus-summary/);
    assert.match(focusBranch, /<BlogVisualEditor[\s\S]{0,160}focusMode/);
    assert.match(focusBranch, /blog-focus-save/);
    // Chrome that must not survive focus mode.
    assert.doesNotMatch(focusBranch, /BlogReadinessSidebar/);
    assert.doesNotMatch(focusBranch, /BlogSeoPanel/);
    assert.doesNotMatch(focusBranch, /BlogWorkspaceTabs/);
    assert.doesNotMatch(focusBranch, /blog-workspace-sidebar/);
  });

  it("3. focus mode hides the editor's own quick insert and block assistant", () => {
    assert.match(VISUAL_EDITOR, /\{!focusMode && \(\s*<div className="admin-visual-mode-toolbar">/);
    assert.match(VISUAL_EDITOR, /\{!focusMode && \(\s*<BlogBlockAssistant/);
  });

  it("4. focus mode hides the admin shell chrome and exits on Esc", () => {
    assert.match(SHELL_CSS, /body\[data-editor-focus="on"\]\) \.sidebar/);
    assert.match(SHELL_CSS, /body\[data-editor-focus="on"\]\) \.header/);
    assert.match(FOCUS_HOOK, /document\.body\.dataset\[BODY_FLAG\] = "on"/);
    assert.match(FOCUS_HOOK, /event\.key === "Escape"/);
    assert.match(FOCUS_HOOK, /delete document\.body\.dataset\[BODY_FLAG\]/);
  });

  it("5. collapses the right sidebar into one card with a Details disclosure", () => {
    assert.match(SIDEBAR, /blog-status-card/);
    assert.match(SIDEBAR, /readiness\.statusLabel/);
    assert.match(SIDEBAR, /SEO \{readiness\.quality\.score\}/);
    assert.match(SIDEBAR, /Warnings \(\$\{readiness\.warnings\.length\}\)/);
    assert.match(SIDEBAR, /Details/);
    assert.match(SIDEBAR, /aria-expanded=\{showDetails\}/);
    assert.match(SIDEBAR, /\{showDetails && \(/);
  });

  it("6. supports collapsible sections that remember their state", () => {
    assert.match(TABS, /usePersistentDisclosure/);
    assert.match(TABS, /aria-expanded=\{open\}/);
    assert.match(TABS, /blog-workspace-section__summary/);
    const disclosure = read("src/components/admin/blog-editor/usePersistentDisclosure.ts");
    assert.match(disclosure, /readBoolPref/);
    assert.match(disclosure, /writeBoolPref/);
  });

  it("7. collapses FAQ, Images, Tags, Categories and Advanced SEO by default", () => {
    for (const key of ["faq", "images", "tags", "categories", "advanced-seo"]) {
      assert.match(
        EDITOR,
        new RegExp(`storageKey="${key}"\\s*\\n\\s*defaultOpen=\\{false\\}`),
        `section ${key} should collapse by default`,
      );
    }
  });

  it("8. shows persistent save status instead of a toast", () => {
    assert.match(SAVE_STATUS, /Saving…/);
    assert.match(SAVE_STATUS, /blog-save-status--ok[\s\S]{0,120}\bSaved\b/);
    assert.match(SAVE_STATUS, /Updated \{relativeTime/);
    assert.match(EDITOR, /<BlogSaveStatus/);
    assert.match(EDITOR, /setSaveState\("saving"\)/);
    assert.match(EDITOR, /setSaveState\("saved"\)/);
    assert.match(EDITOR, /setSaveState\("error"\)/);
    // No save toast/banner left behind.
    assert.doesNotMatch(EDITOR, /admin-message admin-message--\$\{message\.type\}/);
    assert.doesNotMatch(EDITOR, /Đã lưu bài viết/);
  });

  it("9. computes relative time only after mount so SSR matches the client", () => {
    assert.match(SAVE_STATUS, /useState<number \| null>\(null\)/);
    assert.match(SAVE_STATUS, /now !== null/);
  });

  it("10. switches preview between desktop, tablet and mobile on one renderer", () => {
    assert.match(PREVIEW, /id: "desktop"/);
    assert.match(PREVIEW, /id: "tablet"/);
    assert.match(PREVIEW, /id: "mobile"/);
    assert.match(PREVIEW, /renderBlogPreviewFromMarkdown/);
    assert.match(PREVIEW, /prose-blog prose-blog--article/);
    // Exactly one render call: device switching only changes the width.
    assert.equal(PREVIEW.match(/renderBlogPreviewFromMarkdown\(/g)?.length, 1);
  });

  it("11. memoizes the preview so typing elsewhere does not re-render it", () => {
    assert.match(PREVIEW, /export default memo\(BlogEditorPreview\)/);
    assert.match(PREVIEW, /useMemo\(\(\) => renderBlogPreviewFromMarkdown\(markdown\), \[markdown\]\)/);
    assert.match(EDITOR, /const handleContentChange = useCallback/);
  });

  it("12. ships every requested slash command", () => {
    const labels = EDITOR_COMMANDS.map((command) => command.label);
    for (const expected of [
      "Heading",
      "Paragraph",
      "Image",
      "Gallery",
      "CTA",
      "FAQ",
      "Table",
      "Quote",
      "Divider",
      "Callout",
      "List",
      "Button",
      "Video",
      "Code",
    ]) {
      assert.ok(labels.includes(expected), `missing slash command ${expected}`);
    }
  });

  it("13. searches slash commands by label, hint and folded keyword", () => {
    assert.deepEqual(
      filterEditorCommands("gallery").map((item) => item.id),
      ["gallery"],
    );
    assert.deepEqual(
      filterEditorCommands("bang").map((item) => item.id),
      ["table"],
    );
    assert.deepEqual(
      filterEditorCommands("tieu de").map((item) => item.id),
      ["heading", "subheading"],
    );
    assert.equal(filterEditorCommands("").length, EDITOR_COMMANDS.length);
    assert.deepEqual(filterEditorCommands("zzz"), []);
  });

  it("14. drives the slash menu with the keyboard and keeps Quick Insert", () => {
    assert.match(VISUAL_EDITOR, /event\.key === "ArrowDown"/);
    assert.match(VISUAL_EDITOR, /event\.key === "ArrowUp"/);
    assert.match(VISUAL_EDITOR, /<BlogQuickInsert onInsert=\{insertSnippet\} compact \/>/);
    assert.match(SLASH_MENU, /role="listbox"/);
    assert.match(SLASH_MENU, /aria-selected=\{active\}/);
  });

  it("15. keeps Shift+Enter as a soft line break", () => {
    assert.match(VISUAL_EDITOR, /event\.key === "Enter" && !event\.shiftKey && !slashOpen/);
  });

  it("16. every slash command renders through the existing pipeline", () => {
    for (const command of EDITOR_COMMANDS) {
      const html = renderBlogPreviewFromMarkdown(command.snippet);
      assert.ok(html.trim().length > 0, `${command.id} rendered nothing`);
      assert.doesNotMatch(html, /:::/, `${command.id} leaked a block directive`);
      assert.doesNotMatch(html, /^\s*#{1,6}\s/m, `${command.id} leaked markdown heading syntax`);
    }
  });

  it("17. gallery, callout and video keep their markup and have styles", () => {
    const gallery = renderBlogPreviewFromMarkdown(
      EDITOR_COMMANDS.find((item) => item.id === "gallery")!.snippet,
    );
    assert.match(gallery, /class="blog-gallery"/);
    assert.match(gallery, /<img/);

    const callout = renderBlogPreviewFromMarkdown(
      EDITOR_COMMANDS.find((item) => item.id === "callout")!.snippet,
    );
    assert.match(callout, /class="blog-callout"/);

    for (const selector of [
      /\.prose-blog \.blog-callout/,
      /\.prose-blog \.blog-gallery/,
      /\.prose-blog \.blog-video/,
    ]) {
      assert.match(GLOBAL_CSS, selector);
    }
  });

  it("18. keeps the CTA snippet rendering as the public CTA block", () => {
    const cta = renderBlogPreviewFromMarkdown(
      EDITOR_COMMANDS.find((item) => item.id === "cta")!.snippet,
    );
    assert.match(cta, /class="blog-cta-block"/);
    assert.match(cta, /blog-cta-block__button/);
  });

  it("19. gives the Block Assistant search, pinned and recent groups", () => {
    assert.match(BLOCK_ASSISTANT, /Tìm khối theo tiêu đề hoặc nội dung/);
    assert.match(BLOCK_ASSISTANT, />Pinned</);
    assert.match(BLOCK_ASSISTANT, />Recent</);
    assert.match(BLOCK_ASSISTANT, /admin-block-assistant-pin/);
    assert.match(BLOCK_ASSISTANT, /aria-expanded=\{open\}/);
    // The block model itself is untouched.
    assert.match(BLOCK_ASSISTANT, /type \{ ContentBlock \}/);
  });

  it("20. remembers pinned and recent blocks without duplicates", () => {
    assert.deepEqual(pushRecent(["a", "b"], "b"), ["b", "a"]);
    assert.deepEqual(pushRecent(["a", "b", "c", "d", "e"], "f"), ["f", "a", "b", "c", "d"]);
    assert.deepEqual(toggleInList(["a"], "a"), []);
    assert.deepEqual(toggleInList([], "a"), ["a"]);
    // No window in Node: preferences degrade to empty instead of throwing.
    assert.deepEqual(readListPref(EDITOR_PREF_KEYS.pinnedBlocks), []);
    assert.doesNotThrow(() => writeListPref(EDITOR_PREF_KEYS.pinnedBlocks, ["a"]));
  });

  it("21. renames the image hierarchy to Cover / In-content / Advanced", () => {
    assert.match(EDITOR, /Cover Image/);
    assert.match(EDITOR, /In-content Images/);
    assert.match(EDITOR, /<summary>Advanced<\/summary>/);
    assert.doesNotMatch(EDITOR, /Featured Image/);
    assert.doesNotMatch(EDITOR, /Body Images/);
  });

  it("22. collapses FAQ cards and supports reordering", () => {
    assert.match(FAQ_BUILDER, /draggable/);
    assert.match(FAQ_BUILDER, /onDrop=/);
    assert.match(FAQ_BUILDER, /aria-expanded=\{expanded === index\}/);
    assert.match(FAQ_BUILDER, /Chuyển câu hỏi \$\{index \+ 1\} lên/);
    assert.match(FAQ_BUILDER, /Chuyển câu hỏi \$\{index \+ 1\} xuống/);
  });

  it("23. collapses tags behind a count with search", () => {
    assert.match(TAG_INPUT, /\{tags\.length\} Tags/);
    assert.match(TAG_INPUT, /Tìm tag/);
    assert.match(TAG_INPUT, /COLLAPSE_THRESHOLD/);
  });

  it("24. replaces the category checkbox wall with a searchable tree", () => {
    assert.match(EDITOR, /<BlogCategorySelector/);
    assert.doesNotMatch(EDITOR, /admin-checkbox-list/);
    assert.match(CATEGORY_SELECTOR, /Tìm danh mục/);
    assert.match(CATEGORY_SELECTOR, /admin-category-tree--child/);
    assert.match(CATEGORY_SELECTOR, /buildTree/);
  });

  it("25. shows a live CTA preview instead of a CTA boolean", () => {
    assert.match(CTA_PREVIEW, /renderBlogPreviewFromMarkdown/);
    assert.match(CTA_PREVIEW, /prose-blog prose-blog--article/);
    assert.match(CTA_PREVIEW, /CTA Missing/);
    assert.match(SIDEBAR, /<BlogCtaPreview/);
  });

  it("26. binds Cmd+S, Cmd+/ and Esc", () => {
    assert.match(SHORTCUTS, /event\.key\.toLowerCase\(\) === "s"/);
    assert.match(SHORTCUTS, /mod && event\.key === "\/"/);
    assert.match(SHORTCUTS, /event\.key === "Escape"/);
    assert.match(SHORTCUTS, /event\.metaKey \|\| event\.ctrlKey/);
    assert.match(EDITOR, /useEditorShortcuts/);
    assert.match(PALETTE, /aria-modal="true"/);
  });

  it("27. keeps animations subtle and honours reduced motion", () => {
    assert.match(GLOBAL_CSS, /@keyframes blog-panel-fade/);
    assert.match(GLOBAL_CSS, /@media \(prefers-reduced-motion: reduce\)[\s\S]{0,600}animation: none/);
  });

  it("28. adds no extra readiness request or duplicate evaluation", () => {
    // One hook owns the fetch; panels receive its result as props.
    assert.equal(EDITOR.match(/useBlogReadiness\(/g)?.length, 1);
    assert.doesNotMatch(SIDEBAR, /fetch\(/);
    assert.doesNotMatch(PREVIEW, /fetch\(/);
    // The editor fetches categories and posts only; readiness stays in the hook.
    assert.doesNotMatch(EDITOR, /fetch\([^)]*publish-readiness/);
    assert.deepEqual(
      [...EDITOR.matchAll(/fetch\(\s*[`"]([^`"]+)/g)].map((match) => match[1]),
      ["/api/blog/categories"],
    );
    const hook = read("src/components/admin/blog-editor/useBlogReadiness.ts");
    assert.equal(hook.match(/await fetch\(|fetch\(`/g)?.length, 1);
  });

  it("29. preserves the full editor feature set after the polish pass", () => {
    for (const marker of [
      "AiContentFactory",
      "BlogClusterGenerator",
      "BlogMediaWorkspace",
      "BlogFaqBuilder",
      "BlogTagInput",
      "BlogVisualEditor",
      "BlogSeoPanel",
      "BlogAiRecommendationsPanel",
      "BlogAiReadinessPanel",
      "BlogPublishPanel",
      "BlogTraceabilityTimeline",
      "MediaPicker",
    ]) {
      assert.match(EDITOR, new RegExp(`<${marker}`), `lost ${marker}`);
    }
    assert.match(EDITOR, /BLOG_POST_STATUSES/);
    assert.match(EDITOR, /Tạo bài demo/);
    assert.match(EDITOR, /Sao chép URL/);
    assert.match(EDITOR, /canonicalUrl/);
  });

  it("30. does not change publish, review or handoff semantics", () => {
    // Save still posts the same payload to the same endpoints.
    assert.match(EDITOR, /`\/api\/blog\/posts\/\$\{initial!\.id\}` : "\/api\/blog\/posts"/);
    assert.match(EDITOR, /isEdit \? "PATCH" : "POST"/);
    assert.match(EDITOR, /nextStatus === "PUBLISHED" && readiness\.warnings\.length > 0/);
    const publishPanel = read("src/components/admin/blog-editor/BlogPublishPanel.tsx");
    assert.match(publishPanel, /readiness\.status !== "READY"/);
  });
});

/**
 * Sprint 14.1 one-off repair.
 *
 * A pre-13.6 handoff sanitizer deleted every `</a>` while keeping the opening
 * tag, so published bodies hold unbalanced anchors. The renderer now closes
 * them defensively at the block boundary, but that makes the whole remaining
 * sentence a link. This script restores the intended anchor text using the
 * approved draft source as the hint set, then rewrites only `content`.
 *
 * Dry run by default. Pass --apply to write. Never touches `status`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { repairAnchors } from "@/features/blog/article-normalize";

const APPLY = process.argv.includes("--apply");
const SLUG = process.argv.find((arg) => arg.startsWith("--slug="))?.slice(7)
  ?? "huong-dan-chon-ao-polo-dong-phuc-cong-ty";

/** Recover href -> intended anchor text from the approved draft source. */
function loadAnchorHints(): Map<string, string[]> {
  const source = readFileSync(
    join(process.cwd(), "src/features/content/launch/first-article-draft.content.ts"),
    "utf8",
  );
  const hints = new Map<string, string[]>();
  for (const match of source.matchAll(/<a\s+href="([^"]+)"\s*>([\s\S]*?)<\/a>/g)) {
    const [, href, text] = match;
    const list = hints.get(href) ?? [];
    if (!list.includes(text)) list.push(text);
    hints.set(href, list);
  }
  return hints;
}

function balance(html: string): string {
  const open = html.match(/<a\b/gi)?.length ?? 0;
  const close = html.match(/<\/a>/gi)?.length ?? 0;
  return `<a=${open} </a>=${close}`;
}

async function main() {
  const hints = loadAnchorHints();
  console.log("anchor hints recovered:", hints.size);
  for (const [href, texts] of hints) console.log(`  ${href} -> ${texts.join(" | ")}`);

  const post = await prisma.blogPost.findUnique({
    where: { slug: SLUG },
    select: { id: true, status: true, content: true },
  });
  if (!post?.content) {
    console.log("post or content not found");
    return;
  }

  const before = post.content;
  console.log(`\nstored  ${balance(before)}  len=${before.length}`);

  const repaired = repairAnchors(before, hints);
  console.log(`repaired ${balance(repaired.html)}  len=${repaired.html.length}`);
  console.log(`closed=${repaired.closed} unnested=${repaired.unnested} dropped=${repaired.dropped}`);

  console.log("\n--- resulting anchors ---");
  for (const match of repaired.html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)) {
    console.log("  " + match[0].slice(0, 180));
  }

  const openCount = repaired.html.match(/<a\b/gi)?.length ?? 0;
  const closeCount = repaired.html.match(/<\/a>/gi)?.length ?? 0;
  if (openCount !== closeCount) {
    console.log("\nREFUSING TO WRITE: anchors still unbalanced");
    return;
  }

  // The repair may only insert `</a>`; it must never drop prose.
  const textBefore = before.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const textAfter = repaired.html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  if (textBefore !== textAfter) {
    console.log("\nREFUSING TO WRITE: visible text changed");
    console.log("before len", textBefore.length, "after len", textAfter.length);
    return;
  }
  console.log("\nvisible text unchanged: ok");

  if (!APPLY) {
    console.log("\nDRY RUN — pass --apply to persist");
    return;
  }

  await prisma.blogPost.update({
    where: { id: post.id },
    data: { content: repaired.html },
  });
  console.log(`\napplied to ${post.id}; status left as ${post.status}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

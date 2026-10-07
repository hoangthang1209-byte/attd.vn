import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { prisma } from "@/lib/prisma";
import { tryLockDueBlogPost } from "./scheduled-publish-lock";
import { createBlogPost, updateBlogPost } from "@/features/blog/services/blog-admin.service";

const now = new Date();
const id = `seo-lock-${randomUUID()}`;

function barrier() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => { release = resolve; });
  return { promise, release };
}

before(async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(process.env.CI === "true" && ["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname === "/attd_ci",
    "Database tests require the isolated attd_ci database on CI localhost");
  await prisma.blogPost.create({ data: {
    id, slug: id, title: "SEO locking test", status: "SCHEDULED",
    scheduledAt: new Date(now.getTime() - 1000),
  } });
});

after(async () => {
  // Never clean up an unverified database if the before hook failed.
  const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
  if (process.env.CI === "true" && ["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname === "/attd_ci") {
    await prisma.blogPost.deleteMany({ where: { id } });
    await prisma.$disconnect();
  }
});

test("overlapping workers cannot both claim a due post; stale candidates cannot publish twice", { timeout: 15_000 }, async () => {
  const locked = barrier();
  const finish = barrier();
  const first = prisma.$transaction(async (tx) => {
    assert.equal(await tryLockDueBlogPost(tx, id, now), true);
    locked.release();
    await finish.promise;
    await tx.blogPost.update({ where: { id }, data: { status: "PUBLISHED", publishVersion: { increment: 1 } } });
  }, { timeout: 10_000 });
  // Unblock the test if the first transaction fails before acquiring its lock.
  void first.then(locked.release, locked.release);
  try {
    await locked.promise;
    assert.equal(await prisma.$transaction((tx) => tryLockDueBlogPost(tx, id, now)), false);
  } finally {
    finish.release();
    await first;
  }
  assert.equal(await prisma.$transaction((tx) => tryLockDueBlogPost(tx, id, now)), false);
  assert.equal((await prisma.blogPost.findUniqueOrThrow({ where: { id } })).publishVersion, 1);
});

test("a rolled-back publish releases its lock and leaves the post retryable", async () => {
  await prisma.blogPost.update({ where: { id }, data: { status: "SCHEDULED", scheduledAt: new Date(now.getTime() - 1000) } });
  await assert.rejects(prisma.$transaction(async (tx) => {
    assert.equal(await tryLockDueBlogPost(tx, id, now), true);
    await tx.blogPost.update({ where: { id }, data: { status: "PUBLISHED" } });
    throw new Error("simulated worker failure");
  }), /simulated worker failure/);
  assert.equal((await prisma.blogPost.findUniqueOrThrow({ where: { id } })).status, "SCHEDULED");
  assert.equal(await prisma.$transaction((tx) => tryLockDueBlogPost(tx, id, now)), true);
});

test("future schedules are not claimable", async () => {
  await prisma.blogPost.update({ where: { id }, data: { scheduledAt: new Date(now.getTime() + 60_000) } });
  assert.equal(await prisma.$transaction((tx) => tryLockDueBlogPost(tx, id, now)), false);
});

test("direct admin creation and published edits cannot bypass editorial blockers", async () => {
  await assert.rejects(createBlogPost({
    title: "Incomplete public article", slug: `${id}-invalid`, status: "PUBLISHED",
    content: "Kết luận — bổ sung chi tiết khi review.",
  }), /chưa hoàn thiện/);
  assert.equal(await prisma.blogPost.count({ where: { slug: `${id}-invalid` } }), 0);
  await prisma.blogPost.update({ where: { id }, data: { status: "PUBLISHED", content: "Nội dung đã hoàn thiện." } });
  await assert.rejects(updateBlogPost(id, { content: "[TODO]" }), /chưa hoàn thiện/);
  const row = await prisma.blogPost.findUniqueOrThrow({ where: { id } });
  assert.equal(row.content, "Nội dung đã hoàn thiện.");
  assert.equal(row.status, "PUBLISHED");
});

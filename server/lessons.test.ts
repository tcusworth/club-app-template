import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { courses, courseEnrollments, lessons, lessonProgress, users } from "../drizzle/schema";
import { eq, like, inArray } from "drizzle-orm";

const TEST_PREFIX = "test-lessons-";

let testCourseId: number;
let testUserId: number;
let testUser2Id: number;
let userCaller: ReturnType<typeof appRouter.createCaller>;
let user2Caller: ReturnType<typeof appRouter.createCaller>;
let adminCaller: ReturnType<typeof appRouter.createCaller>;
let publicCaller: ReturnType<typeof appRouter.createCaller>;

function makeUserCtx(user: { id: number; openId: string; role: "user" | "admin" }): TrpcContext {
  return {
    user: {
      id: user.id,
      openId: user.openId,
      name: "Test",
      email: `${user.openId}@test.local`,
      role: user.role,
      platformRole: "automation_engineer",
      loginMethod: "local",
      createdAt: new Date(),
      onboarded: true,
    },
  } as any;
}

async function cleanup() {
  const db = await getDb();
  if (!db) return;
  // Delete in dependency order
  const courseIds = (await db.select({ id: courses.id }).from(courses).where(like(courses.slug, `${TEST_PREFIX}%`))).map(r => r.id);
  if (courseIds.length > 0) {
    const lessonIds = (await db.select({ id: lessons.id }).from(lessons).where(inArray(lessons.courseId, courseIds))).map(r => r.id);
    if (lessonIds.length > 0) {
      await db.delete(lessonProgress).where(inArray(lessonProgress.lessonId, lessonIds));
      await db.delete(lessons).where(inArray(lessons.id, lessonIds));
    }
    await db.delete(courseEnrollments).where(inArray(courseEnrollments.courseId, courseIds));
    await db.delete(courses).where(inArray(courses.id, courseIds));
  }
  await db.delete(users).where(like(users.openId, `${TEST_PREFIX}%`));
}

describe("Lessons API", () => {
  beforeAll(async () => {
    await cleanup();
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const courseInsert = await db.insert(courses).values({
      title: "Test Lessons Course",
      slug: `${TEST_PREFIX}course-${Date.now()}`,
      authorId: 1,
      status: "published",
    });
    testCourseId = Number((courseInsert as any)[0]?.insertId ?? (courseInsert as any).insertId);

    const userInsert = await db.insert(users).values({
      openId: `${TEST_PREFIX}u1-${Date.now()}`,
      name: "Test User 1",
      email: `${TEST_PREFIX}u1-${Date.now()}@test.local`,
      role: "user",
    });
    testUserId = Number((userInsert as any)[0]?.insertId ?? (userInsert as any).insertId);

    const user2Insert = await db.insert(users).values({
      openId: `${TEST_PREFIX}u2-${Date.now()}`,
      name: "Test User 2",
      email: `${TEST_PREFIX}u2-${Date.now()}@test.local`,
      role: "user",
    });
    testUser2Id = Number((user2Insert as any)[0]?.insertId ?? (user2Insert as any).insertId);

    await db.insert(courseEnrollments).values({ courseId: testCourseId, userId: testUserId });

    userCaller = appRouter.createCaller(makeUserCtx({ id: testUserId, openId: `${TEST_PREFIX}u1`, role: "user" }));
    user2Caller = appRouter.createCaller(makeUserCtx({ id: testUser2Id, openId: `${TEST_PREFIX}u2`, role: "user" }));
    adminCaller = appRouter.createCaller(makeUserCtx({ id: testUserId, openId: `${TEST_PREFIX}u1`, role: "admin" }));
    publicCaller = appRouter.createCaller({ user: null } as any);
  });

  afterAll(async () => {
    await cleanup();
  });

  it("admin can create lessons; createLesson sets sequential displayOrder", async () => {
    const a = await adminCaller.lessonsAdmin.create({ courseId: testCourseId, title: "L1", slug: `${TEST_PREFIX}l1` });
    const b = await adminCaller.lessonsAdmin.create({ courseId: testCourseId, title: "L2", slug: `${TEST_PREFIX}l2` });
    const all = await adminCaller.lessonsAdmin.list({ courseId: testCourseId });
    const lA = all.find(l => l.id === a.id)!;
    const lB = all.find(l => l.id === b.id)!;
    expect(lA.displayOrder).toBe(0);
    expect(lB.displayOrder).toBe(1);
  });

  it("creating a lesson with a duplicate slug rejects", async () => {
    await expect(
      adminCaller.lessonsAdmin.create({ courseId: testCourseId, title: "Dup", slug: `${TEST_PREFIX}l1` }),
    ).rejects.toThrow();
  });

  it("listByCourse returns only published lessons", async () => {
    const all = await adminCaller.lessonsAdmin.list({ courseId: testCourseId });
    const first = all[0];
    await adminCaller.lessonsAdmin.publish({ lessonId: first.id });
    const published = await publicCaller.lessons.listByCourse({ courseId: testCourseId });
    expect(published.length).toBe(1);
    expect(published[0].id).toBe(first.id);
  });

  it("upsertLessonProgress does not decrease watchedSeconds", async () => {
    const all = await adminCaller.lessonsAdmin.list({ courseId: testCourseId });
    const lessonId = all[0].id;
    await userCaller.lessons.updateProgress({ lessonId, watchedSeconds: 120 });
    await userCaller.lessons.updateProgress({ lessonId, watchedSeconds: 30 });
    const progress = await userCaller.lessons.getProgress({ courseId: testCourseId });
    const row = progress.find(p => p.lessonId === lessonId)!;
    expect(row.watchedSeconds).toBe(120);
  });

  it("markComplete is idempotent", async () => {
    const all = await adminCaller.lessonsAdmin.list({ courseId: testCourseId });
    const lessonId = all[0].id;
    await userCaller.lessons.markComplete({ lessonId });
    const db = await getDb();
    const row1 = await db!.select().from(lessonProgress)
      .where(eq(lessonProgress.userId, testUserId)).limit(1);
    const firstCompletedAt = row1[0].completedAt;
    expect(firstCompletedAt).toBeTruthy();
    await new Promise(r => setTimeout(r, 1100));
    await userCaller.lessons.markComplete({ lessonId });
    const row2 = await db!.select().from(lessonProgress)
      .where(eq(lessonProgress.userId, testUserId)).limit(1);
    expect(row2[0].completedAt?.getTime()).toBe(firstCompletedAt?.getTime());
  });

  it("recalcCourseProgress reflects completion ratio across published lessons", async () => {
    const all = await adminCaller.lessonsAdmin.list({ courseId: testCourseId });
    // Publish both lessons so total = 2
    for (const l of all) await adminCaller.lessonsAdmin.publish({ lessonId: l.id });

    // user2 enrolls and completes 1 of 2 → expect 50%
    const db = await getDb();
    await db!.insert(courseEnrollments).values({ courseId: testCourseId, userId: testUser2Id });
    await user2Caller.lessons.markComplete({ lessonId: all[0].id });
    const enr1 = await db!.select().from(courseEnrollments)
      .where(eq(courseEnrollments.userId, testUser2Id)).limit(1);
    expect(enr1[0].progress).toBe(50);
    expect(enr1[0].completedAt).toBeNull();

    // Complete the second → expect 100% and completedAt set.
    // Under the per-lesson quiz model, each lesson is marked complete only
    // after its quiz passes, so all-lessons-complete = course-complete.
    await user2Caller.lessons.markComplete({ lessonId: all[1].id });
    const enr2 = await db!.select().from(courseEnrollments)
      .where(eq(courseEnrollments.userId, testUser2Id)).limit(1);
    expect(enr2[0].progress).toBe(100);
    expect(enr2[0].completedAt).toBeTruthy();
  });

  it("public lessons.get returns null for an unknown slug pair", async () => {
    const result = await publicCaller.lessons.get({ courseSlug: "no-such-course-xyz", lessonSlug: "no-such-lesson" });
    expect(result).toBeNull();
  });
});

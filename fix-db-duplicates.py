import re

with open("server/db.ts", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Rename old isFollowing (member follow) to isMemberFollowing to avoid conflict
content = content.replace(
    "export async function isFollowing(followerId: number, followingId: number) {",
    "export async function isMemberFollowing(followerId: number, followingId: number) {"
)

# 2. Remove the duplicate new isFollowing (polymorphic) that was appended - we'll keep the old one renamed
# Find and remove the duplicate block starting at the new isFollowing
dup_isFollowing_start = "export async function isFollowing(userId: number, targetType: string, targetId: number) {"
dup_isFollowing_end = "  return rows.length > 0;\n}\n\nexport async function getUserFollows"
idx = content.find(dup_isFollowing_start)
if idx != -1:
    end_idx = content.find("}\n\nexport async function getUserFollows", idx)
    if end_idx != -1:
        content = content[:idx] + content[end_idx + 2:]  # remove the function

# 3. Remove the duplicate listCourses (new version at line ~1913)
dup_listCourses = "export async function listCourses(filters?: { level?: string; status?: string }) {"
idx = content.find(dup_listCourses)
if idx != -1:
    end_idx = content.find("\n}\n\nexport async function getCourseById", idx)
    if end_idx != -1:
        content = content[:idx] + content[end_idx + 3:]

# 4. Remove the duplicate enrollInCourse (new version)
dup_enroll = "export async function enrollInCourse(userId: number, courseId: number) {"
idx = content.find(dup_enroll)
if idx != -1:
    end_idx = content.find("\n}\n\nexport async function updateCourseProgress(userId", idx)
    if end_idx != -1:
        content = content[:idx] + content[end_idx + 3:]

# 5. Remove the duplicate updateCourseProgress (new version)
dup_progress = "export async function updateCourseProgress(userId: number, courseId: number, progressPercent: number) {"
idx = content.find(dup_progress)
if idx != -1:
    end_idx = content.find("\n}\n\nexport async function getUserEnrollments(userId: number) {\n  const db = await getDb();\n  if (!db) return [];\n  return db.select({\n    id: courseEnrollments.id,", idx)
    if end_idx != -1:
        content = content[:idx] + content[end_idx + 3:]

# 6. Remove the duplicate getUserEnrollments (new version)
dup_enrollments = "export async function getUserEnrollments(userId: number) {\n  const db = await getDb();\n  if (!db) return [];\n  return db.select({\n    id: courseEnrollments.id,"
idx = content.find(dup_enrollments)
if idx != -1:
    end_idx = content.find("\n}\n\nexport async function seedOPACourses", idx)
    if end_idx != -1:
        content = content[:idx] + content[end_idx + 3:]

# 7. Fix grantBadge -> awardBadge calls
content = content.replace("await grantBadge(req.userId, \"expert\")", "await awardBadge(req.userId, \"expert\", \"Verified Expert\", \"Verified OPA expert practitioner\")")
content = content.replace("await grantBadge(userId, \"active_member\")", "await awardBadge(userId, \"active_member\", \"Course Completer\", \"Completed an OPA learning course\")")

# 8. Fix adjustReputation calls with 3 args -> 2 args
content = content.replace("await adjustReputation(post.authorId, 15, \"accepted_answer\")", "await adjustReputation(post.authorId, 15)")
content = content.replace("await adjustReputation(userId, 25, \"course_completed\")", "await adjustReputation(userId, 25)")

# 9. Fix the new enrollInCourse to use correct field names (progress not progressPercent, enrolledAt not startedAt)
# The new enrollInCourse we appended uses 'status' and 'progressPercent' which don't exist
# Replace the new enrollInCourse body with correct field names
old_enroll_body = """export async function enrollInCourse(userId: number, courseId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await db.select().from(courseEnrollments)
    .where(and(eq(courseEnrollments.userId, userId), eq(courseEnrollments.courseId, courseId)));
  if (existing.length > 0) return existing[0];
  await db.insert(courseEnrollments).values({ userId, courseId, status: "enrolled", progressPercent: 0 });
  await db.update(courses).set({ enrollmentCount: sql`${courses.enrollmentCount} + 1` }).where(eq(courses.id, courseId));
  return { userId, courseId, status: "enrolled", progressPercent: 0 };
}"""
# This was already removed above, so skip

# 10. Fix the new updateCourseProgress to use correct field names
old_progress_body = """export async function updateCourseProgress(userId: number, courseId: number, progressPercent: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const status = progressPercent >= 100 ? "completed" : "enrolled";
  await db.update(courseEnrollments).set({
    progressPercent,
    status: status as any,
    ...(progressPercent >= 100 ? { completedAt: new Date() } : {}),
  }).where(and(eq(courseEnrollments.userId, userId), eq(courseEnrollments.courseId, courseId)));
  if (progressPercent >= 100) {
    await awardBadge(userId, "active_member", "Course Completer", "Completed an OPA learning course");
    await adjustReputation(userId, 25);
    await logAuditEvent(userId, "course_completed", "course", courseId, {});
  }
}"""
# Already removed, skip

# 11. Fix the new getUserEnrollments to use correct field names (no status, progressPercent, startedAt)
old_enrollments_body = """export async function getUserEnrollments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: courseEnrollments.id,
    courseId: courseEnrollments.courseId,
    courseTitle: courses.title,
    courseSlug: courses.slug,
    level: courses.level,
    duration: courses.duration,
    status: courseEnrollments.status,
    progressPercent: courseEnrollments.progressPercent,
    startedAt: courseEnrollments.startedAt,
    completedAt: courseEnrollments.completedAt,
  }).from(courseEnrollments)
    .leftJoin(courses, eq(courseEnrollments.courseId, courses.id))
    .where(eq(courseEnrollments.userId, userId))
    .orderBy(desc(courseEnrollments.startedAt));
}"""
# Already removed, skip

with open("server/db.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Done. Checking for remaining duplicates:")
lines = content.split("\n")
for i, line in enumerate(lines):
    if "export async function isFollowing\|export async function listCourses\|export async function enrollInCourse\|export async function updateCourseProgress\|export async function getUserEnrollments" in line:
        print(f"  Line {i+1}: {line}")

import subprocess
result = subprocess.run(["grep", "-n", "export async function isFollowing\|export async function listCourses\|export async function enrollInCourse\|export async function updateCourseProgress\|export async function getUserEnrollments", "server/db.ts"], capture_output=True, text=True)
print(result.stdout)

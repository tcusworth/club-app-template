import { TRPCError } from "@trpc/server";

export function isAdmin(user: { role?: string } | null | undefined): boolean {
  return user?.role === "admin";
}

export function assertOwnerOrAdmin(
  resourceUserId: number | null | undefined,
  actor: { id: number; role: string },
): void {
  if (resourceUserId == null) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  if (resourceUserId !== actor.id && actor.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
  }
}

export function canViewUnpublished(
  authorId: number,
  status: string,
  user: { id: number; role: string } | null | undefined,
): boolean {
  if (status === "published" || status === "approved" || status === "featured") return true;
  if (!user) return false;
  return user.id === authorId || user.role === "admin";
}

/** Members may only create drafts; publishing is admin or submit-for-review. */
export function resolveContentCreateStatus(
  role: string,
  requested?: "draft" | "pending_review" | "published" | "rejected" | "archived",
): "draft" | "pending_review" | "published" | "rejected" | "archived" {
  if (role === "admin") return requested ?? "draft";
  return "draft";
}

export function resolveBlogCreateStatus(
  role: string,
  requested?: "draft" | "published",
): "draft" | "published" {
  if (role === "admin") return requested ?? "draft";
  return "draft";
}

/** Strip publish/reject/archive from member updates; allow draft only. */
export function resolveContentUpdateStatus(
  role: string,
  requested?: "draft" | "pending_review" | "published" | "rejected" | "archived",
): "draft" | "pending_review" | "published" | "rejected" | "archived" | undefined {
  if (requested == null) return undefined;
  if (role === "admin") return requested;
  if (requested === "draft") return "draft";
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Only admins can change content publication status",
  });
}

export function resolveBlogUpdateStatus(
  role: string,
  requested?: "draft" | "published",
): "draft" | "published" | undefined {
  if (requested == null) return undefined;
  if (role === "admin") return requested;
  if (requested === "draft") return "draft";
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Only admins can publish blog posts",
  });
}

export function toPlayerQuiz<T extends { questions: Array<Record<string, unknown> & { correctIndex?: number; explanation?: unknown }> }>(
  quiz: T | null,
  admin: boolean,
): Omit<T, "questions"> & { questions: Array<Omit<T["questions"][number], "correctIndex" | "explanation">> } | T | null {
  if (!quiz) return null;
  if (admin) return quiz;
  return {
    ...quiz,
    questions: quiz.questions.map(({ correctIndex: _c, explanation: _e, ...rest }) => rest),
  };
}
